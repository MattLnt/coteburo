"use client";
import { useState, useRef, useEffect } from "react";
import { MediathequeLocale } from "./MediathequeLocale";
import { mediathequeActive, cheminSuggere } from "@/app/(admin)/admin/architecture/actionsMediatheque";
import { televerserImage, cloudinaryPret } from "./televerser";
import { removeBackground } from "@imgly/background-removal";
import { Icon } from "./Icon";



export function ImageUploader({ images = [], onChange, gammeNom = null }) {
  const [uploading, setUploading] = useState(false);
  const [statut, setStatut] = useState("");         // message d'étape (détourage / envoi)
  const [error, setError] = useState("");
  const [enAttente, setEnAttente] = useState(null);  // fichiers sélectionnés, en attente du choix détourage
  const [detourageIndex, setDetourageIndex] = useState(null); // index de l'image en cours de détourage a posteriori
  const inputRef = useRef(null);

  // Détourage en lot : les images cochées dans la galerie, par leur position.
  //
  // Par position et non par URL : rien n'interdit deux vignettes d'afficher la
  // même image, et il faut alors savoir laquelle a été cochée. En contrepartie
  // toute opération qui remue la liste invalide la sélection, d'où le vidage
  // dans move, remove et definirPrincipale.
  const [selection, setSelection] = useState(() => new Set());
  const [lot, setLot] = useState(null);   // { fait, total } pendant le traitement
  const [bilan, setBilan] = useState(""); // compte rendu une fois le lot fini
  const arret = useRef(false);

  // Médiathèque du disque : disponible seulement là où le dossier de visuels
  // existe, c'est-à-dire en local. Le serveur de production n'a pas ces
  // fichiers, le bouton n'y apparaît donc pas.
  const [mediatheque, setMediatheque] = useState(false);
  const [mediathequeOuverte, setMediathequeOuverte] = useState(false);
  useEffect(() => { mediathequeActive().then(setMediatheque).catch(() => {}); }, []);

  // Dossier probable des visuels de la gamme, à coller dans la fenêtre
  // « Ouvrir » de Windows plutôt que d'y descendre à la souris.
  const [chemin, setChemin] = useState(null);
  const [copie, setCopie] = useState(false);
  useEffect(() => {
    if (!gammeNom) return;
    cheminSuggere(gammeNom).then(setChemin).catch(() => {});
  }, [gammeNom]);

  const copier = async () => {
    if (!chemin?.chemin) return;
    try {
      await navigator.clipboard.writeText(chemin.chemin);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    } catch {
      setError("Copie refusée par le navigateur — sélectionne le chemin à la main.");
    }
  };

  // ─── Traitements ───
  const detourerBlobOuFichier = async (source) => {
    const blob = await removeBackground(source);
    return blob; // PNG transparent
  };

  const uploadBlob = (blobOuFichier) => televerserImage(blobOuFichier);

  // ─── Sélection : on ouvre la fenêtre de choix ───
  const onFilesSelected = (files) => {
    if (!files?.length) return;
    if (!cloudinaryPret()) { setError("Cloudinary non configuré (variables .env manquantes)."); return; }
    setError("");
    setEnAttente(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  // ─── Envoi du lot (avec ou sans détourage) ───
  const envoyerLot = async (avecDetourage) => {
    const liste = enAttente || [];
    setEnAttente(null);
    if (!liste.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = [];
      for (let i = 0; i < liste.length; i++) {
        let source = liste[i];
        const suffixe = liste.length > 1 ? ` (${i + 1}/${liste.length})` : "";
        if (avecDetourage) {
          setStatut(`Détourage du fond…${suffixe}`);
          try { source = await detourerBlobOuFichier(source); }
          catch (e) { throw new Error(`Le détourage a échoué${suffixe}. Réessaie sans détourer. (${e?.message || "erreur"})`); }
        }
        setStatut(`Envoi…${suffixe}`);
        urls.push(await uploadBlob(source));
      }
      onChange([...images, ...urls]);
    } catch (e) {
      setError(e?.message || "Une image n'a pas pu être envoyée. Réessayez.");
    } finally {
      setUploading(false);
      setStatut("");
    }
  };

  // ─── Détourage a posteriori d'une image déjà en ligne ───
  const detourerImageExistante = async (i) => {
    setError("");
    setBilan("");
    setDetourageIndex(i);
    try {
      const resp = await fetch(images[i], { mode: "cors" });
      if (!resp.ok) throw new Error("Image inaccessible");
      const blobSource = await resp.blob();
      const detoure = await detourerBlobOuFichier(blobSource);
      const url = await uploadBlob(detoure);
      const next = [...images];
      next[i] = url;
      onChange(next);
    } catch (e) {
      setError(`Détourage impossible sur cette image (${e?.message || "erreur"}). Elle est peut-être protégée par le navigateur — réuploade-la avec l'option détourage.`);
    } finally {
      setDetourageIndex(null);
    }
  };

  // ─── Détourage en lot des images cochées ───
  //
  // Une image à la fois, volontairement : le modèle de @imgly tourne dans le
  // navigateur et occupe déjà plusieurs centaines de mégaoctets. Les lancer de
  // front ferait ramer la machine pour le même temps total.
  //
  // Le tableau final n'est remis au parent qu'à la fin, mais les réussites
  // sont conservées même si une image échoue en cours de route : sur dix
  // photos, en perdre neuf parce que la septième est protégée par le
  // navigateur serait absurde.
  const detourerSelection = async () => {
    const indices = [...selection].sort((a, b) => a - b);
    if (!indices.length) return;

    setError("");
    setBilan("");
    arret.current = false;
    setLot({ fait: 0, total: indices.length });

    const next = [...images];
    const echecs = [];
    let faites = 0;

    for (const i of indices) {
      if (arret.current) break;
      setDetourageIndex(i);
      setLot({ fait: faites, total: indices.length });
      try {
        const resp = await fetch(images[i], { mode: "cors" });
        if (!resp.ok) throw new Error("image inaccessible");
        next[i] = await uploadBlob(await detourerBlobOuFichier(await resp.blob()));
        faites++;
      } catch (e) {
        echecs.push({ position: i + 1, raison: e?.message || "erreur" });
      }
    }

    const interrompu = arret.current;
    setDetourageIndex(null);
    setLot(null);
    setSelection(new Set());
    if (faites) onChange(next);

    if (echecs.length) {
      setError(
        `${echecs.length} image${echecs.length > 1 ? "s" : ""} n'${echecs.length > 1 ? "ont" : "a"} pas pu être détourée${echecs.length > 1 ? "s" : ""} ` +
        `(position ${echecs.map((e) => e.position).join(", ")} — ${echecs[0].raison}). ` +
        `Elle${echecs.length > 1 ? "s sont" : " est"} peut-être protégée${echecs.length > 1 ? "s" : ""} par le navigateur : réuploade-la${echecs.length > 1 ? "s" : ""} avec l'option détourage.`
      );
    }
    setBilan(
      `${interrompu ? "Interrompu" : "Terminé"} — ${faites} image${faites > 1 ? "s" : ""} détourée${faites > 1 ? "s" : ""}` +
      (echecs.length ? `, ${echecs.length} échec${echecs.length > 1 ? "s" : ""}` : "")
    );
  };

  const basculerSelection = (i) => {
    setBilan("");
    setSelection((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const toutSelectionner = () => {
    setBilan("");
    setSelection(selection.size === images.length ? new Set() : new Set(images.map((_, i) => i)));
  };

  // Toute opération qui déplace les images rend les positions cochées
  // caduques : on repart d'une sélection vide plutôt que de détourer la
  // mauvaise photo.
  const viderSelection = () => { setSelection(new Set()); setBilan(""); };

  const remove = (i) => { viderSelection(); onChange(images.filter((_, idx) => idx !== i)); };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    viderSelection();
    onChange(next);
  };
  const definirPrincipale = (i) => {
    if (i <= 0) return;
    const next = [...images];
    const [img] = next.splice(i, 1);
    next.unshift(img);
    viderSelection();
    onChange(next);
  };

  const occupe = uploading || detourageIndex !== null || lot !== null;

  return (
    <div>
      {/* Barre de sélection — détourage de plusieurs images d'un coup */}
      {images.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10, padding: "9px 12px", borderRadius: 10,
          border: `1px solid ${selection.size ? "#f7d3bd" : "#ece8e0"}`, background: selection.size ? "#fff6f0" : "#faf8f4" }}>
          <span style={{ fontSize: 12.5, color: selection.size ? "#c4451f" : "#9aa0a8", fontWeight: selection.size ? 700 : 500 }}>
            {lot
              ? `Détourage ${lot.fait + 1} / ${lot.total}…`
              : selection.size
                ? `${selection.size} image${selection.size > 1 ? "s" : ""} sélectionnée${selection.size > 1 ? "s" : ""}`
                : "Cochez des images pour les détourer d'un coup"}
          </span>
          <span style={{ flex: 1 }} />
          {lot ? (
            <button type="button" onClick={() => { arret.current = true; }}
              style={{ padding: "7px 14px", borderRadius: 9, background: "#fff", color: "#c4451f", border: "1px solid #f5cdc6", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
              Interrompre
            </button>
          ) : (
            <>
              <button type="button" onClick={toutSelectionner} disabled={occupe}
                style={{ padding: "7px 12px", borderRadius: 9, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", cursor: occupe ? "default" : "pointer", opacity: occupe ? 0.5 : 1, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
                {selection.size === images.length ? "Tout décocher" : "Tout cocher"}
              </button>
              <button type="button" onClick={detourerSelection} disabled={!selection.size || occupe}
                style={{ padding: "7px 14px", borderRadius: 9, background: selection.size && !occupe ? "#f0661b" : "#e8e3da", color: selection.size && !occupe ? "#fff" : "#9aa0a8",
                  border: "none", cursor: selection.size && !occupe ? "pointer" : "default", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
                ✂️ Détourer la sélection
              </button>
            </>
          )}
          {lot && (
            <div style={{ flexBasis: "100%", height: 5, borderRadius: 999, background: "#f0ece4", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(lot.fait / lot.total) * 100}%`, background: "#f0661b", transition: "width .2s" }} />
            </div>
          )}
        </div>
      )}

      {bilan && <p style={{ fontSize: 12.5, color: "#5c616a", margin: "0 0 10px", fontWeight: 600 }}>{bilan}</p>}

      {/* Grille des images */}
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12, marginBottom: 14 }}>
          {images.map((url, i) => (
            <div key={url + i} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #ece8e0", aspectRatio: "1 / 1", background: "#faf8f4" }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

              {/* Liseré de sélection posé par-dessus l'image, et non en
                  bordure de la vignette : une bordure plus épaisse la
                  décalerait d'un pixel à chaque clic, et une ombre intérieure
                  passerait sous l'image, qui couvre toute la surface. */}
              {selection.has(i) && (
                <div style={{ position: "absolute", inset: 0, border: "2.5px solid #f0661b", borderRadius: 12, pointerEvents: "none" }} />
              )}

              <div style={{ position: "absolute", top: 6, left: 6, display: "flex", alignItems: "center", gap: 6 }}>
                {images.length > 1 && (
                  <button type="button" onClick={() => basculerSelection(i)} disabled={occupe}
                    title={selection.has(i) ? "Retirer de la sélection" : "Ajouter à la sélection"} aria-pressed={selection.has(i)}
                    style={{ width: 21, height: 21, borderRadius: 6, padding: 0, flexShrink: 0,
                      border: selection.has(i) ? "none" : "1.5px solid rgba(255,255,255,0.92)",
                      background: selection.has(i) ? "#f0661b" : "rgba(33,36,40,0.45)", color: "#fff",
                      cursor: occupe ? "default" : "pointer", opacity: occupe ? 0.5 : 1,
                      display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, lineHeight: 1 }}>
                    {selection.has(i) ? "✓" : ""}
                  </button>
                )}
                {i === 0 && (
                  <span style={{ background: "#f0661b", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>Principale</span>
                )}
              </div>

              {/* Overlay de détourage en cours */}
              {detourageIndex === i && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.82)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#d9551a" }}>
                  ✂️ Détourage…
                </div>
              )}

              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                <button type="button" onClick={() => detourerImageExistante(i)} disabled={occupe} title="Détourer le fond de cette image"
                  style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(33,36,40,0.78)", border: "none", color: "#fff", cursor: occupe ? "default" : "pointer", opacity: occupe ? 0.5 : 1, display: "grid", placeItems: "center", fontSize: 13 }}>✂️</button>
                {i !== 0 && (
                  <button type="button" onClick={() => definirPrincipale(i)} title="Définir comme principale"
                    style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(240,102,27,0.92)", border: "none", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1 }}>★</button>
                )}
                <button type="button" onClick={() => remove(i)} title="Supprimer"
                  style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(33,36,40,0.78)", border: "none", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
              <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", justifyContent: "center", gap: 4 }}>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Vers la gauche"
                  style={{ flex: 1, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.92)", border: "1px solid #ece8e0", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1, fontSize: 12 }}>←</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} title="Vers la droite"
                  style={{ flex: 1, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.92)", border: "1px solid #ece8e0", cursor: i === images.length - 1 ? "default" : "pointer", opacity: i === images.length - 1 ? 0.4 : 1, fontSize: 12 }}>→</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone d'upload */}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={occupe}
        style={{ width: "100%", padding: "20px", borderRadius: 12, border: "2px dashed #e0dacf", background: "#faf8f4", cursor: occupe ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#5c616a" }}>
        <Icon name="image" size={24} color="#f0661b" />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{uploading ? (statut || "Traitement en cours…") : "Ajouter des images"}</span>
        <span style={{ fontSize: 12, color: "#9aa0a8" }}>JPG, PNG, WebP — compressées automatiquement</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFilesSelected(e.target.files)} />

      {chemin && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9aa0a8" }}>
              Visuels de la gamme
            </span>
            <span style={{ fontSize: 11.5, color: "#9aa0a8" }}>
              {chemin.images ? `${chemin.images} image${chemin.images > 1 ? "s" : ""} à la racine` : "images dans les sous-dossiers"}
            </span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={copier}
              style={{ padding: "5px 11px", borderRadius: 8, border: "1px solid #e8e3da", background: copie ? "#f0661b" : "#fff",
                color: copie ? "#fff" : "#5c616a", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
              {copie ? "Copié ✓" : "Copier le chemin"}
            </button>
          </div>
          <code style={{ display: "block", fontSize: 11.5, color: "#23262a", wordBreak: "break-all", lineHeight: 1.45 }}>{chemin.chemin}</code>
          <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "6px 0 0" }}>
            À coller dans la barre d&apos;adresse de la fenêtre « Ouvrir ».
            {chemin.autres?.length > 0 && ` Autres dossiers possibles : ${chemin.autres.map((a) => `${a.rel.split("/").pop()} (${a.images})`).join(", ")}.`}
          </p>
        </div>
      )}

      {mediatheque && (
        <button type="button" onClick={() => setMediathequeOuverte(true)} disabled={occupe}
          style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 10, border: "1px solid #e8e3da", background: "#fff",
            cursor: occupe ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#5c616a", fontSize: 13 }}>
          <Icon name="layers" size={17} color="#9aa0a8" />
          <span style={{ fontWeight: 600 }}>Piocher dans les visuels fournisseurs</span>
        </button>
      )}

      <p style={{ fontSize: 12, color: "#9aa0a8", marginTop: 8 }}>
        Astuce : le bouton ✂️ d&apos;une vignette retire le fond de cette image seule.
        Pour en traiter plusieurs, cochez-les puis lancez « Détourer la sélection » — comptez 2-4 s par image, le calcul se fait dans le navigateur.
      </p>

      {mediathequeOuverte && (
        <MediathequeLocale
          onFermer={() => setMediathequeOuverte(false)}
          onAjouter={(urls) => onChange([...images, ...urls])}
        />
      )}

      {error && <p style={{ fontSize: 12.5, color: "#d9551a", marginTop: 8 }}>{error}</p>}

      {/* Fenêtre de choix après sélection */}
      {enAttente && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={() => setEnAttente(null)} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", border: "1px solid #ece8e0", borderRadius: 20, padding: 26 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 6px" }}>Détourer le fond ?</h2>
            <p style={{ fontSize: 13.5, color: "#5c616a", margin: "0 0 20px", lineHeight: 1.6 }}>
              {enAttente.length > 1 ? `${enAttente.length} images sélectionnées.` : "1 image sélectionnée."} Veux-tu retirer l'arrière-plan (résultat PNG transparent) ? Idéal pour les photos produit sur fond clair — compte 2-4 s par image.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => envoyerLot(false)}
                style={{ padding: "13px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                Non, garder le fond
              </button>
              <button type="button" onClick={() => envoyerLot(true)}
                style={{ padding: "13px", borderRadius: 12, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                Oui, détourer
              </button>
            </div>
            <button type="button" onClick={() => setEnAttente(null)} style={{ width: "100%", marginTop: 10, padding: "8px", background: "none", border: "none", color: "#9aa0a8", cursor: "pointer", fontSize: 12.5 }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}