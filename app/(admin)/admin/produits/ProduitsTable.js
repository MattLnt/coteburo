"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";
import NouveauProduitModal from "./NouveauProduitModal";
import { supprimerLigneProduit, toggleProduitPublie, renommerProduit } from "./actions";

const euro = (v) => (v == null ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
// Affiche une valeur unique, ou une fourchette min–max si les déclinaisons varient.
const plage = (min, max) => {
  if (min == null) return "—";
  if (max == null || max === min) return euro(min);
  return `${euro(min)} – ${euro(max)}`;
};

export function ProduitsTable({ lignes: lignesInit, gammes, margeGlobale }) {
  const [lignes, setLignes] = useState(lignesInit);
  const [vue, setVue] = useState("produits"); // "produits" | "declinaisons"
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const [statut, setStatut] = useState("");
  const [tri, setTri] = useState("nom-asc");
  const [modalOuverte, setModalOuverte] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [enCoursToggle, setEnCoursToggle] = useState(null);
  const [edition, setEdition] = useState(null); // { carteId, valeur } — renommage en cours

  const modeOptions = [
    { value: "", label: "Tous les modes" },
    { value: "boutique", label: "Boutique (avec prix)" },
    { value: "boutique-vide", label: "⚠ À compléter (sans prix)" },
    { value: "devis", label: "Sur devis" },
  ];
  const statutOptions = [
    { value: "", label: "Tous les statuts" },
    { value: "publie", label: "Publié seulement" },
    { value: "brouillon", label: "Brouillon seulement" },
  ];
  const triOptions = [
    { value: "nom-asc", label: "Nom (A → Z)" },
    { value: "nom-desc", label: "Nom (Z → A)" },
    { value: "prix-asc", label: "Prix croissant" },
    { value: "prix-desc", label: "Prix décroissant" },
    { value: "gamme", label: "Par gamme" },
  ];

  // Lignes filtrées (recherche / mode / statut) — base des deux vues
  const filtered = useMemo(() => {
    let list = [...lignes];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((l) =>
        l.nom?.toLowerCase().includes(term) ||
        l.sousLibelle?.toLowerCase().includes(term) ||
        l.reference?.toLowerCase().includes(term) ||
        l.gammeNom?.toLowerCase().includes(term) ||
        l.marqueNom?.toLowerCase().includes(term)
      );
    }
    if (mode) list = list.filter((l) => l.mode === mode);
    if (statut === "publie") list = list.filter((l) => l.publie);
    if (statut === "brouillon") list = list.filter((l) => !l.publie);
    return list;
  }, [lignes, q, mode, statut]);

  const trier = (list) => {
    const out = [...list];
    switch (tri) {
      case "nom-asc": out.sort((a, b) => a.nom.localeCompare(b.nom)); break;
      case "nom-desc": out.sort((a, b) => b.nom.localeCompare(a.nom)); break;
      case "prix-asc": out.sort((a, b) => (a.prix ?? Infinity) - (b.prix ?? Infinity)); break;
      case "prix-desc": out.sort((a, b) => (b.prix ?? -Infinity) - (a.prix ?? -Infinity)); break;
      case "gamme": out.sort((a, b) => a.gammeNom.localeCompare(b.gammeNom) || a.nom.localeCompare(b.nom)); break;
    }
    return out;
  };

  // Vue "Déclinaisons" : lignes triées telles quelles
  const declinaisonsAffichees = useMemo(() => trier(filtered), [filtered, tri]);

  // Vue "Produits" : une ligne par produit (carteId), agrégée (prix mini ET maxi)
  const produitsAffiches = useMemo(() => {
    const parProduit = new Map();
    for (const l of filtered) {
      let p = parProduit.get(l.carteId);
      if (!p) {
        p = {
          key: l.carteId,
          carteId: l.carteId,
          gammeId: l.gammeId,
          nom: l.nom,
          gammeNom: l.gammeNom,
          marqueNom: l.marqueNom,
          categorieNom: l.categorieNom,
          sousCategorieNom: l.sousCategorieNom,
          mode: l.mode,
          publie: l.publie,
          prix: null, prixMax: null,             // prix vente mini / maxi
          prixTarif: null, prixTarifMax: null,   // prix fournisseur mini / maxi
          nbDeclinaisons: 0,
          prixUnique: false,                     // produit vendu à prix fixe (sans déclinaisons)
        };
        parProduit.set(l.carteId, p);
      }
      if (l.declinaisonId) p.nbDeclinaisons += 1;
      // Une ligne boutique sans declinaisonId = produit à prix unique.
      if (l.mode === "boutique" && !l.declinaisonId) p.prixUnique = true;
      if (l.prix != null) {
        p.prix = p.prix == null ? l.prix : Math.min(p.prix, l.prix);
        p.prixMax = p.prixMax == null ? l.prix : Math.max(p.prixMax, l.prix);
      }
      if (l.prixTarif != null) {
        p.prixTarif = p.prixTarif == null ? l.prixTarif : Math.min(p.prixTarif, l.prixTarif);
        p.prixTarifMax = p.prixTarifMax == null ? l.prixTarif : Math.max(p.prixTarifMax, l.prixTarif);
      }
    }
    return trier([...parProduit.values()]);
  }, [filtered, tri]);

  const resetFiltres = () => { setQ(""); setMode(""); setStatut(""); setTri("nom-asc"); };

  // ── Renommage inline ──
  const sauverNom = () => {
    if (!edition) return;
    const { carteId, valeur } = edition;
    const nettoye = (valeur || "").trim();
    setEdition(null);
    if (!nettoye) return;
    const actuel = lignes.find((l) => l.carteId === carteId)?.nom;
    if (nettoye === actuel) return;
    // optimiste : on met à jour toutes les lignes de ce produit
    setLignes((ls) => ls.map((l) => (l.carteId === carteId ? { ...l, nom: nettoye } : l)));
    startTransition(async () => {
      const res = await renommerProduit(carteId, nettoye);
      if (!res?.ok) {
        setLignes((ls) => ls.map((l) => (l.carteId === carteId ? { ...l, nom: actuel } : l)));
      }
    });
  };

  // Fonction (pas un composant) — appelée inline pour que le champ reste le même
  // élément entre deux rendus, sinon le curseur saute à la fin à chaque frappe.
  const renderNom = (carteId, nom) => {
    if (edition?.carteId === carteId) {
      return (
        <input
          autoFocus
          value={edition.valeur}
          onChange={(e) => setEdition({ carteId, valeur: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); sauverNom(); }
            if (e.key === "Escape") { e.preventDefault(); setEdition(null); }
          }}
          onBlur={sauverNom}
          style={{ fontWeight: 600, fontSize: 13.5, padding: "5px 9px", borderRadius: 7, border: "1.5px solid #f0661b", background: "#fff", color: "#23262a", outline: "none", width: "100%", maxWidth: 320, boxSizing: "border-box" }}
        />
      );
    }
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
        <span style={{ fontWeight: 600 }}>{nom}</span>
        <button
          type="button"
          onClick={() => setEdition({ carteId, valeur: nom })}
          title="Renommer"
          style={{ flexShrink: 0, opacity: 0.45, background: "none", border: "none", cursor: "pointer", padding: 2, display: "inline-flex", color: "#9aa0a8" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.45)}
        >
          <Icon name="edit" size={13} />
        </button>
      </div>
    );
  };

  const confirmerSuppression = () => {
    if (!aSupprimer) return;
    startTransition(async () => {
      const res = await supprimerLigneProduit({
        mode: aSupprimer.supprimerProduit ? "produit-entier" : aSupprimer.mode,
        carteId: aSupprimer.carteId,
        declinaisonId: aSupprimer.declinaisonId,
      });
      if (res.ok) {
        setLignes((ls) =>
          aSupprimer.supprimerProduit
            ? ls.filter((l) => l.carteId !== aSupprimer.carteId)
            : ls.filter((l) => l.key !== aSupprimer.key)
        );
        setASupprimer(null);
      }
    });
  };

  const togglePublie = (ligne) => {
    const nouvelEtat = !ligne.publie;
    setEnCoursToggle(ligne.carteId);
    setLignes((ls) => ls.map((l) => (l.carteId === ligne.carteId ? { ...l, publie: nouvelEtat } : l)));
    startTransition(async () => {
      const res = await toggleProduitPublie(ligne.carteId, nouvelEtat);
      if (!res.ok) {
        setLignes((ls) => ls.map((l) => (l.carteId === ligne.carteId ? { ...l, publie: !nouvelEtat } : l)));
      }
      setEnCoursToggle(null);
    });
  };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "18px 18px 14px", whiteSpace: "nowrap" };
  const td = { padding: "16px 18px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9", verticalAlign: "middle" };
  const tdNum = { ...td, textAlign: "right", whiteSpace: "nowrap" };

  const badgeMode = (l) => {
    if (l.mode === "boutique") return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#e8f6f0", color: "#1f7a52" }}>Boutique</span>;
    if (l.mode === "boutique-vide") return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#fef4ee", color: "#b45528" }}>À compléter</span>;
    return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#eef1f6", color: "#3a6ea5" }}>Sur devis</span>;
  };

  const badgeMarque = (nom) => (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: "#23262a", color: "#fff", whiteSpace: "nowrap" }}>
      {nom}
    </span>
  );

  const celluleGamme = (l) => (
    <td style={td}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {l.marqueNom && badgeMarque(l.marqueNom)}
        <span>{l.gammeNom}</span>
      </div>
      {l.categorieNom ? (
        <div style={{ fontSize: 12, marginTop: 3 }}>
          <span style={{ color: "#5c616a", fontWeight: 600 }}>{l.categorieNom}</span>
          {l.sousCategorieNom && <span style={{ color: "#b0aca2" }}> › {l.sousCategorieNom}</span>}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#d9551a", marginTop: 3, fontWeight: 600 }}>⚠ Sans catégorie</div>
      )}
    </td>
  );

  const cellulePublie = (l) => (
    <td style={{ ...td, textAlign: "center" }}>
      <button
        onClick={() => togglePublie(l)}
        disabled={enCoursToggle === l.carteId}
        title={l.publie ? "Cliquer pour dépublier" : "Cliquer pour publier"}
        style={{
          padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: enCoursToggle === l.carteId ? "default" : "pointer",
          border: "1px solid " + (l.publie ? "#c6e8d8" : "#e8e3da"),
          background: l.publie ? "#e8f6f0" : "#f0ece4",
          color: l.publie ? "#1f7a52" : "#5c616a",
          opacity: enCoursToggle === l.carteId ? 0.6 : 1,
          display: "inline-flex", alignItems: "center", gap: 5,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: l.publie ? "#1f7a52" : "#9aa0a8", flexShrink: 0 }} />
        {enCoursToggle === l.carteId ? "…" : (l.publie ? "Publié" : "Brouillon")}
      </button>
    </td>
  );

  const boutonSwitch = (val, lbl) => (
    <button key={val} type="button" onClick={() => setVue(val)}
      style={{ padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
        background: vue === val ? "#fff" : "transparent", color: vue === val ? "#f0661b" : "#5c616a",
        boxShadow: vue === val ? "0 1px 3px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap" }}>
      {lbl}
    </button>
  );

  // Sous-libellé de la vue Produits : distingue prix unique, déclinaisons, devis et produit incomplet.
  const sousLibelleProduit = (p) => {
    if (p.mode === "devis") return "Sur devis";
    if (p.nbDeclinaisons > 0) return `${p.nbDeclinaisons} déclinaison${p.nbDeclinaisons > 1 ? "s" : ""}`;
    if (p.prixUnique) return "Prix unique";
    return "Aucune déclinaison";
  };

  const listeAffichee = vue === "produits" ? produitsAffiches : declinaisonsAffichees;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <button onClick={() => setModalOuverte(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 11, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 6px 16px -6px rgba(240,102,27,0.5)" }}>
          <Icon name="plus" size={17} />
          Nouveau produit
        </button>
      </div>

      {/* ── Bloc filtres réagencé ── */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        {/* Ligne 1 : switcher de vue */}
        <div style={{ display: "flex", gap: 4, background: "#f0ece4", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 14 }}>
          {boutonSwitch("produits", "Produits")}
          {boutonSwitch("declinaisons", "Déclinaisons")}
        </div>

        {/* Ligne 2 : recherche pleine largeur */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8" }}><Icon name="search" size={18} /></span>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, référence, gamme ou marque…"
            style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Ligne 3 : filtres alignés (labels + selects) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9aa0a8", marginBottom: 6 }}>Mode</span>
            <FormSelect value={mode} onChange={setMode} options={modeOptions} />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9aa0a8", marginBottom: 6 }}>Statut</span>
            <FormSelect value={statut} onChange={setStatut} options={statutOptions} />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#9aa0a8", marginBottom: 6 }}>Trier par</span>
            <FormSelect value={tri} onChange={setTri} options={triOptions} />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
          <strong style={{ color: "#23262a" }}>{listeAffichee.length}</strong>{" "}
          {vue === "produits"
            ? `produit${listeAffichee.length > 1 ? "s" : ""}`
            : `ligne${listeAffichee.length > 1 ? "s" : ""}`}
          <span style={{ color: "#9aa0a8" }}> · Marge active : {Math.round(margeGlobale * 100)}%</span>
        </p>
        {(q || mode || statut) && (
          <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Réinitialiser</button>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
            <thead>
              <tr>
                <th style={th}>Produit</th>
                <th style={th}>Gamme</th>
                <th style={{ ...th, textAlign: "right" }}>Prix fournisseur</th>
                <th style={{ ...th, textAlign: "right" }}>Prix vente</th>
                <th style={{ ...th, textAlign: "center" }}>Mode</th>
                <th style={{ ...th, textAlign: "center" }}>Statut</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {/* ── VUE PRODUITS ── */}
              {vue === "produits" && produitsAffiches.map((p) => (
                <tr key={p.key}>
                  <td style={{ ...td, maxWidth: 380 }}>
                    {renderNom(p.carteId, p.nom)}
                    <div style={{ fontSize: 12, color: "#9aa0a8", marginTop: 3 }}>
                      {sousLibelleProduit(p)}
                    </div>
                  </td>
                  {celluleGamme(p)}
                  <td style={tdNum}>
                    {p.prixTarif != null
                      ? <span style={{ color: "#9aa0a8" }}>{plage(p.prixTarif, p.prixTarifMax)}</span>
                      : <span style={{ color: "#c4c0b6" }}>—</span>}
                  </td>
                  <td style={tdNum}>
                    {p.prix != null
                      ? <span style={{ fontWeight: 700 }}>{plage(p.prix, p.prixMax)}</span>
                      : <span style={{ color: "#c4c0b6" }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{badgeMode(p)}</td>
                  {cellulePublie(p)}
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <Link href={`/admin/architecture/${p.gammeId}/carte/${p.carteId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid #e8e3da", color: "#23262a", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                        <Icon name="edit" size={14} /> Éditer
                      </Link>
                      <button onClick={() => setASupprimer({ ...p, supprimerProduit: true, declinaisonId: null })} title="Supprimer le produit"
                        style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", cursor: "pointer", color: "#c4735a" }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* ── VUE DÉCLINAISONS ── */}
              {vue === "declinaisons" && declinaisonsAffichees.map((l) => (
                <tr key={l.key}>
                  <td style={{ ...td, maxWidth: 380 }}>
                    {renderNom(l.carteId, l.nom)}
                    {l.sousLibelle && <div style={{ fontSize: 12, color: "#9aa0a8", marginTop: 3 }}>{l.sousLibelle}</div>}
                    {l.reference && (
                      <div style={{ fontSize: 11.5, color: "#5c616a", marginTop: 3, fontFamily: "monospace", fontWeight: 700 }}>Réf. {l.reference}</div>
                    )}
                  </td>
                  {celluleGamme(l)}
                  <td style={tdNum}>
                    {l.prixTarif != null ? <span style={{ color: "#9aa0a8" }}>{euro(l.prixTarif)}</span> : <span style={{ color: "#c4c0b6" }}>—</span>}
                  </td>
                  <td style={tdNum}>
                    {l.prix != null ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
                        {l.verrouille && <span title="Prix verrouillé — ne suit pas la marge globale" style={{ fontSize: 11 }}>🔒</span>}
                        {euro(l.prix)}
                      </span>
                    ) : <span style={{ color: "#c4c0b6" }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{badgeMode(l)}</td>
                  {cellulePublie(l)}
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <Link href={`/admin/architecture/${l.gammeId}/carte/${l.carteId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid #e8e3da", color: "#23262a", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                        <Icon name="edit" size={14} /> Éditer
                      </Link>
                      <button onClick={() => setASupprimer(l)} title="Supprimer"
                        style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", cursor: "pointer", color: "#c4735a" }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {listeAffichee.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>
              {lignes.length === 0 ? "Aucun produit dans le catalogue pour l'instant." : "Aucun résultat ne correspond à ces filtres."}
            </p>
          </div>
        )}
      </div>

      <NouveauProduitModal open={modalOuverte} onClose={() => setModalOuverte(false)} gammes={gammes} />

      {aSupprimer && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" style={{ position: "fixed" }}>
          <div onClick={() => setASupprimer(null)} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 440, borderRadius: 20, background: "#fff", border: "1px solid #ece8e0", padding: 26, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.35)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 10px" }}>
              {aSupprimer.supprimerProduit
                ? `Supprimer « ${aSupprimer.nom} » ?`
                : aSupprimer.mode === "boutique"
                  ? `Supprimer cette combinaison ?`
                  : `Supprimer « ${aSupprimer.nom} » ?`}
            </h2>
            <p style={{ fontSize: 13.5, color: "#5c616a", lineHeight: 1.6, marginBottom: 20 }}>
              {aSupprimer.supprimerProduit ? (
                <>Le produit <strong>{aSupprimer.nom}</strong> sera supprimé avec <strong>toutes ses déclinaisons</strong>, ses photos et sa description. Cette action est irréversible.</>
              ) : aSupprimer.mode === "boutique" ? (
                <>Seule la ligne <strong>{aSupprimer.sousLibelle || "cette combinaison"}</strong> sera retirée — le reste du produit « {aSupprimer.nom} » n'est pas affecté.</>
              ) : (
                <>Le produit entier sera supprimé, avec ses photos, sa description et son prix. Cette action est irréversible.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setASupprimer(null)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={confirmerSuppression} disabled={isPending}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#c4451f", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 13.5, fontWeight: 700 }}>
                {isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}