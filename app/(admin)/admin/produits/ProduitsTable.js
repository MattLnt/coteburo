"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import { FormSelect } from "@/components/dashboard/FormSelect";

const CAT_LABELS = {
  sieges: "Sièges", bureaux: "Bureaux", tables: "Tables",
  rangements: "Rangements", acoustique: "Acoustique", accueil: "Accueil",
};

const euro = (v) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

export function ProduitsTable({ produits, marques }) {
  const [q, setQ] = useState("");
  const [marque, setMarque] = useState("");
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState("");
  const [tri, setTri] = useState("designation-asc");

  const marqueOptions = [{ value: "", label: "Toutes les marques" }, ...marques.map((m) => ({ value: m.id, label: m.nom }))];
  const catOptions = [{ value: "", label: "Toutes les catégories" }, ...Object.entries(CAT_LABELS).map(([v, l]) => ({ value: v, label: l }))];
  const statutOptions = [
    { value: "", label: "Tous les statuts" },
    { value: "publie", label: "Publiés" },
    { value: "brouillon", label: "Brouillons" },
    { value: "promo", label: "En promotion" },
  ];
  const triOptions = [
    { value: "designation-asc", label: "Nom (A → Z)" },
    { value: "designation-desc", label: "Nom (Z → A)" },
    { value: "prix-asc", label: "Prix vente croissant" },
    { value: "prix-desc", label: "Prix vente décroissant" },
    { value: "recent", label: "Plus récents" },
    { value: "marge-desc", label: "Meilleure marge" },
  ];

  const filtered = useMemo(() => {
    let list = [...produits];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        p.designation?.toLowerCase().includes(term) ||
        p.codeRacine?.toLowerCase().includes(term) ||
        p.gamme?.toLowerCase().includes(term)
      );
    }
    if (marque) list = list.filter((p) => p.marqueId === marque);
    if (categorie) list = list.filter((p) => p.categorie === categorie);
    if (statut === "publie") list = list.filter((p) => p.publie);
    if (statut === "brouillon") list = list.filter((p) => !p.publie);
    if (statut === "promo") list = list.filter((p) => p.prixVenteHT != null && p.prixVenteHT < p.prixPublicHT);

    const marge = (p) => (p.prixVenteHT != null && p.prixAchatHT != null ? p.prixVenteHT - p.prixAchatHT : -Infinity);
    switch (tri) {
      case "designation-asc": list.sort((a, b) => (a.designation || "").localeCompare(b.designation || "")); break;
      case "designation-desc": list.sort((a, b) => (b.designation || "").localeCompare(a.designation || "")); break;
      case "prix-asc": list.sort((a, b) => (a.prixVenteHT ?? a.prixPublicHT) - (b.prixVenteHT ?? b.prixPublicHT)); break;
      case "prix-desc": list.sort((a, b) => (b.prixVenteHT ?? b.prixPublicHT) - (a.prixVenteHT ?? a.prixPublicHT)); break;
      case "recent": list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case "marge-desc": list.sort((a, b) => marge(b) - marge(a)); break;
    }
    return list;
  }, [produits, q, marque, categorie, statut, tri]);

  const resetFiltres = () => { setQ(""); setMarque(""); setCategorie(""); setStatut(""); setTri("designation-asc"); };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "0 14px 12px" };
  const td = { padding: "13px 14px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9" };

  return (
    <div>
      {/* Barre de filtres */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8" }}><Icon name="search" size={18} /></span>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, code ou gamme…"
            style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <FormSelect value={marque} onChange={setMarque} options={marqueOptions} />
          <FormSelect value={categorie} onChange={setCategorie} options={catOptions} />
          <FormSelect value={statut} onChange={setStatut} options={statutOptions} />
          <FormSelect value={tri} onChange={setTri} options={triOptions} />
        </div>
      </div>

      {/* Compteur + reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
          <strong style={{ color: "#23262a" }}>{filtered.length}</strong> produit{filtered.length > 1 ? "s" : ""}
          {filtered.length !== produits.length && <span style={{ color: "#9aa0a8" }}> sur {produits.length}</span>}
        </p>
        {(q || marque || categorie || statut) && (
          <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Réinitialiser</button>
        )}
      </div>

      {/* Tableau */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr>
                <th style={th}>Produit</th>
                <th style={th}>Marque</th>
                <th style={th}>Catégorie</th>
                <th style={{ ...th, textAlign: "right" }}>Achat HT</th>
                <th style={{ ...th, textAlign: "right" }}>Vente HT</th>
                <th style={{ ...th, textAlign: "right" }}>Marge</th>
                <th style={{ ...th, textAlign: "center" }}>Statut</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const marge = (p.prixVenteHT != null && p.prixAchatHT != null) ? p.prixVenteHT - p.prixAchatHT : null;
                return (
                  <tr key={p.codeRacine}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{p.designation}</div>
                      <div style={{ fontSize: 12, color: "#9aa0a8", marginTop: 2 }}>{p.codeRacine} · {p.gamme}</div>
                    </td>
                    <td style={{ ...td, color: "#5c616a" }}>{p.marque?.nom || "—"}</td>
                    <td style={{ ...td, color: "#5c616a" }}>{CAT_LABELS[p.categorie] || <span style={{ color: "#c4c0b6" }}>Non classé</span>}</td>
                    <td style={{ ...td, textAlign: "right", color: "#5c616a" }}>{euro(p.prixAchatHT)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{euro(p.prixVenteHT)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, color: marge == null ? "#c4c0b6" : marge >= 0 ? "#1f7a52" : "#d9551a" }}>{marge == null ? "—" : euro(marge)}</td>
                    <td style={{ ...td, textAlign: "center" }}><StatutBadge publie={p.publie} /></td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link href={`/admin/produits/${encodeURIComponent(p.codeRacine)}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid #e8e3da", color: "#23262a", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                        <Icon name="edit" size={14} /> Éditer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>
              {produits.length === 0 ? "Aucun produit dans le catalogue pour l'instant." : "Aucun produit ne correspond à ces filtres."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}