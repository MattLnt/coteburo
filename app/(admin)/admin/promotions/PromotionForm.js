"use client";
import { useState } from "react";
import { Icon } from "@/components/dashboard/Icon";
import { DatePicker } from "@/components/dashboard/DatePicker";

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 18, padding: 26 };

const CATEGORIES = [
  { value: "sieges", label: "Sièges & fauteuils" },
  { value: "bureaux", label: "Bureaux" },
  { value: "tables", label: "Tables de réunion" },
  { value: "rangements", label: "Rangements" },
  { value: "acoustique", label: "Acoustique" },
  { value: "accueil", label: "Mobilier d'accueil" },
];

const toInputDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";
  return date.toISOString().slice(0, 10);
};

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

export function PromotionForm({ initial, produits, onSubmit, onCancel, submitLabel }) {
  const [nom, setNom] = useState(initial?.nom || "");
  const [typeRemise, setTypeRemise] = useState(initial?.typeRemise || "pourcentage");
  const [valeur, setValeur] = useState(initial?.valeur?.toString() || "");
  const [dateDebut, setDateDebut] = useState(toInputDate(initial?.dateDebut));
  const [dateFin, setDateFin] = useState(toInputDate(initial?.dateFin));
  const [actif, setActif] = useState(initial?.actif ?? true);
  const [categories, setCategories] = useState(initial?.categories || []);
  const [produitsSel, setProduitsSel] = useState(initial?.produits?.map((p) => p.codeRacine) || []);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleCat = (v) => setCategories((c) => c.includes(v) ? c.filter((x) => x !== v) : [...c, v]);
  const toggleProd = (code) => setProduitsSel((p) => p.includes(code) ? p.filter((x) => x !== code) : [...p, code]);

  const filtered = search.trim()
    ? produits.filter((p) => (p.designation + " " + p.codeRacine + " " + (p.gamme || "")).toLowerCase().includes(search.toLowerCase())).slice(0, 60)
    : produits.slice(0, 40);

  const submit = async () => {
    setError("");
    if (!nom.trim()) { setError("Le nom est requis."); return; }
    if (!valeur || parseFloat(valeur) <= 0) { setError("La valeur de remise doit être supérieure à 0."); return; }
    if (categories.length === 0 && produitsSel.length === 0) { setError("Ciblez au moins une catégorie ou un produit."); return; }
    setSaving(true);
    const res = await onSubmit({ nom, typeRemise, valeur, dateDebut, dateFin, actif, categories, produits: produitsSel });
    setSaving(false);
    if (res && !res.ok) setError(res.error || "Erreur lors de l'enregistrement.");
  };

  return (
    <div>
      {/* Barre d'action collante */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 20px", marginBottom: 20, position: "sticky", top: 86, zIndex: 30 }}>
        <p style={{ fontSize: 13.5, color: "#5c616a", margin: 0 }}>
          {error ? <span style={{ color: "#d9551a", fontWeight: 600 }}>{error}</span> : "Configurez la campagne puis enregistrez."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {onCancel && (
            <button onClick={onCancel} type="button" style={{ padding: "11px 22px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Annuler
            </button>
          )}
          <button onClick={submit} disabled={saving} style={{ padding: "11px 26px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(240,102,27,0.28)", whiteSpace: "nowrap" }}>
            {saving ? "Enregistrement…" : (submitLabel || "Enregistrer")}
          </button>
        </div>
      </div>

      {/* Grille 2 colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }} className="promo-grid">
        <style>{`@media (max-width: 1024px){ .promo-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* COLONNE GAUCHE — Réglages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <CardHead icon="tag" title="Campagne" sub="Nom et type de remise." />
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Nom de la campagne</label>
              <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Soldes d'été" autoFocus />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Type de remise</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["pourcentage", "%"], ["montant", "€"]].map(([v, l]) => (
                    <button key={v} onClick={() => setTypeRemise(v)} type="button"
                      style={{ flex: 1, padding: "11px 10px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", border: typeRemise === v ? "1.5px solid #f0661b" : "1.5px solid #e8e3da", background: typeRemise === v ? "#fce6d6" : "#faf8f4", color: typeRemise === v ? "#d9551a" : "#5c616a" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Valeur {typeRemise === "montant" ? "(€)" : "(%)"}</label>
                <input style={inputStyle} value={valeur} onChange={(e) => setValeur(e.target.value)} inputMode="decimal" placeholder={typeRemise === "montant" ? "50" : "20"} />
              </div>
            </div>
          </div>

          <div style={card}>
            <CardHead icon="settings" title="Période & statut" sub="Quand la campagne s'applique." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Date de début</label>
                <DatePicker value={dateDebut} onChange={setDateDebut} />
              </div>
              <div>
                <label style={labelStyle}>Date de fin</label>
                <DatePicker value={dateFin} onChange={setDateFin} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 18px" }}>Laissez vide pour une promotion permanente.</p>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4" }}>
              <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a" }}>Campagne active</span>
            </label>
          </div>

          <div style={card}>
            <CardHead icon="layers" title="Catégories ciblées" sub="Toute la catégorie sera en promo." />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => toggleCat(c.value)}
                  style={{ padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", border: categories.includes(c.value) ? "1.5px solid #f0661b" : "1.5px solid #e8e3da", background: categories.includes(c.value) ? "#fce6d6" : "#faf8f4", color: categories.includes(c.value) ? "#d9551a" : "#5c616a" }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE — Produits ciblés */}
        <div style={{ ...card, display: "flex", flexDirection: "column", height: "100%" }}>
          <CardHead icon="box" title={`Produits ciblés — ${produitsSel.length} sélectionné${produitsSel.length > 1 ? "s" : ""}`} sub="Optionnel, en plus des catégories." />
          <input style={{ ...inputStyle, marginBottom: 12 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit par nom ou code…" />
          <div style={{ flex: 1, minHeight: 420, maxHeight: 640, overflowY: "auto", border: "1px solid #ece8e0", borderRadius: 12, background: "#faf8f4" }}>
            {filtered.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9aa0a8", padding: 20, margin: 0, textAlign: "center" }}>Aucun produit trouvé.</p>
            ) : filtered.map((p) => {
              const sel = produitsSel.includes(p.codeRacine);
              return (
                <label key={p.codeRacine} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", borderBottom: "1px solid #f0ece4", background: sel ? "#fff6f0" : "transparent" }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleProd(p.codeRacine)} style={{ width: 16, height: 16, accentColor: "#f0661b", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: "#23262a", lineHeight: 1.3 }}>{p.designation}</span>
                  <span style={{ fontSize: 11.5, color: "#9aa0a8", flexShrink: 0 }}>{p.codeRacine}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}