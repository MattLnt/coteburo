"use client";
import { useEffect, useMemo, useState } from "react";
import { filtrerProduitsAdmin } from "@/lib/catalogueAdmin";
import { chargerCatalogueProduitsLies } from "./actions";

// Une fiche n'en suggère jamais plus : au-delà, le bloc « Vous aimerez aussi »
// devient une seconde grille de catalogue.
const MAX_LIES = 6;

// Choix des produits suggérés sur une fiche.
//
// Reprend le chargeur et le filtrage du panneau « Ajouter un produit » du
// chiffrage de devis (lib/catalogueAdmin) — mêmes données, même règle de
// recherche. La présentation diffère : le devis choisit UN produit puis sa
// déclinaison et sa quantité, ici on en coche jusqu'à six.
export default function SelecteurProduitsLies({ vitrineId, gammeId, sousCategorieId, selectedIds, onChange }) {
  const [catalogue, setCatalogue] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [gammeFiltre, setGammeFiltre] = useState("");
  const [catFiltre, setCatFiltre] = useState("");
  const [sousCatFiltre, setSousCatFiltre] = useState("");

  useEffect(() => {
    let vivant = true;
    chargerCatalogueProduitsLies().then((c) => { if (vivant) setCatalogue(c); });
    return () => { vivant = false; };
  }, []);

  const catActive = catalogue?.categories.find((c) => c.id === catFiltre) || null;

  const resultats = useMemo(() => {
    const liste = filtrerProduitsAdmin(catalogue?.produits, {
      recherche,
      gammeId: gammeFiltre || null,
      categorieId: catFiltre || null,
      sousCategorieId: sousCatFiltre || null,
    }).filter((p) => p.id !== vitrineId); // une fiche ne se suggère pas elle-même

    // Ordre par défaut : même gamme d'abord, puis même sous-catégorie. C'est
    // presque toujours là que se trouve la suggestion pertinente.
    return [...liste].sort((a, b) => {
      const rang = (p) => (p.gammeId === gammeId ? 0 : p.sousCategorieId && p.sousCategorieId === sousCategorieId ? 1 : 2);
      const d = rang(a) - rang(b);
      return d !== 0 ? d : a.nom.localeCompare(b.nom, "fr");
    });
  }, [catalogue, recherche, gammeFiltre, catFiltre, sousCatFiltre, vitrineId, gammeId, sousCategorieId]);

  const choisis = selectedIds || [];
  const complet = choisis.length >= MAX_LIES;

  const basculer = (id) => {
    if (choisis.includes(id)) onChange(choisis.filter((x) => x !== id));
    else if (!complet) onChange([...choisis, id]);
  };

  const parId = useMemo(() => new Map((catalogue?.produits || []).map((p) => [p.id, p])), [catalogue]);

  const champ = { padding: "9px 11px", borderRadius: 9, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 13.5, color: "#23262a", outline: "none" };
  const puce = (actif) => ({ padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    border: "1px solid " + (actif ? "#f0661b" : "#ece8e0"), background: actif ? "#fef4ee" : "#fff", color: actif ? "#d9551a" : "#5c616a" });

  if (!catalogue) return <p style={{ fontSize: 13, color: "#9aa0a8" }}>Chargement du catalogue…</p>;

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>
        Les produits affichés sous la fiche, dans « Vous aimerez aussi ». {MAX_LIES} au maximum.
        Sans sélection, la fiche propose automatiquement des produits de la même gamme, puis de la même sous-catégorie.
      </p>

      {/* Sélection courante */}
      {choisis.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {choisis.map((id) => {
            const p = parId.get(id);
            return (
              <button key={id} type="button" onClick={() => basculer(id)}
                title="Retirer"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, border: "1px solid #f0d9a6", background: "#fef4ee", cursor: "pointer", fontSize: 12.5, color: "#23262a" }}>
                {p?.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 5 }} />}
                {p ? p.nom : id}
                <span style={{ color: "#9aa0a8" }}>✕</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un produit…" style={{ ...champ, flex: 1, minWidth: 180 }} />
        <select value={gammeFiltre} onChange={(e) => setGammeFiltre(e.target.value)} style={{ ...champ, maxWidth: 190 }}>
          <option value="">Toutes les gammes</option>
          {catalogue.gammes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={() => { setCatFiltre(""); setSousCatFiltre(""); }} style={puce(!catFiltre)}>Toutes catégories</button>
        {catalogue.categories.map((c) => (
          <button key={c.id} type="button" onClick={() => { setCatFiltre(c.id); setSousCatFiltre(""); }} style={puce(catFiltre === c.id)}>{c.nom}</button>
        ))}
      </div>

      {catActive && catActive.sousCategories.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
          <button type="button" onClick={() => setSousCatFiltre("")} style={puce(!sousCatFiltre)}>Toutes sous-catégories</button>
          {catActive.sousCategories.map((sc) => (
            <button key={sc.id} type="button" onClick={() => setSousCatFiltre(sc.id)} style={puce(sousCatFiltre === sc.id)}>{sc.nom}</button>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 8px" }}>
        {resultats.length} produit{resultats.length > 1 ? "s" : ""}
        {complet && <span style={{ color: "#d9551a", fontWeight: 600 }}> · maximum de {MAX_LIES} atteint</span>}
      </p>

      <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid #f0ece4", borderRadius: 12 }}>
        {resultats.length === 0 && (
          <p style={{ fontSize: 13, color: "#9aa0a8", padding: 16, margin: 0 }}>Aucun produit ne correspond.</p>
        )}
        {resultats.map((p) => {
          const actif = choisis.includes(p.id);
          const bloque = complet && !actif;
          return (
            <button key={p.id} type="button" onClick={() => basculer(p.id)} disabled={bloque}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "9px 12px",
                border: "none", borderBottom: "1px solid #f5f2ec", background: actif ? "#fef4ee" : "#fff",
                cursor: bloque ? "not-allowed" : "pointer", opacity: bloque ? 0.45 : 1 }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "grid", placeItems: "center",
                border: "1.5px solid " + (actif ? "#f0661b" : "#dcd6cc"), background: actif ? "#f0661b" : "#fff", color: "#fff", fontSize: 12 }}>
                {actif ? "✓" : ""}
              </span>
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
                : <span style={{ width: 34, height: 34, borderRadius: 6, background: "#f5f2ec", flexShrink: 0 }} />}
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, color: "#23262a", fontWeight: 600 }}>{p.nom}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8" }}>
                  {[p.gammeNom, p.sousCategorieNom || p.categorieNom].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
