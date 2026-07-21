"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { updateReglages, sauverPaliersInstallation } from "./actions";

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 18, padding: 28 };

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

function uid() { return Math.random().toString(36).slice(2, 9); }

export function ReglagesForm({ reglages, paliersInitiaux }) {
  const router = useRouter();
  const [onglet, setOnglet] = useState("general");
  const [form, setForm] = useState({
    tva: (reglages.tva * 100).toString(),
    remiseGlobale: (reglages.remiseGlobale * 100).toString(),
    margeGlobale: ((reglages.margeGlobale ?? 0.3) * 100).toString(),
    telephone: reglages.telephone || "",
    email: reglages.email || "",
    adresse: reglages.adresse || "",
    horaires: reglages.horaires || "",
    zoneLivraison: reglages.zoneLivraison || "",
    delaiLivraison: reglages.delaiLivraison || "",
    francoPort: reglages.francoPort ?? "",
    seuilLivraisonGratuite: (reglages.seuilLivraisonGratuite ?? 500).toString(),
    fraisLivraison: (reglages.fraisLivraison ?? 59).toString(),
    bandeauActif: !!reglages.bandeauActif,
    bandeauTexte: reglages.bandeauTexte || "",
    instagram: reglages.instagram || "",
    facebook: reglages.facebook || "",
    linkedin: reglages.linkedin || "",
  });
  const [paliers, setPaliers] = useState(
    paliersInitiaux.length > 0
      ? paliersInitiaux.map((p) => ({ id: p.id, seuilMax: String(p.seuilMax), prix: String(p.prix) }))
      : [{ id: uid(), seuilMax: "", prix: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const majPalier = (id, champ, val) => {
    setPaliers((ps) => ps.map((p) => (p.id === id ? { ...p, [champ]: val } : p)));
    setSaved(false);
  };
  const ajouterPalier = () => { setPaliers((ps) => [...ps, { id: uid(), seuilMax: "", prix: "" }]); setSaved(false); };
  const supprimerPalier = (id) => { setPaliers((ps) => ps.filter((p) => p.id !== id)); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      updateReglages(form),
      sauverPaliersInstallation(paliers.filter((p) => p.seuilMax !== "" && p.prix !== "")),
    ]);
    setSaving(false);
    setSaved(true);
    router.refresh();
  };

  const tabs = [
    ["general", "Général", "home"],
    ["tarification", "Tarification", "euro"],
    ["livraison", "Livraison & Installation", "box"],
    ["bandeau", "Bandeau", "bell"],
    ["social", "Réseaux sociaux", "eye"],
  ];

  // Aperçu trié du barème, pour vérifier d'un coup d'œil qu'il n'y a pas de trou/chevauchement
  const paliersTries = [...paliers]
    .filter((p) => p.seuilMax !== "" && p.prix !== "")
    .map((p) => ({ ...p, seuilNum: parseFloat(p.seuilMax.replace(",", ".")) || 0 }))
    .sort((a, b) => a.seuilNum - b.seuilNum);

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

      {/* Barre d'onglets */}
      <div style={{ display: "flex", gap: 4, background: "#f0ece4", padding: 4, borderRadius: 12, marginBottom: 20, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map(([val, lbl, icon]) => (
          <button key={val} onClick={() => setOnglet(val)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
              background: onglet === val ? "#fff" : "transparent", color: onglet === val ? "#f0661b" : "#5c616a",
              boxShadow: onglet === val ? "0 1px 3px rgba(0,0,0,0.06)" : "none", whiteSpace: "nowrap" }}>
            <Icon name={icon} size={15} />
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Général ── */}
      {onglet === "general" && (
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
      )}

      {/* ── Tarification ── */}
      {onglet === "tarification" && (
        <div style={card}>
          <CardHead icon="euro" title="Tarification globale" sub="Valeurs par défaut du calcul des prix." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="TVA (%)" value={form.tva} onChange={(v) => set("tva", v)} placeholder="20" inputMode="decimal" hint="Calcul des prix TTC." />
            <Field label="Remise globale (%)" value={form.remiseGlobale} onChange={(v) => set("remiseGlobale", v)} placeholder="20" inputMode="decimal" hint="Promo Côté BURO sur ses prix." />
          </div>
          <Field label="Marge globale (%)" value={form.margeGlobale} onChange={(v) => set("margeGlobale", v)} placeholder="30" inputMode="decimal" hint="Ajoutée au prix catalogue pour pré-remplir le prix de vente des produits. Modifiable produit par produit ensuite." />
        </div>
      )}

      {/* ── Livraison & Installation ── */}
      {onglet === "livraison" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <CardHead icon="box" title="Livraison" sub="Appliquée au panier — calculée sur le montant TTC des produits." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <Field label="Frais de livraison (€ TTC)" value={form.fraisLivraison} onChange={(v) => set("fraisLivraison", v)} placeholder="59" inputMode="decimal" />
              <Field label="Gratuite à partir de (€ TTC)" value={form.seuilLivraisonGratuite} onChange={(v) => set("seuilLivraisonGratuite", v)} placeholder="500" inputMode="decimal" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <Field label="Zone de livraison" value={form.zoneLivraison} onChange={(v) => set("zoneLivraison", v)} placeholder="Région PACA" />
              <Field label="Délai" value={form.delaiLivraison} onChange={(v) => set("delaiLivraison", v)} placeholder="2 à 4 semaines" />
            </div>
            <Field label="Ancien champ « Franco de port » (€ HT)" value={form.francoPort} onChange={(v) => set("francoPort", v)} placeholder="500" inputMode="decimal" hint="Non utilisé dans le calcul du panier — remplacé par les champs ci-dessus. Conservé pour l'instant, peut être vidé." />
          </div>

          <div style={card}>
            <CardHead icon="settings" title="Paliers d'installation" sub="Le tarif dépend du montant TTC des produits commandés." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 10, marginBottom: 8, padding: "0 4px" }}>
              <span style={labelStyle}>Jusqu'à (€ TTC)</span>
              <span style={labelStyle}>Prix installation (€)</span>
              <span></span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {paliers.map((p) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 10, alignItems: "center" }}>
                  <input value={p.seuilMax} onChange={(e) => majPalier(p.id, "seuilMax", e.target.value)} placeholder="1500" inputMode="decimal" style={inputStyle} />
                  <input value={p.prix} onChange={(e) => majPalier(p.id, "prix", e.target.value)} placeholder="120" inputMode="decimal" style={inputStyle} />
                  <button onClick={() => supprimerPalier(p.id)} title="Supprimer"
                    style={{ width: 40, height: 40, borderRadius: 9, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 15 }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>

            <button onClick={ajouterPalier} type="button"
              style={{ padding: "10px 18px", borderRadius: 10, border: "1.5px dashed #e8e3da", background: "#faf8f4", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#5c616a" }}>
              + Ajouter un palier
            </button>

            {paliersTries.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #f2efe9" }}>
                <p style={{ ...labelStyle, marginBottom: 10 }}>Aperçu du barème appliqué</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {paliersTries.map((p, i) => {
                    const precedent = i > 0 ? paliersTries[i - 1].seuilNum : 0;
                    return (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#faf8f4", borderRadius: 8 }}>
                        <span style={{ color: "#5c616a" }}>De {precedent.toLocaleString("fr-FR")} € à {p.seuilNum.toLocaleString("fr-FR")} € TTC</span>
                        <span style={{ fontWeight: 700, color: "#23262a" }}>{p.prix} €</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#fef4ee", borderRadius: 8 }}>
                    <span style={{ color: "#b45528" }}>Au-delà de {paliersTries[paliersTries.length - 1].seuilNum.toLocaleString("fr-FR")} € TTC</span>
                    <span style={{ fontWeight: 700, color: "#b45528" }}>Sur devis</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bandeau ── */}
      {onglet === "bandeau" && (
        <div style={card}>
          <CardHead icon="bell" title="Bandeau d'annonce" sub="Le bandeau en haut du site." />
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4", marginBottom: 16 }}>
            <input type="checkbox" checked={form.bandeauActif} onChange={(e) => set("bandeauActif", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a" }}>Afficher le bandeau sur le site</span>
          </label>
          <Field label="Texte du bandeau" value={form.bandeauTexte} onChange={(v) => set("bandeauTexte", v)} placeholder="Showroom Aix-en-Provence — 645 rue Mayor de Montricher" />
        </div>
      )}

      {/* ── Réseaux sociaux ── */}
      {onglet === "social" && (
        <div style={card}>
          <CardHead icon="eye" title="Réseaux sociaux" sub="Liens affichés dans le pied de page." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }} className="reg-social">
            <style>{`@media (max-width: 768px){ .reg-social { grid-template-columns: 1fr !important; } }`}</style>
            <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="https://instagram.com/coteburo" />
            <Field label="Facebook" value={form.facebook} onChange={(v) => set("facebook", v)} placeholder="https://facebook.com/coteburo" />
            <Field label="LinkedIn" value={form.linkedin} onChange={(v) => set("linkedin", v)} placeholder="https://linkedin.com/company/coteburo" />
          </div>
        </div>
      )}
    </div>
  );
}