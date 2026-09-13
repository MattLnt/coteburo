"use client";

import { useState, useMemo, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";
import { enregistrerImages } from "./actions";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Une photo d'ambiance montre le produit en situation : la détourer
// isolerait un meuble au hasard dans la scène. On les reconnaît à leur
// nom de fichier, les catalogues fournisseurs les préfixant ainsi.
const MOTS_AMBIANCE = ["amb_", "amb-", "ambiance", "_amb", "bodegon", "zoom"];

const estAmbiance = (url) => {
  const nom = decodeURIComponent(url).toLowerCase();
  return MOTS_AMBIANCE.some((m) => nom.includes(m));
};

// Une image déjà détourée porte la marque du traitement dans son nom.
const dejaDetouree = (url) => decodeURIComponent(url).toLowerCase().includes("_detoure");

export default function DetourageClient({ produits, marques }) {
  const [marque, setMarque] = useState("");
  const [gamme, setGamme] = useState("");
  const [exclus, setExclus] = useState(() => new Set());
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
          (u) => !estAmbiance(u) && !dejaDetouree(u) && !exclus.has(u)
        );
        const ambiances = p.images.filter((u) => estAmbiance(u));
        return { ...p, aTraiter, ambiances };
      })
      .filter((p) => p.aTraiter.length);
  }, [produits, marque, gamme, exclus]);

  const totalImages = selection.reduce((s, p) => s + p.aTraiter.length, 0);
  const totalAmbiances = produits
    .filter((p) => (!marque || p.marque === marque) && (!gamme || p.gamme === gamme))
    .reduce((s, p) => s + p.images.filter(estAmbiance).length, 0);

  const minutes = Math.ceil((totalImages * 3.5) / 60);

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
    const nom = nomOrigine.replace(/\.[^.]+$/, "") + "_detoure.png";
    fd.append("file", new File([blob], nom, { type: "image/png" }));
    fd.append("upload_preset", PRESET);
    fd.append("folder", "coteburo/detoure");

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
    let echecs = 0;

    for (const produit of selection) {
      if (arret.current) break;

      // On garde l'ordre d'origine : seules les URL traitées changent.
      const nouvelles = [...produit.images];
      let modifie = false;

      for (const url of produit.aTraiter) {
        if (arret.current) break;

        setProgression({
          produit: produit.nom,
          faites,
          total: totalImages,
        });

        try {
          const resp = await fetch(url, { mode: "cors" });
          if (!resp.ok) throw new Error("image inaccessible");

          const source = await resp.blob();
          const detoure = await removeBackground(source);

          const nomFichier = decodeURIComponent(url).split("/").pop() || "image.png";
          const nouvelleUrl = await envoyer(detoure, nomFichier);

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
            ? { type: "ok", texte: `${produit.nom} — ${produit.aTraiter.length} image(s) détourée(s)` }
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
        texte: arret.current
          ? `Interrompu — ${faites} image(s) traitée(s), ${echecs} échec(s)`
          : `Terminé — ${faites} image(s) traitée(s), ${echecs} échec(s)`,
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
      </div>

      {/* ── Résumé et lancement ── */}
      <div style={carte}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#23262a", margin: 0 }}>
              {totalImages} image{totalImages > 1 ? "s" : ""} à détourer
              <span style={{ color: "#9aa0a8", fontWeight: 500 }}> · {selection.length} produit{selection.length > 1 ? "s" : ""}</span>
            </p>
            <p style={{ fontSize: 12.5, color: "#5c616a", margin: "4px 0 0" }}>
              Environ {minutes} minute{minutes > 1 ? "s" : ""} de traitement
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
              Lancer le détourage
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