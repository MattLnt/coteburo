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

function MarqueCard({ marque }) {
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
    if (res.ok) router.refresh();
    else setError(res.error);
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {logoUrl ? (
            <span style={{ width: 46, height: 46, borderRadius: 11, background: "#faf8f4", border: "1px solid #ece8e0", display: "grid", placeItems: "center", overflow: "hidden" }}>
              <img src={logoUrl} alt={marque.nom} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </span>
          ) : (
            <span style={{ width: 46, height: 46, borderRadius: 11, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>
              {marque.nom[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: 0 }}>{marque.nom}</p>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "2px 0 0" }}>{marque._count?.produits ?? 0} produit{(marque._count?.produits ?? 0) > 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={remove} title="Supprimer" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #f0d9d0", background: "#fff", color: "#d9551a", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" /></svg>
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <LogoBlock logoUrl={logoUrl} onChange={setLogoUrl} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
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

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
        <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
        <span style={{ fontSize: 13.5, color: "#23262a" }}>Marque active (visible sur le site)</span>
      </label>

      {error && <p style={{ fontSize: 12.5, color: "#d9551a", margin: "0 0 12px" }}>{error}</p>}

      <button onClick={save} disabled={saving}
        style={{ padding: "10px 22px", borderRadius: 10, background: saved ? "#249e7c" : "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
      </button>
    </div>
  );
}

function NouvelleMarque() {
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
    return (
      <button onClick={() => setOpen(true)}
        style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 200, border: "2px dashed #e0dacf", background: "#faf8f4", cursor: "pointer", color: "#5c616a" }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center" }}>
          <Icon name="plus" size={22} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Ajouter une marque</span>
      </button>
    );
  }

  return (
    <div style={card}>
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
        <button onClick={create} disabled={saving} style={{ padding: "10px 22px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Création…" : "Créer"}
        </button>
        <button onClick={() => { setOpen(false); setError(""); }} style={{ padding: "10px 22px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export function MarquesManager({ marques }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
      {marques.map((m) => (
        <MarqueCard key={m.id} marque={m} />
      ))}
      <NouvelleMarque />
    </div>
  );
}