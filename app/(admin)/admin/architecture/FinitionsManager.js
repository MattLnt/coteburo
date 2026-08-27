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
  const [formOuvert, setFormOuvert] = useState(false);
  const [edition, setEdition] = useState(null); // { paletteId | "orphelines", finition? }
  // Palettes dépliées — repliées par défaut, pour ne pas dérouler toute la bibliothèque.
  const [ouvertes, setOuvertes] = useState(() => new Set());

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 8 };
  const input = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
  const btnDark = { padding: "11px 18px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "inherit" };
  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, marginBottom: 10, overflow: "hidden" };

  const toggleOuverte = (id) => {
    setOuvertes((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const ajouterPalette = () => {
    if (!nouvellePalette.trim()) return;
    startTransition(async () => {
      const res = await creerPalette({ nom: nouvellePalette, marque: nouvelleMarque });
      if (res.ok) {
        setPalettes((p) => [...p, { id: res.id, nom: nouvellePalette.trim(), marque: nouvelleMarque.trim() || null, finitions: [] }]);
        setNouvellePalette(""); setNouvelleMarque(""); setFormOuvert(false);
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

  // Aperçu : les trois premiers coloris de la palette, collés en bandeau.
  const apercu = (finitions) => {
    const trois = (finitions || []).slice(0, 3);
    if (trois.length === 0) {
      return <span style={{ width: 45, height: 26, borderRadius: 4, background: "#f0ece4", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 9.5, color: "#b0aca2" }}>—</span>;
    }
    return (
      <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        {trois.map((f, i) => (
          <span key={f.id} style={{
            width: 15, height: 26, flexShrink: 0, overflow: "hidden",
            borderRadius: i === 0 ? "4px 0 0 4px" : (i === trois.length - 1 ? "0 4px 4px 0" : 0),
            background: f.couleur || "#f0ece4",
            border: f.couleur === "#FFFFFF" || f.couleur === "#ffffff" ? "1px solid #e0dacf" : "none",
            boxSizing: "border-box",
          }}>
            {f.imageUrl ? <img src={f.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </span>
        ))}
      </span>
    );
  };

  // Une finition dans la liste dépliée.
  const ligneFinition = (f) => (
    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: "1px solid #f0ece4", borderRadius: 9, background: "#fdfcfa" }}>
      <span style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, border: "1px solid #e0dacf", overflow: "hidden", background: f.couleur || "#f0ece4", display: "grid", placeItems: "center" }}>
        {f.imageUrl ? <img src={f.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nom}</span>
      <button onClick={() => setEdition({ paletteId: f.paletteId || "orphelines", finition: f })} title="Modifier"
        style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#5c616a", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
      </button>
      <button onClick={() => supprFinition(f.id, f.paletteId)} title="Supprimer"
        style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", flexShrink: 0, fontSize: 13 }}>🗑</button>
    </div>
  );

  // Bloc palette repliable — utilisé aussi pour le groupe « Sans palette ».
  const blocPalette = ({ id, nom, marque, finitions, supprimable }) => {
    const ouverte = ouvertes.has(id);
    return (
      <div key={id} style={{ ...card, borderColor: ouverte ? "#f0c4a0" : "#ece8e0" }}>
        <button
          type="button"
          onClick={() => toggleOuverte(id)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
        >
          {apercu(finitions)}
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nom}</span>
            <span style={{ display: "block", fontSize: 11, color: "#9aa0a8", marginTop: 2 }}>
              {marque ? `${marque} · ` : ""}{finitions.length} coloris
            </span>
          </span>
          <span style={{ color: ouverte ? "#d9551a" : "#9aa0a8", display: "flex", flexShrink: 0, transform: ouverte ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </button>

        {ouverte && (
          <div style={{ borderTop: "1px solid #f2efe9", padding: 14 }}>
            <div className="fn-grille" style={{ marginBottom: finitions.length ? 12 : 0 }}>
              {finitions.length
                ? finitions.map(ligneFinition)
                : <span style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic" }}>Aucune finition.</span>}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setEdition({ paletteId: id === "orphelines" ? "orphelines" : id, finition: null })}
                style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #e8e3da", background: "#faf8f4", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#23262a", fontFamily: "inherit" }}>
                + Finition
              </button>
              {supprimable && (
                <button onClick={() => supprPalette(id)}
                  style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#c4735a", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <style>{`
        /* Mobile : le formulaire de création se déplie, finitions en liste simple.
           Desktop : formulaire toujours visible, finitions en grille. */
        .fn-form-bouton { display: flex; }
        .fn-form { display: none; }
        .fn-form.ouvert { display: block; }
        .fn-form-champs { display: flex; flex-direction: column; gap: 10px; }
        .fn-form-marque { width: 100%; }
        .fn-grille { display: flex; flex-direction: column; gap: 6px; }
        @media (min-width: 1024px) {
          .fn-form-bouton { display: none; }
          .fn-form { display: block; }
          .fn-form-champs { flex-direction: row; align-items: flex-end; flex-wrap: wrap; }
          .fn-form-marque { width: 180px; }
          .fn-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
        }
      `}</style>

      <p style={{ color: "#5c616a", margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.6 }}>
        Bibliothèque de finitions réutilisables. Définis une couleur ou un swatch <strong>une seule fois</strong> — tu la réutiliseras sur n'importe quel produit.
      </p>

      {/* Créer une palette */}
      <button
        type="button"
        className="fn-form-bouton"
        onClick={() => setFormOuvert((v) => !v)}
        style={{
          width: "100%", alignItems: "center", justifyContent: "center", gap: 8,
          padding: 12, borderRadius: 12, border: "1.5px dashed #e0dacf", background: "#faf8f4",
          cursor: "pointer", color: "#5c616a", marginBottom: 12, fontFamily: "inherit",
        }}
      >
        <span style={{ color: "#d9551a", fontSize: 17, lineHeight: 1 }}>+</span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formOuvert ? "Annuler" : "Nouvelle palette"}</span>
      </button>

      <div className={`fn-form${formOuvert ? " ouvert" : ""}`} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div className="fn-form-champs" style={{ gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={label}>Nouvelle palette</label>
            <input style={input} value={nouvellePalette} onChange={(e) => setNouvellePalette(e.target.value)} placeholder="Ex. Palette bois Buronomic" />
          </div>
          <div className="fn-form-marque">
            <label style={label}>Marque (optionnel)</label>
            <input style={input} value={nouvelleMarque} onChange={(e) => setNouvelleMarque(e.target.value)} placeholder="Buronomic" />
          </div>
          <button style={btnDark} onClick={ajouterPalette} disabled={isPending || !nouvellePalette.trim()}>+ Créer</button>
        </div>
      </div>

      {/* Palettes */}
      {palettes.map((p) => blocPalette({
        id: p.id,
        nom: p.nom,
        marque: p.marque,
        finitions: p.finitions || [],
        supprimable: true,
      }))}

      {/* Finitions sans palette */}
      {blocPalette({
        id: "orphelines",
        nom: "Sans palette",
        marque: null,
        finitions: orphelines,
        supprimable: false,
      })}

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
      <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", border: "1px solid #ece8e0", borderRadius: 20, padding: 24, maxHeight: "90dvh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 18px" }}>{f ? "Modifier la finition" : "Nouvelle finition"}</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nom</label>
          <input style={input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Hêtre" autoFocus />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Couleur (hex, optionnel)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input style={{ ...input, flex: 1, minWidth: 0 }} value={couleur} onChange={(e) => setCouleur(e.target.value)} placeholder="#d8b384" />
            <span style={{ width: 40, height: 40, borderRadius: 9, border: "1px solid #e0dacf", background: couleur || "#f0ece4", flexShrink: 0 }} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={label}>Swatch / texture (optionnel)</label>
          <ImageUploader images={imageUrl ? [imageUrl] : []} onChange={(imgs) => setImageUrl(imgs[0] || "")} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>Annuler</button>
          <button onClick={valider} disabled={isPending || !nom.trim()}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: isPending || !nom.trim() ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}