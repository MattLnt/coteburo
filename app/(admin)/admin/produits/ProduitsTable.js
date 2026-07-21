"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";
import NouveauProduitModal from "./NouveauProduitModal";

const euro = (v) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

export function ProduitsTable({ lignes, gammes }) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const [tri, setTri] = useState("nom-asc");
  const [modalOuverte, setModalOuverte] = useState(false);

  const modeOptions = [
    { value: "", label: "Tous les modes" },
    { value: "boutique", label: "Boutique (avec prix)" },
    { value: "boutique-vide", label: "Boutique — à compléter" },
    { value: "devis", label: "Sur devis" },
  ];
  const triOptions = [
    { value: "nom-asc", label: "Nom (A → Z)" },
    { value: "nom-desc", label: "Nom (Z → A)" },
    { value: "prix-asc", label: "Prix croissant" },
    { value: "prix-desc", label: "Prix décroissant" },
    { value: "gamme", label: "Par gamme" },
  ];

  const filtered = useMemo(() => {
    let list = [...lignes];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((l) =>
        l.nom?.toLowerCase().includes(term) ||
        l.sousLibelle?.toLowerCase().includes(term) ||
        l.gammeNom?.toLowerCase().includes(term)
      );
    }
    if (mode) list = list.filter((l) => l.mode === mode);

    switch (tri) {
      case "nom-asc": list.sort((a, b) => a.nom.localeCompare(b.nom)); break;
      case "nom-desc": list.sort((a, b) => b.nom.localeCompare(a.nom)); break;
      case "prix-asc": list.sort((a, b) => (a.prix ?? Infinity) - (b.prix ?? Infinity)); break;
      case "prix-desc": list.sort((a, b) => (b.prix ?? -Infinity) - (a.prix ?? -Infinity)); break;
      case "gamme": list.sort((a, b) => a.gammeNom.localeCompare(b.gammeNom) || a.nom.localeCompare(b.nom)); break;
    }
    return list;
  }, [lignes, q, mode, tri]);

  const resetFiltres = () => { setQ(""); setMode(""); setTri("nom-asc"); };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "18px 18px 14px", whiteSpace: "nowrap" };
  const td = { padding: "16px 18px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9", verticalAlign: "middle" };
  const tdNum = { ...td, textAlign: "right", whiteSpace: "nowrap" };

  const badgeMode = (l) => {
    if (l.mode === "boutique") return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#e8f6f0", color: "#1f7a52" }}>Boutique</span>;
    if (l.mode === "boutique-vide") return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#fef4ee", color: "#b45528" }}>À compléter</span>;
    return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#eef1f6", color: "#3a6ea5" }}>Sur devis</span>;
  };

  return (
    <div>
      {/* Bouton nouveau produit */}
      <div style={{ marginBottom: 18 }}>
        <button onClick={() => setModalOuverte(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 11, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 6px 16px -6px rgba(240,102,27,0.5)" }}>
          <Icon name="plus" size={17} />
          Nouveau produit
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8" }}><Icon name="search" size={18} /></span>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom ou gamme…"
            style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <FormSelect value={mode} onChange={setMode} options={modeOptions} />
          <FormSelect value={tri} onChange={setTri} options={triOptions} />
        </div>
      </div>

      {/* Compteur + reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
          <strong style={{ color: "#23262a" }}>{filtered.length}</strong> ligne{filtered.length > 1 ? "s" : ""}
          {filtered.length !== lignes.length && <span style={{ color: "#9aa0a8" }}> sur {lignes.length}</span>}
        </p>
        {(q || mode) && (
          <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Réinitialiser</button>
        )}
      </div>

      {/* Tableau */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Produit</th>
                <th style={th}>Gamme</th>
                <th style={{ ...th, textAlign: "right" }}>Prix HT</th>
                <th style={{ ...th, textAlign: "center" }}>Mode</th>
                <th style={{ ...th, textAlign: "center" }}>Statut</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.key}>
                  <td style={{ ...td, maxWidth: 380 }}>
                    <div style={{ fontWeight: 600 }}>{l.nom}</div>
                    {l.sousLibelle && <div style={{ fontSize: 12, color: "#9aa0a8", marginTop: 3 }}>{l.sousLibelle}</div>}
                  </td>
                  <td style={td}>
                    <div>{l.gammeNom}</div>
                    {l.categorieNom ? (
                      <div style={{ fontSize: 12, marginTop: 3 }}>
                        <span style={{ color: "#5c616a", fontWeight: 600 }}>{l.categorieNom}</span>
                        {l.sousCategorieNom && (
                          <span style={{ color: "#b0aca2" }}> › {l.sousCategorieNom}</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#d9551a", marginTop: 3, fontWeight: 600 }}>⚠ Sans catégorie</div>
                    )}
                  </td>
                  <td style={tdNum}>
                    {l.prix != null ? <span style={{ fontWeight: 600 }}>{euro(l.prix)}</span> : <span style={{ color: "#c4c0b6" }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{badgeMode(l)}</td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: l.publie ? "#e8f6f0" : "#f0ece4", color: l.publie ? "#1f7a52" : "#5c616a" }}>
                      {l.publie ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/admin/architecture/${l.gammeId}/carte/${l.carteId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid #e8e3da", color: "#23262a", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                      <Icon name="edit" size={14} /> Éditer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>
              {lignes.length === 0 ? "Aucun produit dans le catalogue pour l'instant." : "Aucune ligne ne correspond à ces filtres."}
            </p>
          </div>
        )}
      </div>

      <NouveauProduitModal open={modalOuverte} onClose={() => setModalOuverte(false)} gammes={gammes} />
    </div>
  );
}