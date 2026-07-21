"use client";
import { useState } from "react";

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function OptionsInformatives({ groupes, onChange }) {
  const [saisieParGroupe, setSaisieParGroupe] = useState({});

  const ajouterGroupe = () => { onChange([...groupes, { id: uid(), nom: "", valeurs: [] }]); };
  const supprimerGroupe = (id) => { onChange(groupes.filter((x) => x.id !== id)); };
  const majNomGroupe = (id, nom) => { onChange(groupes.map((x) => (x.id === id ? { ...x, nom } : x))); };

  const ajouterValeur = (groupeId) => {
    const texte = (saisieParGroupe[groupeId] || "").trim();
    if (!texte) return;
    onChange(groupes.map((x) => (x.id === groupeId ? { ...x, valeurs: [...x.valeurs, texte] } : x)));
    setSaisieParGroupe((s) => ({ ...s, [groupeId]: "" }));
  };
  const supprimerValeur = (groupeId, idx) => {
    onChange(groupes.map((x) => (x.id === groupeId ? { ...x, valeurs: x.valeurs.filter((_, i) => i !== idx) } : x)));
  };

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };
  const input = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 15, color: "#23262a", outline: "none" };

  return (
    <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <label style={{ ...label, marginBottom: 4 }}>Description (sans impact prix)</label>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>
            Choix nécessaires pour la commande mais qui ne changent pas le tarif (ex : Façade → Porte / 2 portes / Tiroir · Accroche → Piètement gauche / droit).
          </p>
        </div>
        <button onClick={ajouterGroupe} style={{ padding: "8px 14px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>+ Ajouter un groupe</button>
      </div>

      {groupes.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#9aa0a8", fontSize: 14, border: "1px dashed #e8e3da", borderRadius: 12 }}>
          Aucun groupe. Ajoute-en un si ce produit a des choix nécessaires mais sans effet sur le prix.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {groupes.map((g) => (
          <div key={g.id} style={{ border: "1px solid #f0ece4", borderRadius: 12, padding: 16, background: "#fdfcfa" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <input value={g.nom} onChange={(e) => majNomGroupe(g.id, e.target.value)} placeholder="Nom du groupe (ex : Façade)"
                style={{ ...input, flex: 1, fontWeight: 600 }} />
              <button onClick={() => supprimerGroupe(g.id)} title="Supprimer le groupe"
                style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 15, flexShrink: 0 }}>🗑</button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: g.valeurs.length ? 12 : 0 }}>
              {g.valeurs.map((v, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 6px 6px 12px", borderRadius: 999, background: "#fce6d6", color: "#b45528", fontSize: 13, fontWeight: 600 }}>
                  {v}
                  <button onClick={() => supprimerValeur(g.id, i)} style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(180,85,40,0.15)", color: "#b45528", cursor: "pointer", fontSize: 11, lineHeight: 1, display: "grid", placeItems: "center" }}>✕</button>
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={saisieParGroupe[g.id] || ""}
                onChange={(e) => setSaisieParGroupe((s) => ({ ...s, [g.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterValeur(g.id); } }}
                placeholder="Ajouter une valeur (ex : Tiroir) puis Entrée"
                style={{ ...input, flex: 1, fontSize: 13.5, padding: "9px 12px" }}
              />
              <button onClick={() => ajouterValeur(g.id)} style={{ padding: "9px 16px", borderRadius: 9, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Ajouter</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}