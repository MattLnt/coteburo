"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import { FormSelect } from "@/components/dashboard/FormSelect";
import { toggleProduitFlag } from "./actions";

const CAT_LABELS = {
  sieges: "Sièges", bureaux: "Bureaux", tables: "Tables",
  rangements: "Rangements", acoustique: "Acoustique", accueil: "Accueil",
};

const euro = (v) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

function Check({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 22, height: 22, borderRadius: 6, cursor: disabled ? "default" : "pointer",
        border: checked ? "1.5px solid #f0661b" : "1.5px solid #d9d3c8",
        background: checked ? "#f0661b" : "#fff",
        display: "grid", placeItems: "center", opacity: disabled ? 0.5 : 1, transition: "all .12s",
      }}
    >
      {checked && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" /></svg>
      )}
    </button>
  );
}

export function ProduitsTable({ produits, marques }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [marque, setMarque] = useState("");
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState("");
  const [miseEnAvant, setMiseEnAvant] = useState("");
  const [tri, setTri] = useState("designation-asc");

  const marqueOptions = [{ value: "", label: "Toutes les marques" }, ...marques.map((m) => ({ value: m.id, label: m.nom }))];
  const catOptions = [{ value: "", label: "Toutes les catégories" }, ...Object.entries(CAT_LABELS).map(([v, l]) => ({ value: v, label: l }))];
  const statutOptions = [
    { value: "", label: "Tous les statuts" },
    { value: "publie", label: "Publiés" },
    { value: "brouillon", label: "Brouillons" },
    { value: "promo", label: "En promotion" },
  ];
  const miseEnAvantOptions = [
    { value: "", label: "Mise en avant : toutes" },
    { value: "bestSeller", label: "Meilleures ventes" },
    { value: "enAvant", label: "Dans la sélection" },
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
    if (statut === "promo") list = list.filter((p) => p._enPromo);
    if (miseEnAvant === "bestSeller") list = list.filter((p) => p.bestSeller);
    if (miseEnAvant === "enAvant") list = list.filter((p) => p.enAvant);

    const marge = (p) => (p._prixFinal != null && p.prixAchatHT != null ? p._prixFinal - p.prixAchatHT : -Infinity);
    switch (tri) {
      case "designation-asc": list.sort((a, b) => (a.designation || "").localeCompare(b.designation || "")); break;
      case "designation-desc": list.sort((a, b) => (b.designation || "").localeCompare(a.designation || "")); break;
      case "prix-asc": list.sort((a, b) => (a._prixFinal ?? a.prixPublicHT) - (b._prixFinal ?? b.prixPublicHT)); break;
      case "prix-desc": list.sort((a, b) => (b._prixFinal ?? b.prixPublicHT) - (a._prixFinal ?? a.prixPublicHT)); break;
      case "recent": list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case "marge-desc": list.sort((a, b) => marge(b) - marge(a)); break;
    }
    return list;
  }, [produits, q, marque, categorie, statut, miseEnAvant, tri]);

  const resetFiltres = () => { setQ(""); setMarque(""); setCategorie(""); setStatut(""); setMiseEnAvant(""); setTri("designation-asc"); };

  const toggle = (codeRacine, champ, valeurActuelle) => {
    startTransition(async () => {
      await toggleProduitFlag(codeRacine, champ, !valeurActuelle);
      router.refresh();
    });
  };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "18px 18px 14px", whiteSpace: "nowrap" };
  const td = { padding: "16px 18px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9", verticalAlign: "middle" };
  const tdNum = { ...td, textAlign: "right", whiteSpace: "nowrap" };

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
          <FormSelect value={miseEnAvant} onChange={setMiseEnAvant} options={miseEnAvantOptions} />
          <FormSelect value={tri} onChange={setTri} options={triOptions} />
        </div>
      </div>

      {/* Compteur + reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
          <strong style={{ color: "#23262a" }}>{filtered.length}</strong> produit{filtered.length > 1 ? "s" : ""}
          {filtered.length !== produits.length && <span style={{ color: "#9aa0a8" }}> sur {produits.length}</span>}
        </p>
        {(q || marque || categorie || statut || miseEnAvant) && (
          <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Réinitialiser</button>
        )}
      </div>

      {/* Tableau */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={th}>Produit</th>
                <th style={th}>Marque</th>
                <th style={th}>Catégorie</th>
                <th style={{ ...th, textAlign: "right" }}>Achat HT</th>
                <th style={{ ...th, textAlign: "right" }}>Prix vente HT</th>
                <th style={{ ...th, textAlign: "right" }}>Marge</th>
                <th style={{ ...th, textAlign: "center" }}>Best-seller</th>
                <th style={{ ...th, textAlign: "center" }}>Sélection</th>
                <th style={{ ...th, textAlign: "center" }}>Statut</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const prixFinal = p._prixFinal ?? p.prixPublicHT;
                const prixVenteNormal = p.prixVenteHT ?? p.prixPublicHT;
                const marge = (prixFinal != null && p.prixAchatHT != null) ? prixFinal - p.prixAchatHT : null;
                return (
                  <tr key={p.codeRacine}>
                    <td style={{ ...td, maxWidth: 340 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600 }}>{p.designation}</span>
                        {p._promoCampagne && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#7c3aed", padding: "2px 7px", borderRadius: 999, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>CAMPAGNE</span>
                        )}
                        {p._promoManuelle && !p._promoCampagne && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#f0661b", padding: "2px 7px", borderRadius: 999, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>PROMO</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#9aa0a8", marginTop: 3 }}>{p.codeRacine} · {p.gamme}</div>
                    </td>
                    <td style={{ ...td, color: "#5c616a" }}>{p.marque?.nom || "—"}</td>
                    <td style={{ ...td, color: "#5c616a" }}>{CAT_LABELS[p.categorie] || <span style={{ color: "#c4c0b6" }}>Non classé</span>}</td>
                    <td style={{ ...tdNum, color: "#5c616a" }}>{euro(p.prixAchatHT)}</td>
                    <td style={tdNum}>
                      {p._enPromo ? (
                        <div>
                          <div style={{ fontSize: 11.5, color: "#9aa0a8", textDecoration: "line-through" }}>{euro(prixVenteNormal)}</div>
                          <div style={{ fontWeight: 700, color: "#d9551a" }}>{euro(prixFinal)} <span style={{ fontSize: 11, fontWeight: 600 }}>−{p._promoPct}%</span></div>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{euro(prixFinal)}</span>
                      )}
                    </td>
                    <td style={{ ...tdNum, fontWeight: 600, color: marge == null ? "#c4c0b6" : marge >= 0 ? "#1f7a52" : "#d9551a" }}>{marge == null ? "—" : euro(marge)}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <Check checked={p.bestSeller} disabled={isPending} onChange={() => toggle(p.codeRacine, "bestSeller", p.bestSeller)} />
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <Check checked={p.enAvant} disabled={isPending} onChange={() => toggle(p.codeRacine, "enAvant", p.enAvant)} />
                      </div>
                    </td>
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