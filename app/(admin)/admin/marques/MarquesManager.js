"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { createMarque, updateMarque, deleteMarque } from "./actions";

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };
const hint = { fontSize: 12, color: "#9aa0a8", margin: "6px 0 0" };

// Vignette de la marque : logo si présent, sinon initiale sur fond teinté.
function Vignette({ logoUrl, nom, actif = true, taille = 42 }) {
  if (logoUrl) {
    return (
      <span style={{ width: taille, height: taille, borderRadius: 10, background: "#faf8f4", border: "1px solid #ece8e0", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
        <img src={logoUrl} alt={nom} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </span>
    );
  }
  return (
    <span style={{
      width: taille, height: taille, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0,
      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: taille * 0.4, lineHeight: 1,
      background: actif ? "#fce6d6" : "#f0ece4",
      color: actif ? "#d9551a" : "#5c616a",
    }}>
      {nom[0]?.toUpperCase()}
    </span>
  );
}

function LogoBlock({ logoUrl, onChange }) {
  // On réutilise ImageUploader mais en mode "une seule image" (le logo)
  const images = logoUrl ? [logoUrl] : [];
  return (
    <div>
      <label style={labelStyle}>Logo de la marque</label>
      <ImageUploader images={images} onChange={(imgs) => onChange(imgs[imgs.length - 1] || null)} />
    </div>
  );
}

// Formulaire d'édition — partagé entre la carte desktop et la ligne dépliable mobile.
function FormulaireMarque({ marque, onFerme }) {
  const router = useRouter();
  const [nom, setNom] = useState(marque.nom);
  const [remise, setRemise] = useState((marque.remise * 100).toString());
  const [actif, setActif] = useState(marque.actif);
  const [logoUrl, setLogoUrl] = useState(marque.logoUrl || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    const res = await updateMarque(marque.id, { nom, remise, actif, logoUrl });
    setSaving(false);
    if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2000); }
  };

  const remove = async () => {
    if (!confirm(`Supprimer la marque "${marque.nom}" ?`)) return;
    const res = await deleteMarque(marque.id);
    if (res.ok) { router.refresh(); if (onFerme) onFerme(); }
    else setError(res.error);
  };

  return (
    <>
      <div className="mq-champs">
        <div>
          <label style={labelStyle}>Nom</label>
          <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Remise revendeur (%)</label>
          <input style={inputStyle} value={remise} onChange={(e) => setRemise(e.target.value)} inputMode="decimal" />
          <p style={hint}>Remise accordée par le fournisseur. Sert au calcul du prix d'achat.</p>
        </div>
      </div>

      <div style={{ margin: "14px 0" }}>
        <LogoBlock logoUrl={logoUrl} onChange={setLogoUrl} />
      </div>

      {/* Interrupteur plutôt qu'une case à cocher : plus lisible et plus facile à toucher. */}
      <button
        type="button"
        onClick={() => setActif((a) => !a)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
          cursor: "pointer", marginBottom: 14, fontFamily: "inherit", textAlign: "left",
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#23262a" }}>Marque active</span>
          <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 1 }}>Visible sur le site</span>
        </span>
        <span style={{
          width: 42, height: 24, borderRadius: 999, flexShrink: 0, padding: "0 3px",
          background: actif ? "#f0661b" : "#d3d1c7",
          display: "flex", alignItems: "center", justifyContent: actif ? "flex-end" : "flex-start",
          transition: "background .15s",
        }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
        </span>
      </button>

      {error && <p style={{ fontSize: 12.5, color: "#d9551a", margin: "0 0 12px" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: "11px 22px", borderRadius: 10, background: saved ? "#249e7c" : "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
        <button onClick={remove} title="Supprimer la marque"
          style={{ width: 46, display: "grid", placeItems: "center", borderRadius: 10, border: "1px solid #f0d9d0", background: "#fff", color: "#d9551a", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" /></svg>
        </button>
      </div>
    </>
  );
}

// Ligne compacte dépliable — utilisée en mobile.
function MarqueLigne({ marque }) {
  const [ouverte, setOuverte] = useState(false);
  const nbProduits = marque._count?.produits ?? 0;

  return (
    <div style={{
      background: "#fff",
      border: "1px solid " + (ouverte ? "#f0c4a0" : "#ece8e0"),
      borderRadius: 12, overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      >
        <Vignette logoUrl={marque.logoUrl} nom={marque.nom} actif={marque.actif} />
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {marque.nom}
          </span>
          <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 2 }}>
            {nbProduits} produit{nbProduits > 1 ? "s" : ""} · remise {Math.round(marque.remise * 100)} %
          </span>
        </span>
        {!ouverte && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, flexShrink: 0,
            background: marque.actif ? "#e8f6f0" : "#f0ece4",
            color: marque.actif ? "#1f7a52" : "#5c616a",
          }}>
            {marque.actif ? "Active" : "Inactive"}
          </span>
        )}
        <span style={{ color: ouverte ? "#d9551a" : "#9aa0a8", display: "flex", flexShrink: 0, transform: ouverte ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      {ouverte && (
        <div style={{ borderTop: "1px solid #f2efe9", padding: 13 }}>
          <FormulaireMarque marque={marque} onFerme={() => setOuverte(false)} />
        </div>
      )}
    </div>
  );
}

// Carte complète — utilisée en desktop.
function MarqueCard({ marque }) {
  const nbProduits = marque._count?.produits ?? 0;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
        <Vignette logoUrl={marque.logoUrl} nom={marque.nom} actif={marque.actif} taille={46} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: 0 }}>{marque.nom}</p>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "2px 0 0" }}>{nbProduits} produit{nbProduits > 1 ? "s" : ""}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, flexShrink: 0,
          background: marque.actif ? "#e8f6f0" : "#f0ece4",
          color: marque.actif ? "#1f7a52" : "#5c616a",
        }}>
          {marque.actif ? "Active" : "Inactive"}
        </span>
      </div>

      <FormulaireMarque marque={marque} />
    </div>
  );
}

function NouvelleMarque({ compact = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [remise, setRemise] = useState("20");
  const [logoUrl, setLogoUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setSaving(true); setError("");
    const res = await createMarque({ nom, remise, actif: true, logoUrl });
    setSaving(false);
    if (res.ok) { setNom(""); setRemise("20"); setLogoUrl(null); setOpen(false); router.refresh(); }
    else setError(res.error);
  };

  if (!open) {
    // En mobile, un bandeau d'une ligne ; en desktop, la tuile carrée d'origine.
    if (compact) {
      return (
        <button onClick={() => setOpen(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 12, border: "1.5px dashed #e0dacf", background: "#faf8f4", cursor: "pointer", color: "#5c616a", fontFamily: "inherit" }}>
          <span style={{ color: "#d9551a", display: "flex" }}><Icon name="plus" size={16} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Ajouter une marque</span>
        </button>
      );
    }
    return (
      <button onClick={() => setOpen(true)}
        style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 200, border: "2px dashed #e0dacf", background: "#faf8f4", cursor: "pointer", color: "#5c616a", fontFamily: "inherit" }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center" }}>
          <Icon name="plus" size={22} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Ajouter une marque</span>
      </button>
    );
  }

  return (
    <div style={{ ...card, padding: compact ? 16 : 22 }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: "0 0 16px" }}>Nouvelle marque</p>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nom</label>
        <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Sokoa" autoFocus />
      </div>
      <div style={{ marginBottom: 16 }}>
        <LogoBlock logoUrl={logoUrl} onChange={setLogoUrl} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Remise revendeur (%)</label>
        <input style={inputStyle} value={remise} onChange={(e) => setRemise(e.target.value)} inputMode="decimal" />
        <p style={hint}>Remise accordée par le fournisseur. Sert au calcul du prix d'achat.</p>
      </div>
      {error && <p style={{ fontSize: 12.5, color: "#d9551a", margin: "0 0 12px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={create} disabled={saving} style={{ flex: 1, padding: "11px 22px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
          {saving ? "Création…" : "Créer"}
        </button>
        <button onClick={() => { setOpen(false); setError(""); }} style={{ padding: "11px 22px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export function MarquesManager({ marques }) {
  return (
    <div>
      <style>{`
        /* Sous 1024px : lignes compactes dépliables, champs en pleine largeur.
           Au-delà : la grille de cartes d'origine. */
        .mq-mobile { display: flex; flex-direction: column; gap: 8px; }
        .mq-desktop { display: none; }
        .mq-champs { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 1024px) {
          .mq-mobile { display: none; }
          .mq-desktop { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
          .mq-champs { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ═══ MOBILE ═══ */}
      <div className="mq-mobile">
        {marques.map((m) => (
          <MarqueLigne key={m.id} marque={m} />
        ))}
        <div style={{ marginTop: 4 }}>
          <NouvelleMarque compact />
        </div>
      </div>

      {/* ═══ DESKTOP ═══ */}
      <div className="mq-desktop">
        {marques.map((m) => (
          <MarqueCard key={m.id} marque={m} />
        ))}
        <NouvelleMarque />
      </div>
    </div>
  );
}