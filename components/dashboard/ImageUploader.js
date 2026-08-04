"use client";
import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { removeBackground } from "@imgly/background-removal";
import { Icon } from "./Icon";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Au-delà de ce seuil, on compresse avant l'envoi (Cloudinary unsigned plafonne à 10 Mo).
const SEUIL_COMPRESSION_MO = 3;

export function ImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [statut, setStatut] = useState("");         // message d'étape (détourage / envoi)
  const [error, setError] = useState("");
  const [enAttente, setEnAttente] = useState(null);  // fichiers sélectionnés, en attente du choix détourage
  const [detourageIndex, setDetourageIndex] = useState(null); // index de l'image en cours de détourage a posteriori
  const inputRef = useRef(null);

  // ─── Traitements ───
  const detourerBlobOuFichier = async (source) => {
    const blob = await removeBackground(source);
    return blob; // PNG transparent
  };

  const preparerFichier = async (file) => {
    const estImage = file.type.startsWith("image/");
    const tropLourde = file.size > SEUIL_COMPRESSION_MO * 1024 * 1024;
    if (!estImage || !tropLourde) return file;
    try {
      return await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 2500,
        useWebWorker: true,
        initialQuality: 0.82,
        fileType: file.type === "image/png" ? "image/png" : undefined,
      });
    } catch {
      return file;
    }
  };

  const uploadBlob = async (blobOuFichier, nom = "image") => {
    const prepared = await preparerFichier(blobOuFichier);
    if (prepared.size > 10 * 1024 * 1024) {
      throw new Error(`Image encore trop lourde après compression (${(prepared.size / 1024 / 1024).toFixed(1)} Mo). Réduis-la avant.`);
    }
    const fd = new FormData();
    fd.append("file", prepared);
    fd.append("upload_preset", PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Cloudinary a refusé le fichier (${res.status})`);
    return data.secure_url;
  };

  // ─── Sélection : on ouvre la fenêtre de choix ───
  const onFilesSelected = (files) => {
    if (!files?.length) return;
    if (!CLOUD || !PRESET) { setError("Cloudinary non configuré (variables .env manquantes)."); return; }
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

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const definirPrincipale = (i) => {
    if (i <= 0) return;
    const next = [...images];
    const [img] = next.splice(i, 1);
    next.unshift(img);
    onChange(next);
  };

  const occupe = uploading || detourageIndex !== null;

  return (
    <div>
      {/* Grille des images */}
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12, marginBottom: 14 }}>
          {images.map((url, i) => (
            <div key={url + i} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #ece8e0", aspectRatio: "1 / 1", background: "#faf8f4" }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 0 && (
                <span style={{ position: "absolute", top: 6, left: 6, background: "#f0661b", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>Principale</span>
              )}

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

      <p style={{ fontSize: 12, color: "#9aa0a8", marginTop: 8 }}>
        Astuce : le bouton ✂️ sur chaque image retire le fond après coup, une par une.
      </p>

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