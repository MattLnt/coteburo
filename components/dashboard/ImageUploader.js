"use client";
import { useState, useRef } from "react";
import { Icon } from "./Icon";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function ImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const uploadOne = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Échec de l'upload");
    const data = await res.json();
    return data.secure_url;
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    if (!CLOUD || !PRESET) { setError("Cloudinary non configuré (variables .env manquantes)."); return; }
    setError("");
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const url = await uploadOne(file);
        urls.push(url);
      }
      onChange([...images, ...urls]);
    } catch (e) {
      setError("Une image n'a pas pu être envoyée. Réessayez.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
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
              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
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
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ width: "100%", padding: "20px", borderRadius: 12, border: "2px dashed #e0dacf", background: "#faf8f4", cursor: uploading ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#5c616a" }}>
        <Icon name="image" size={24} color="#f0661b" />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{uploading ? "Envoi en cours…" : "Ajouter des images"}</span>
        <span style={{ fontSize: 12, color: "#9aa0a8" }}>JPG, PNG, WebP — plusieurs à la fois</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />

      {error && <p style={{ fontSize: 12.5, color: "#d9551a", marginTop: 8 }}>{error}</p>}
    </div>
  );
}