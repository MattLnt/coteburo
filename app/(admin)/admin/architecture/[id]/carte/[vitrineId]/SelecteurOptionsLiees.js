"use client";
import { useState, useEffect } from "react";
import { getOptionsDisponibles } from "./actions";

const fmt = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`);

// Sélecteur multi des produits-accessoires (catégories marquées "Accessoires").
// Contrôlé : selectedIds (tableau d'ids) + onChange(nouveauTableau).
export default function SelecteurOptionsLiees({ vitrineId, selectedIds, onChange }) {
  const [dispo, setDispo] = useState(null); // null = chargement
  const [q, setQ] = useState("");

  useEffect(() => {
    let vivant = true;
    getOptionsDisponibles(vitrineId).then((res) => { if (vivant) setDispo(res || []); });
    return () => { vivant = false; };
  }, [vitrineId]);

  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };
  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };

  const liste = (dispo || []).filter((o) => o.nom.toLowerCase().includes(q.trim().toLowerCase()));
  const selectionnes = (dispo || []).filter((o) => selectedIds.includes(o.id));

  return (
    <div style={card}>
      <label style={label}>Accessoires / options de ce produit</label>
      <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px", lineHeight: 1.6 }}>
        Coche les produits (des catégories « Accessoires ») à proposer en option sur la fiche de ce produit.
        Ils gardent leur propre prix, déclinaisons et finitions — modifie-les depuis leur propre fiche produit.
        Un accessoire coché reste aussi vendable seul dans la boutique.
      </p>

      {dispo === null ? (
        <p style={{ fontSize: 13.5, color: "#9aa0a8" }}>Chargement des accessoires…</p>
      ) : dispo.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", borderRadius: 12, padding: "14px 16px", lineHeight: 1.6 }}>
          Aucun produit-accessoire pour l'instant. Crée un produit (ex. « Extension / Retour »), assigne-lui une catégorie marquée « Accessoires », puis reviens ici pour le cocher.
        </div>
      ) : (
        <>
          {selectionnes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1f7a52", margin: "0 0 8px" }}>{selectionnes.length} accessoire{selectionnes.length > 1 ? "s" : ""} sélectionné{selectionnes.length > 1 ? "s" : ""}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectionnes.map((o) => (
                  <span key={o.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 8px", borderRadius: 999, background: "#e8f6f0", border: "1px solid #bfe3d3", fontSize: 13, color: "#1f5f43", fontWeight: 600 }}>
                    {o.image && <img src={o.image} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }} />}
                    {o.nom}
                    <button type="button" onClick={() => toggle(o.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#1f7a52", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un accessoire…"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
            {liste.map((o) => {
              const actif = selectedIds.includes(o.id);
              return (
                <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, cursor: "pointer", border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"), background: actif ? "#fef4ee" : "#fff" }}>
                  <input type="checkbox" checked={actif} onChange={() => toggle(o.id)} style={{ width: 18, height: 18, accentColor: "#f0661b", flexShrink: 0 }} />
                  <span style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", background: "#faf8f4", flexShrink: 0, display: "grid", placeItems: "center" }}>
                    {o.image ? <img src={o.image} alt={o.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#c4c0b8", fontSize: 11 }}>—</span>}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#23262a" }}>{o.nom}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#9aa0a8" }}>
                      {o.categorieNom}{!o.publie ? " · brouillon" : ""}
                    </span>
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#5c616a", whiteSpace: "nowrap" }}>
                    {o.prix != null ? `dès ${fmt(o.prix)}` : "—"}
                  </span>
                </label>
              );
            })}
            {liste.length === 0 && (
              <p style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>Aucun accessoire ne correspond.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}