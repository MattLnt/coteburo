"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { updateReglages } from "./actions";

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 18, padding: 28, height: "100%" };

function CardHead({ icon, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #f2efe9" }}>
      <span style={{ width: 42, height: 42, borderRadius: 11, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={20} />
      </span>
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: 0, lineHeight: 1.1 }}>{title}</h3>
        <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "2px 0 0" }}>{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint, ...rest }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...rest} />
      {hint && <p style={{ fontSize: 12, color: "#9aa0a8", margin: "6px 0 0" }}>{hint}</p>}
    </div>
  );
}

export function ReglagesForm({ reglages }) {
  const router = useRouter();
  const [form, setForm] = useState({
    tva: (reglages.tva * 100).toString(),
    remiseGlobale: (reglages.remiseGlobale * 100).toString(),
    telephone: reglages.telephone || "",
    email: reglages.email || "",
    adresse: reglages.adresse || "",
    horaires: reglages.horaires || "",
    zoneLivraison: reglages.zoneLivraison || "",
    delaiLivraison: reglages.delaiLivraison || "",
    francoPort: reglages.francoPort ?? "",
    bandeauActif: !!reglages.bandeauActif,
    bandeauTexte: reglages.bandeauTexte || "",
    instagram: reglages.instagram || "",
    facebook: reglages.facebook || "",
    linkedin: reglages.linkedin || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    await updateReglages(form);
    setSaving(false);
    setSaved(true);
    router.refresh();
  };

  return (
    <div>
      {/* Barre d'action fixe en haut */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 20px", marginBottom: 20, position: "sticky", top: 86, zIndex: 30 }}>
        <p style={{ fontSize: 13.5, color: "#5c616a", margin: 0 }}>
          {saved ? <span style={{ color: "#1f7a52", fontWeight: 600 }}>✓ Modifications enregistrées</span> : "Modifiez les paramètres puis enregistrez."}
        </p>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: "11px 26px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(240,102,27,0.28)", whiteSpace: "nowrap" }}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {/* Grille 2 colonnes pleine largeur */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20, alignItems: "start" }} className="reg-grid">
        <style>{`@media (max-width: 1024px){ .reg-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Coordonnées */}
        <div style={card}>
          <CardHead icon="home" title="Coordonnées" sub="En-tête, pied de page et contact." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Téléphone" value={form.telephone} onChange={(v) => set("telephone", v)} placeholder="06 20 39 13 90" />
            <Field label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="coteburo@orange.fr" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Field label="Adresse du showroom" value={form.adresse} onChange={(v) => set("adresse", v)} placeholder="TECH'INDUS Bât D, 645 rue Mayor de Montricher, 13290 Aix-en-Provence" />
          </div>
          <Field label="Horaires" value={form.horaires} onChange={(v) => set("horaires", v)} placeholder="Du lundi au vendredi · 9h–18h" />
        </div>

        {/* Tarification */}
        <div style={card}>
          <CardHead icon="euro" title="Tarification globale" sub="Valeurs par défaut du calcul des prix." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="TVA (%)" value={form.tva} onChange={(v) => set("tva", v)} placeholder="20" inputMode="decimal" hint="Calcul des prix TTC." />
            <Field label="Remise globale (%)" value={form.remiseGlobale} onChange={(v) => set("remiseGlobale", v)} placeholder="20" inputMode="decimal" hint="Sur le tarif public." />
          </div>
        </div>

        {/* Livraison */}
        <div style={card}>
          <CardHead icon="box" title="Livraison" sub="Affiché sur les fiches et au panier." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Zone de livraison" value={form.zoneLivraison} onChange={(v) => set("zoneLivraison", v)} placeholder="Région PACA" />
            <Field label="Délai" value={form.delaiLivraison} onChange={(v) => set("delaiLivraison", v)} placeholder="2 à 4 semaines" />
          </div>
          <Field label="Franco de port à partir de (€ HT)" value={form.francoPort} onChange={(v) => set("francoPort", v)} placeholder="500" inputMode="decimal" hint="Laisser vide si non applicable." />
        </div>

        {/* Bandeau */}
        <div style={card}>
          <CardHead icon="bell" title="Bandeau d'annonce" sub="Le bandeau en haut du site." />
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4", marginBottom: 16 }}>
            <input type="checkbox" checked={form.bandeauActif} onChange={(e) => set("bandeauActif", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a" }}>Afficher le bandeau sur le site</span>
          </label>
          <Field label="Texte du bandeau" value={form.bandeauTexte} onChange={(v) => set("bandeauTexte", v)} placeholder="Showroom Aix-en-Provence — 645 rue Mayor de Montricher" />
        </div>

        {/* Réseaux sociaux — pleine largeur */}
        <div style={{ ...card, gridColumn: "1 / -1" }}>
          <CardHead icon="eye" title="Réseaux sociaux" sub="Liens affichés dans le pied de page." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }} className="reg-social">
            <style>{`@media (max-width: 768px){ .reg-social { grid-template-columns: 1fr !important; } }`}</style>
            <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="https://instagram.com/coteburo" />
            <Field label="Facebook" value={form.facebook} onChange={(v) => set("facebook", v)} placeholder="https://facebook.com/coteburo" />
            <Field label="LinkedIn" value={form.linkedin} onChange={(v) => set("linkedin", v)} placeholder="https://linkedin.com/company/coteburo" />
          </div>
        </div>
      </div>
    </div>
  );
}