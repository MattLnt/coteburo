"use client";
import { useState, useTransition } from "react";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import {
  creerPalette, renommerPalette, supprimerPalette,
  creerFinition, majFinition, supprimerFinition,
} from "./actionsFinitions";

export default function FinitionsManager({ palettes: palettesInit, orphelines: orphelinesInit }) {
  const [palettes, setPalettes] = useState(palettesInit || []);
  const [orphelines, setOrphelines] = useState(orphelinesInit || []);
  const [isPending, startTransition] = useTransition();
  const [nouvellePalette, setNouvellePalette] = useState("");
  const [nouvelleMarque, setNouvelleMarque] = useState("");
  const [edition, setEdition] = useState(null); // { paletteId | "orphelines", finition? }

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 8 };
  const input = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
  const btnDark = { padding: "10px 16px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 };
  const btnGhost = { padding: "7px 12px", borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#5c616a" };
  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 20, marginBottom: 16 };

  const ajouterPalette = () => {
    if (!nouvellePalette.trim()) return;
    startTransition(async () => {
      const res = await creerPalette({ nom: nouvellePalette, marque: nouvelleMarque });
      if (res.ok) {
        setPalettes((p) => [...p, { id: res.id, nom: nouvellePalette.trim(), marque: nouvelleMarque.trim() || null, finitions: [] }]);
        setNouvellePalette(""); setNouvelleMarque("");
      }
    });
  };

  const supprPalette = (id) => {
    if (!confirm("Supprimer cette palette ? Ses finitions deviendront « sans palette » (non supprimées).")) return;
    startTransition(async () => {
      await supprimerPalette(id);
      setPalettes((ps) => {
        const p = ps.find((x) => x.id === id);
        if (p?.finitions?.length) setOrphelines((o) => [...o, ...p.finitions.map((f) => ({ ...f, paletteId: null }))]);
        return ps.filter((x) => x.id !== id);
      });
    });
  };

  const supprFinition = (finId, paletteId) => {
    startTransition(async () => {
      await supprimerFinition(finId);
      if (paletteId) setPalettes((ps) => ps.map((p) => p.id === paletteId ? { ...p, finitions: p.finitions.filter((f) => f.id !== finId) } : p));
      else setOrphelines((o) => o.filter((f) => f.id !== finId));
    });
  };

  const pastille = (f) => (
    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #f0ece4", borderRadius: 10, background: "#fdfcfa" }}>
      <span style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, border: "1px solid #e0dacf", overflow: "hidden", background: f.couleur || "#f0ece4", display: "grid", placeItems: "center" }}>
        {f.imageUrl ? <img src={f.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#23262a" }}>{f.nom}</span>
      {f.couleur && <span style={{ fontSize: 11, color: "#9aa0a8" }}>{f.couleur}</span>}
      <button style={btnGhost} onClick={() => setEdition({ paletteId: f.paletteId || "orphelines", finition: f })}>Éditer</button>
      <button style={{ ...btnGhost, color: "#c4735a" }} onClick={() => supprFinition(f.id, f.paletteId)}>🗑</button>
    </div>
  );

  return (
    <div>
      <p style={{ color: "#5c616a", margin: "0 0 18px", fontSize: 14 }}>
        Bibliothèque de finitions réutilisables. Définis une couleur/swatch <strong>une seule fois</strong> — tu la réutiliseras sur n'importe quel produit.
      </p>

      {/* Créer une palette */}
      <div style={{ ...card, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={label}>Nouvelle palette</label>
          <input style={input} value={nouvellePalette} onChange={(e) => setNouvellePalette(e.target.value)} placeholder="Ex. Palette bois Buronomic" />
        </div>
        <div style={{ width: 180 }}>
          <label style={label}>Marque (optionnel)</label>
          <input style={input} value={nouvelleMarque} onChange={(e) => setNouvelleMarque(e.target.value)} placeholder="Buronomic" />
        </div>
        <button style={btnDark} onClick={ajouterPalette} disabled={isPending}>+ Créer</button>
      </div>

      {/* Palettes */}
      {palettes.map((p) => (
        <div key={p.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#23262a" }}>{p.nom}</h3>
              {p.marque && <span style={{ fontSize: 11.5, color: "#9aa0a8" }}>{p.marque}</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnGhost} onClick={() => setEdition({ paletteId: p.id, finition: null })}>+ Finition</button>
              <button style={{ ...btnGhost, color: "#c4735a" }} onClick={() => supprPalette(p.id)}>Supprimer palette</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
            {p.finitions.length ? p.finitions.map(pastille) : <span style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic" }}>Aucune finition.</span>}
          </div>
        </div>
      ))}

      {/* Finitions sans palette */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#23262a" }}>Sans palette</h3>
          <button style={btnGhost} onClick={() => setEdition({ paletteId: "orphelines", finition: null })}>+ Finition</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
          {orphelines.length ? orphelines.map(pastille) : <span style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic" }}>Aucune finition isolée.</span>}
        </div>
      </div>

      {edition && (
        <ModaleFinition
          contexte={edition}
          onClose={() => setEdition(null)}
          onSaved={(fin) => {
            const pid = edition.paletteId === "orphelines" ? null : edition.paletteId;
            if (edition.finition) {
              // édition
              if (pid) setPalettes((ps) => ps.map((p) => p.id === pid ? { ...p, finitions: p.finitions.map((f) => f.id === fin.id ? fin : f) } : p));
              else setOrphelines((o) => o.map((f) => f.id === fin.id ? fin : f));
            } else {
              // création
              if (pid) setPalettes((ps) => ps.map((p) => p.id === pid ? { ...p, finitions: [...p.finitions, fin] } : p));
              else setOrphelines((o) => [...o, fin]);
            }
            setEdition(null);
          }}
        />
      )}
    </div>
  );
}

function ModaleFinition({ contexte, onClose, onSaved }) {
  const f = contexte.finition;
  const [nom, setNom] = useState(f?.nom || "");
  const [couleur, setCouleur] = useState(f?.couleur || "");
  const [imageUrl, setImageUrl] = useState(f?.imageUrl || "");
  const [isPending, startTransition] = useTransition();
  const paletteId = contexte.paletteId === "orphelines" ? null : contexte.paletteId;

  const input = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 8 };

  const valider = () => {
    if (!nom.trim()) return;
    startTransition(async () => {
      if (f) {
        await majFinition(f.id, { nom, couleur, imageUrl, paletteId });
        onSaved({ ...f, nom: nom.trim(), couleur: couleur.trim() || null, imageUrl: imageUrl.trim() || null, paletteId });
      } else {
        const res = await creerFinition({ nom, couleur, imageUrl, paletteId });
        if (res.ok) onSaved({ id: res.id, nom: nom.trim(), couleur: couleur.trim() || null, imageUrl: imageUrl.trim() || null, paletteId });
      }
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", border: "1px solid #ece8e0", borderRadius: 20, padding: 26 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 18px" }}>{f ? "Modifier la finition" : "Nouvelle finition"}</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nom</label>
          <input style={input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Hêtre" autoFocus />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Couleur (hex, optionnel)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input style={{ ...input, flex: 1 }} value={couleur} onChange={(e) => setCouleur(e.target.value)} placeholder="#d8b384" />
            <span style={{ width: 40, height: 40, borderRadius: 9, border: "1px solid #e0dacf", background: couleur || "#f0ece4", flexShrink: 0 }} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={label}>Swatch / texture (optionnel)</label>
          <ImageUploader images={imageUrl ? [imageUrl] : []} onChange={(imgs) => setImageUrl(imgs[0] || "")} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Annuler</button>
          <button onClick={valider} disabled={isPending || !nom.trim()}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: isPending || !nom.trim() ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}