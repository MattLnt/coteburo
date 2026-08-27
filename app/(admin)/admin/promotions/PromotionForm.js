"use client";
import { useState } from "react";
import { Icon } from "@/components/dashboard/Icon";
import { DatePicker } from "@/components/dashboard/DatePicker";

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18 };

const CATEGORIES = [
  { value: "sieges", label: "Sièges & fauteuils", court: "Sièges" },
  { value: "bureaux", label: "Bureaux", court: "Bureaux" },
  { value: "tables", label: "Tables de réunion", court: "Tables" },
  { value: "rangements", label: "Rangements", court: "Rangements" },
  { value: "acoustique", label: "Acoustique", court: "Acoustique" },
  { value: "accueil", label: "Mobilier d'accueil", court: "Accueil" },
];

const toInputDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";
  return date.toISOString().slice(0, 10);
};

export function PromotionForm({ initial, produits, onSubmit, onCancel, submitLabel, titre }) {
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
  // Le sélecteur de produits est optionnel et occupe beaucoup de hauteur : replié par défaut.
  const [produitsOuvert, setProduitsOuvert] = useState(false);

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
      <style>{`
        /* Mobile : tout empilé, cibles produits repliables, boutons en fin de formulaire.
           Desktop : deux colonnes et sélecteur de produits toujours ouvert. */
        .pf-grille { display: flex; flex-direction: column; gap: 10px; }
        .pf-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pf-produits-entete { display: flex; }
        .pf-produits-corps { display: none; }
        .pf-produits-corps.ouvert { display: block; }
        .pf-liste { max-height: 320px; }
        @media (min-width: 1024px) {
          .pf-grille { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
          .pf-colonne { display: flex; flex-direction: column; gap: 20px; }
          .pf-produits-entete { display: none; }
          .pf-produits-corps { display: block; }
          .pf-liste { min-height: 420px; max-height: 640px; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ marginBottom: 14 }}>
        {onCancel && (
          <button onClick={onCancel} type="button"
            style={{ fontSize: 12.5, color: "#f0661b", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "inherit" }}>
            ← Retour aux campagnes
          </button>
        )}
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#23262a", margin: 0 }}>{titre || "Campagne"}</h2>
      </div>

      <div className="pf-grille">
        {/* COLONNE GAUCHE — Réglages */}
        <div className="pf-colonne" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={card}>
            <label style={labelStyle}>Nom de la campagne</label>
            <input style={{ ...inputStyle, marginBottom: 16 }} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Soldes d'été" autoFocus />

            <label style={labelStyle}>Remise</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {[["pourcentage", "%"], ["montant", "€"]].map(([v, l]) => (
                  <button key={v} onClick={() => setTypeRemise(v)} type="button"
                    style={{ width: 48, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: typeRemise === v ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                      background: typeRemise === v ? "#fce6d6" : "#faf8f4",
                      color: typeRemise === v ? "#d9551a" : "#5c616a" }}>
                    {l}
                  </button>
                ))}
              </div>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={valeur} onChange={(e) => setValeur(e.target.value)} inputMode="decimal" placeholder={typeRemise === "montant" ? "50" : "20"} />
            </div>
          </div>

          <div style={card}>
            <label style={labelStyle}>Période</label>
            <div className="pf-duo" style={{ marginBottom: 8 }}>
              <DatePicker value={dateDebut} onChange={setDateDebut} />
              <DatePicker value={dateFin} onChange={setDateFin} />
            </div>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 16px" }}>Laissez vide pour une promotion permanente.</p>

            <button
              type="button"
              onClick={() => setActif((a) => !a)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a" }}>Campagne active</span>
              <span style={{
                width: 42, height: 24, borderRadius: 999, flexShrink: 0, padding: "0 3px",
                background: actif ? "#f0661b" : "#d3d1c7",
                display: "flex", alignItems: "center", justifyContent: actif ? "flex-end" : "flex-start",
                transition: "background .15s",
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
              </span>
            </button>
          </div>

          <div style={card}>
            <label style={labelStyle}>Catégories ciblées</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map((c) => {
                const sel = categories.includes(c.value);
                return (
                  <button key={c.value} type="button" onClick={() => toggleCat(c.value)}
                    style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: sel ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      border: sel ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                      background: sel ? "#fce6d6" : "#faf8f4",
                      color: sel ? "#d9551a" : "#5c616a" }}>
                    {c.court}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "10px 0 0" }}>Toute la catégorie sera en promotion.</p>
          </div>
        </div>

        {/* COLONNE DROITE — Produits ciblés */}
        <div style={{ ...card, padding: 0, display: "flex", flexDirection: "column" }}>
          <button
            type="button"
            className="pf-produits-entete"
            onClick={() => setProduitsOuvert((v) => !v)}
            style={{ width: "100%", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
          >
            <span>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#23262a" }}>Produits ciblés</span>
              <span style={{ display: "block", fontSize: 11, color: "#9aa0a8", marginTop: 2 }}>
                {produitsSel.length} sélectionné{produitsSel.length > 1 ? "s" : ""} · optionnel
              </span>
            </span>
            <span style={{ color: produitsOuvert ? "#d9551a" : "#9aa0a8", display: "flex", flexShrink: 0, transform: produitsOuvert ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
            </span>
          </button>

          <div className={`pf-produits-corps${produitsOuvert ? " ouvert" : ""}`} style={{ padding: 16, paddingTop: 0 }}>
            <p style={{ ...labelStyle, marginTop: 16 }}>
              Produits ciblés — {produitsSel.length} sélectionné{produitsSel.length > 1 ? "s" : ""}
            </p>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" />
            <div className="pf-liste" style={{ overflowY: "auto", border: "1px solid #ece8e0", borderRadius: 12, background: "#faf8f4" }}>
              {filtered.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9aa0a8", padding: 20, margin: 0, textAlign: "center" }}>Aucun produit trouvé.</p>
              ) : filtered.map((p) => {
                const sel = produitsSel.includes(p.codeRacine);
                return (
                  <label key={p.codeRacine} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #f0ece4", background: sel ? "#fff6f0" : "transparent" }}>
                    <input type="checkbox" checked={sel} onChange={() => toggleProd(p.codeRacine)} style={{ width: 16, height: 16, accentColor: "#f0661b", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#23262a", lineHeight: 1.3 }}>{p.designation}</span>
                    <span style={{ fontSize: 11, color: "#9aa0a8", flexShrink: 0 }}>{p.codeRacine}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actions en fin de formulaire */}
      {error && (
        <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "11px 16px", borderRadius: 10, margin: "16px 0 0" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #ece8e0" }}>
        {onCancel && (
          <button onClick={onCancel} type="button"
            style={{ padding: "13px 22px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
            Annuler
          </button>
        )}
        <button onClick={submit} disabled={saving}
          style={{ flex: 1, padding: "13px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(240,102,27,0.28)", fontFamily: "inherit" }}>
          {saving ? "Enregistrement…" : (submitLabel || "Enregistrer")}
        </button>
      </div>
    </div>
  );
}