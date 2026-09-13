"use client";

import { useState, useMemo, useRef } from "react";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";
import { enregistrerImages } from "./actions";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Une photo d'ambiance montre le produit en situation : la rogner
// couperait le décor qui fait tout son intérêt. On les reconnaît à leur
// nom de fichier, les catalogues fournisseurs les préfixant ainsi.
const MOTS_AMBIANCE = ["amb_", "amb-", "ambiance", "_amb", "bodegon", "zoom"];

const estAmbiance = (url) => {
  const nom = decodeURIComponent(url || "").toLowerCase();
  return MOTS_AMBIANCE.some((m) => nom.includes(m));
};

// Une image déjà recadrée porte la marque du traitement dans son nom.
const dejaRecadree = (url) => decodeURIComponent(url || "").toLowerCase().includes("_cadre");

// Marge conservée autour du produit, en proportion de sa plus grande
// dimension. Sans elle, le meuble toucherait les bords du cadre.
const MARGE = 0.04;

// Un pixel dont les trois composantes dépassent ce seuil est considéré
// comme du fond. Les captures pCon ont un fond blanc légèrement dégradé,
// d'où une valeur en dessous de 255.
const SEUIL_FOND = 244;

// Rogne les marges uniformes autour du produit.
//
// Les captures du configurateur laissent beaucoup de blanc autour du
// meuble : sans rognage, il occupe moins de la moitié de son cadre et
// paraît minuscule sur la fiche.
//
// On balaie l'image pour trouver le premier et le dernier pixel qui ne
// soit ni blanc ni transparent sur chaque axe, puis on recadre dessus.
// Le fond d'origine est conservé — pas de détourage, donc pas de liseré
// ni de contour granuleux.
async function rogner(blob) {
  const bitmap = await createImageBitmap(blob);
  const { width: w, height: h } = bitmap;

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);

  const data = ctx.getImageData(0, 0, w, h).data;

  let gauche = w, droite = -1, haut = h, bas = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      // Transparent : c'est du fond.
      if (data[i + 3] < 20) continue;
      // Blanc ou quasi blanc : c'est du fond aussi.
      if (data[i] >= SEUIL_FOND && data[i + 1] >= SEUIL_FOND && data[i + 2] >= SEUIL_FOND) continue;

      if (x < gauche) gauche = x;
      if (x > droite) droite = x;
      if (y < haut) haut = y;
      if (y > bas) bas = y;
    }
  }

  // Rien trouvé : image entièrement blanche ou transparente. On garde
  // l'originale plutôt qu'un carré vide.
  if (droite < 0 || bas < 0) return { blob, inchange: true };

  const largeur = droite - gauche + 1;
  const hauteur = bas - haut + 1;

  // Le produit occupe déjà presque tout le cadre : recadrer n'apporterait
  // rien et ferait un aller-retour Cloudinary pour rien.
  if (largeur > w * 0.92 && hauteur > h * 0.92) return { blob, inchange: true };

  const marge = Math.round(Math.max(largeur, hauteur) * MARGE);

  // Un canevas carré préserve les proportions du produit : une armoire
  // haute ne sera pas étirée dans un cadre carré.
  const cote = Math.max(largeur, hauteur) + marge * 2;

  const sortie = document.createElement("canvas");
  sortie.width = cote;
  sortie.height = cote;
  const ctxOut = sortie.getContext("2d");

  // Fond blanc pour rester cohérent avec les captures d'origine.
  ctxOut.fillStyle = "#ffffff";
  ctxOut.fillRect(0, 0, cote, cote);

  ctxOut.drawImage(
    bitmap,
    gauche, haut, largeur, hauteur,
    Math.round((cote - largeur) / 2),
    Math.round((cote - hauteur) / 2),
    largeur, hauteur
  );

  const recadre = await new Promise((res) =>
    sortie.toBlob((b) => res(b || blob), "image/jpeg", 0.92)
  );

  return { blob: recadre, inchange: false, avant: `${w}×${h}`, apres: `${cote}×${cote}` };
}

export default function DetourageClient({ produits, marques }) {
  const [marque, setMarque] = useState("");
  const [gamme, setGamme] = useState("");
  const [exclus, setExclus] = useState(() => new Set());
  const [refaire, setRefaire] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState(null);
  const [journal, setJournal] = useState([]);
  const arret = useRef(false);

  const marqueOptions = [
    { value: "", label: "Toutes les marques" },
    ...marques.map((m) => ({ value: m.nom, label: m.nom })),
  ];

  const gammeOptions = useMemo(() => {
    const noms = [...new Set(
      produits.filter((p) => !marque || p.marque === marque).map((p) => p.gamme)
    )].sort((a, b) => a.localeCompare(b, "fr"));
    return [{ value: "", label: "Toutes les gammes" }, ...noms.map((n) => ({ value: n, label: n }))];
  }, [produits, marque]);

  // Les produits retenus par les filtres, avec leurs images classées.
  const selection = useMemo(() => {
    return produits
      .filter((p) => (!marque || p.marque === marque) && (!gamme || p.gamme === gamme))
      .map((p) => {
        const aTraiter = p.images.filter(
          (u) => !estAmbiance(u) && !exclus.has(u) && (refaire || !dejaRecadree(u))
        );
        const ambiances = p.images.filter((u) => estAmbiance(u));
        return { ...p, aTraiter, ambiances };
      })
      .filter((p) => p.aTraiter.length);
  }, [produits, marque, gamme, exclus, refaire]);

  const totalImages = selection.reduce((s, p) => s + p.aTraiter.length, 0);
  const totalAmbiances = produits
    .filter((p) => (!marque || p.marque === marque) && (!gamme || p.gamme === gamme))
    .reduce((s, p) => s + p.images.filter(estAmbiance).length, 0);

  // Le recadrage est bien plus rapide que le détourage : une seconde par
  // image, essentiellement le temps de l'aller-retour réseau.
  const minutes = Math.ceil(totalImages / 60);

  const basculer = (url) => {
    setExclus((s) => {
      const n = new Set(s);
      n.has(url) ? n.delete(url) : n.add(url);
      return n;
    });
  };

  const envoyer = async (blob, nomOrigine) => {
    const fd = new FormData();
    // Le suffixe marque l'image comme traitée : un second passage la
    // reconnaîtra et la laissera tranquille.
    const base = nomOrigine.replace(/\.[^.]+$/, "").replace(/_cadre$/i, "");
    fd.append("file", new File([blob], `${base}_cadre.jpg`, { type: "image/jpeg" }));
    fd.append("upload_preset", PRESET);
    fd.append("folder", "coteburo/cadre");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.secure_url) {
      throw new Error(data?.error?.message || `Cloudinary a refusé le fichier (${res.status})`);
    }
    return data.secure_url;
  };

  const lancer = async () => {
    if (!CLOUD || !PRESET) {
      setJournal([{ type: "erreur", texte: "Cloudinary non configuré (variables .env manquantes)." }]);
      return;
    }

    arret.current = false;
    setEnCours(true);
    setJournal([]);

    let faites = 0;
    let sautees = 0;
    let echecs = 0;

    for (const produit of selection) {
      if (arret.current) break;

      // On garde l'ordre d'origine : seules les URL traitées changent.
      const nouvelles = [...produit.images];
      let modifie = false;

      for (const url of produit.aTraiter) {
        if (arret.current) break;

        setProgression({ produit: produit.nom, faites: faites + sautees, total: totalImages });

        try {
          const resp = await fetch(url, { mode: "cors" });
          if (!resp.ok) throw new Error("image inaccessible");

          const source = await resp.blob();
          const { blob, inchange } = await rogner(source);

          // Le produit remplissait déjà son cadre : on n'envoie rien.
          if (inchange) { sautees++; continue; }

          const nomFichier = decodeURIComponent(url).split("/").pop() || "image.jpg";
          const nouvelleUrl = await envoyer(blob, nomFichier);

          const i = nouvelles.indexOf(url);
          if (i >= 0) nouvelles[i] = nouvelleUrl;
          modifie = true;
          faites++;
        } catch (e) {
          echecs++;
          setJournal((j) => [
            ...j,
            { type: "erreur", texte: `${produit.nom} — ${e?.message || "échec"}` },
          ]);
        }
      }

      if (modifie) {
        const res = await enregistrerImages(produit.id, nouvelles);
        setJournal((j) => [
          ...j,
          res.ok
            ? { type: "ok", texte: `${produit.nom} — recadré` }
            : { type: "erreur", texte: `${produit.nom} — ${res.message}` },
        ]);
      }
    }

    setProgression(null);
    setEnCours(false);
    setJournal((j) => [
      ...j,
      {
        type: "bilan",
        texte: `${arret.current ? "Interrompu" : "Terminé"} — ${faites} recadrée(s), ${sautees} déjà bien cadrée(s), ${echecs} échec(s)`,
      },
    ]);
  };

  const carte = {
    background: "#fff",
    border: "1px solid #ece8e0",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  };

  const libelle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#9aa0a8",
    marginBottom: 6,
  };

  return (
    <div>
      {/* ── Filtres ── */}
      <div style={carte}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label>
            <span style={libelle}>Marque</span>
            <FormSelect
              value={marque}
              onChange={(v) => { setMarque(v); setGamme(""); }}
              options={marqueOptions}
            />
          </label>
          <label>
            <span style={libelle}>Gamme</span>
            <FormSelect value={gamme} onChange={setGamme} options={gammeOptions} />
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={refaire}
            onChange={(e) => setRefaire(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#f0661b", cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "#5c616a" }}>
            Reprendre les images déjà recadrées
            <span style={{ color: "#9aa0a8" }}> — utile après un changement de réglage</span>
          </span>
        </label>
      </div>

      {/* ── Résumé et lancement ── */}
      <div style={carte}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#23262a", margin: 0 }}>
              {totalImages} image{totalImages > 1 ? "s" : ""} à examiner
              <span style={{ color: "#9aa0a8", fontWeight: 500 }}> · {selection.length} produit{selection.length > 1 ? "s" : ""}</span>
            </p>
            <p style={{ fontSize: 12.5, color: "#5c616a", margin: "4px 0 0" }}>
              Environ {minutes} minute{minutes > 1 ? "s" : ""}
              {totalAmbiances > 0 && ` · ${totalAmbiances} photo${totalAmbiances > 1 ? "s" : ""} d'ambiance écartée${totalAmbiances > 1 ? "s" : ""}`}
            </p>
          </div>

          {enCours ? (
            <button
              type="button"
              onClick={() => { arret.current = true; }}
              style={{ padding: "12px 22px", borderRadius: 11, background: "#fff", color: "#c4451f", border: "1px solid #f5cdc6", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}
            >
              Interrompre
            </button>
          ) : (
            <button
              type="button"
              onClick={lancer}
              disabled={!totalImages}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 11, background: totalImages ? "#f0661b" : "#e8e3da", color: totalImages ? "#fff" : "#9aa0a8", border: "none", cursor: totalImages ? "pointer" : "default", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}
            >
              Lancer le recadrage
            </button>
          )}
        </div>

        {progression && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 6, borderRadius: 999, background: "#f0ece4", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(progression.faites / progression.total) * 100}%`, background: "#f0661b", transition: "width .2s" }} />
            </div>
            <p style={{ fontSize: 12.5, color: "#5c616a", margin: "7px 0 0" }}>
              {progression.faites} / {progression.total} — {progression.produit}
            </p>
          </div>
        )}
      </div>

      {/* ── Journal ── */}
      {journal.length > 0 && (
        <div style={carte}>
          <p style={{ ...libelle, marginBottom: 10 }}>Déroulé</p>
          <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {journal.map((l, i) => (
              <p key={i} style={{
                fontSize: 12.5, margin: 0,
                color: l.type === "erreur" ? "#c4451f" : l.type === "bilan" ? "#23262a" : "#5c616a",
                fontWeight: l.type === "bilan" ? 700 : 400,
              }}>
                {l.texte}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Aperçu des images ── */}
      {!enCours && selection.length > 0 && (
        <div style={carte}>
          <p style={{ ...libelle, marginBottom: 4 }}>Images concernées</p>
          <p style={{ fontSize: 12.5, color: "#5c616a", margin: "0 0 14px" }}>
            Cliquez sur une image pour l'écarter du traitement.
          </p>

          {selection.slice(0, 30).map((p) => (
            <div key={p.id} style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#23262a", margin: "0 0 8px" }}>
                {p.nom}
                <span style={{ color: "#9aa0a8", fontWeight: 500 }}> · {p.aTraiter.length} image(s)</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8 }}>
                {p.aTraiter.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => basculer(url)}
                    title="Écarter cette image"
                    style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", border: "1.5px solid #ece8e0", background: "#faf8f4", cursor: "pointer", padding: 0 }}
                  >
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </button>
                ))}
                {p.ambiances.map((url) => (
                  <div
                    key={url}
                    title="Photo d'ambiance — écartée automatiquement"
                    style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", border: "1.5px solid #ece8e0", background: "#faf8f4", opacity: 0.4 }}
                  >
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{ position: "absolute", bottom: 4, left: 4, right: 4, fontSize: 9, fontWeight: 700, textAlign: "center", background: "rgba(33,38,42,0.75)", color: "#fff", borderRadius: 5, padding: "2px 0" }}>
                      ambiance
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {selection.length > 30 && (
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>
              … et {selection.length - 30} produit(s) de plus.
            </p>
          )}
        </div>
      )}

      {exclus.size > 0 && (
        <div style={{ ...carte, background: "#fdeceb", border: "1px solid #f5cdc6" }}>
          <p style={{ fontSize: 13, color: "#c4451f", margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {exclus.size} image{exclus.size > 1 ? "s" : ""} écartée{exclus.size > 1 ? "s" : ""}
            <button type="button" onClick={() => setExclus(new Set())}
              style={{ fontSize: 12.5, color: "#c4451f", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Tout rétablir
            </button>
          </p>
        </div>
      )}
    </div>
  );
}