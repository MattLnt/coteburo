"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// Initiales du client — prénom + nom, ou première lettre de l'email en secours.
const initiales = (c) => {
  const p = (c.prenom || "").trim().charAt(0);
  const n = (c.nom || "").trim().charAt(0);
  const ini = `${p}${n}`.toUpperCase();
  return ini || (c.email || "?").charAt(0).toUpperCase();
};

export function ClientsTable({ clients }) {
  const [q, setQ] = useState("");
  const [compte, setCompte] = useState("");
  const [tri, setTri] = useState("recent");
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const compteOptions = [
    { value: "", label: "Tous les clients" },
    { value: "avec", label: "Avec compte" },
    { value: "sans", label: "Sans compte (invité)" },
  ];
  const triOptions = [
    { value: "recent", label: "Dernière commande récente" },
    { value: "ancien", label: "Dernière commande ancienne" },
    { value: "depense-desc", label: "Total dépensé décroissant" },
    { value: "commandes-desc", label: "Nombre de commandes" },
  ];

  // Libellés courts pour les pastilles mobile — les libellés longs des selects
  // débordent sur un écran de téléphone.
  const compteCourt = { "": "Tous", avec: "Avec compte", sans: "Invité" };
  const triCourt = {
    recent: "Récents",
    ancien: "Anciens",
    "depense-desc": "Dépensé ↓",
    "commandes-desc": "Commandes ↓",
  };

  const filtered = useMemo(() => {
    let list = [...clients];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((c) =>
        c.email?.toLowerCase().includes(term) ||
        c.nom?.toLowerCase().includes(term) ||
        c.prenom?.toLowerCase().includes(term) ||
        c.societe?.toLowerCase().includes(term) ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(term)
      );
    }
    if (compte === "avec") list = list.filter((c) => c.possedeCompte);
    if (compte === "sans") list = list.filter((c) => !c.possedeCompte);

    switch (tri) {
      case "recent": list.sort((a, b) => new Date(b.dateDerniereCommande) - new Date(a.dateDerniereCommande)); break;
      case "ancien": list.sort((a, b) => new Date(a.dateDerniereCommande) - new Date(b.dateDerniereCommande)); break;
      case "depense-desc": list.sort((a, b) => b.totalDepense - a.totalDepense); break;
      case "commandes-desc": list.sort((a, b) => b.nbCommandes - a.nbCommandes); break;
    }
    return list;
  }, [clients, q, compte, tri]);

  const resetFiltres = () => { setQ(""); setCompte(""); setTri("recent"); };

  // Nombre de filtres réellement actifs (le tri par défaut ne compte pas).
  const nbFiltresActifs = (compte ? 1 : 0) + (tri !== "recent" ? 1 : 0);

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "16px 18px 13px", whiteSpace: "nowrap" };
  const td = { padding: "15px 18px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9", verticalAlign: "middle" };

  const champRecherche = (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8", display: "flex" }}><Icon name="search" size={18} /></span>
      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher par nom, email, société…"
        style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );

  const pastille = (actif, onClick, label) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      style={{
        fontSize: 12, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
        border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"),
        background: actif ? "#fce6d6" : "#faf8f4",
        color: actif ? "#d9551a" : "#5c616a",
        fontWeight: actif ? 700 : 500,
        fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  const badgeCompte = (possedeCompte) => (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
      background: possedeCompte ? "#e8f6f0" : "#f0ece4",
      color: possedeCompte ? "#1f7a52" : "#5c616a",
    }}>
      {possedeCompte ? "Compte" : "Invité"}
    </span>
  );

  const boutonVoir = (email, plein = false) => (
    <Link
      href={`/admin/clients/${encodeURIComponent(email)}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: plein ? "8px 16px" : "7px 13px",
        borderRadius: plein ? 10 : 9,
        border: "1px solid #e8e3da",
        background: plein ? "#faf8f4" : "transparent",
        color: "#23262a", textDecoration: "none", fontSize: 12.5, fontWeight: 600,
      }}
    >
      <Icon name="eye" size={14} /> Voir
    </Link>
  );

  const messageVide = clients.length === 0
    ? "Aucun client pour l'instant."
    : "Aucun client ne correspond à ces filtres.";

  return (
    <div>
      <style>{`
        /* Sous 1024px : recherche seule + filtres repliables, liste en cartes.
           Au-delà : l'affichage d'origine (carte de filtres + tableau). */
        .cli-mobile { display: block; }
        .cli-desktop { display: none; }
        @media (min-width: 1024px) {
          .cli-mobile { display: none; }
          .cli-desktop { display: block; }
        }
      `}</style>

      {/* ═══ MOBILE ═══ */}
      <div className="cli-mobile">
        <div style={{ marginBottom: 8 }}>{champRecherche}</div>

        <div style={{
          border: "1px solid " + (filtresOuverts ? "#f0c4a0" : "#ece8e0"),
          borderRadius: 12, background: "#fff", marginBottom: 12, overflow: "hidden",
        }}>
          <button
            type="button"
            onClick={() => setFiltresOuverts((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 13px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: filtresOuverts ? "#d9551a" : "#5c616a", display: "flex" }}><Icon name="filter" size={17} /></span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a" }}>Filtres</span>
              {nbFiltresActifs > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fce6d6", color: "#d9551a" }}>
                  {nbFiltresActifs}
                </span>
              )}
            </span>
            <span style={{ color: filtresOuverts ? "#d9551a" : "#9aa0a8", display: "flex", transform: filtresOuverts ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              <Icon name="chevron-down" size={16} />
            </span>
          </button>

          {filtresOuverts && (
            <div style={{ padding: "0 13px 14px", borderTop: "1px solid #f2efe9" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9aa0a8", margin: "12px 0 7px" }}>Type de client</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {compteOptions.map((o) => pastille(compte === o.value, () => setCompte(o.value), compteCourt[o.value] || o.label))}
              </div>

              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9aa0a8", margin: "0 0 7px" }}>Trier par</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {triOptions.map((o) => pastille(tri === o.value, () => setTri(o.value), triCourt[o.value] || o.label))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
          <p style={{ fontSize: 12.5, color: "#5c616a", margin: 0 }}>
            <strong style={{ color: "#23262a" }}>{filtered.length}</strong> client{filtered.length > 1 ? "s" : ""}
            {filtered.length !== clients.length && <span style={{ color: "#9aa0a8" }}> sur {clients.length}</span>}
          </p>
          {(q || compte || tri !== "recent") && (
            <button onClick={resetFiltres} style={{ fontSize: 12.5, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Réinitialiser</button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((c) => (
            <div key={c.email} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 15px" }}>
              {/* Avatar centré verticalement avec le bloc nom/société */}
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                <span style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13.5, lineHeight: 1,
                  background: c.possedeCompte ? "#fce6d6" : "#f0ece4",
                  color: c.possedeCompte ? "#d9551a" : "#5c616a",
                }}>
                  {initiales(c)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.prenom} {c.nom}
                  </p>
                  {c.societe && (
                    <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.societe}
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>{badgeCompte(c.possedeCompte)}</div>
              </div>

              <div style={{ padding: "10px 0", borderTop: "1px solid #f2efe9", borderBottom: "1px solid #f2efe9", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: c.telephone ? 5 : 0 }}>
                  <span style={{ color: "#9aa0a8", display: "flex", flexShrink: 0 }}><Icon name="mail" size={14} /></span>
                  <span style={{ fontSize: 12.5, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</span>
                </div>
                {c.telephone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#9aa0a8", display: "flex", flexShrink: 0 }}><Icon name="phone" size={14} /></span>
                    <span style={{ fontSize: 12.5, color: "#23262a" }}>{c.telephone}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Commandes</p>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a", margin: "1px 0 0" }}>{c.nbCommandes}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Dernière</p>
                  <p style={{ fontSize: 12.5, color: "#23262a", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dateFR(c.dateDerniereCommande)}</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Total dépensé</p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#23262a", margin: "1px 0 0" }}>{euro(c.totalDepense)}</p>
                </div>
                {boutonVoir(c.email, true)}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>{messageVide}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ DESKTOP ═══ */}
      <div className="cli-desktop">
        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <div style={{ marginBottom: 14 }}>{champRecherche}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <FormSelect value={compte} onChange={setCompte} options={compteOptions} />
            <FormSelect value={tri} onChange={setTri} options={triOptions} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
          <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
            <strong style={{ color: "#23262a" }}>{filtered.length}</strong> client{filtered.length > 1 ? "s" : ""}
            {filtered.length !== clients.length && <span style={{ color: "#9aa0a8" }}> sur {clients.length}</span>}
          </p>
          {(q || compte) && (
            <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Réinitialiser</button>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={th}>Client</th>
                  <th style={th}>Contact</th>
                  <th style={{ ...th, textAlign: "center" }}>Compte</th>
                  <th style={{ ...th, textAlign: "center" }}>Commandes</th>
                  <th style={{ ...th, textAlign: "right" }}>Total dépensé</th>
                  <th style={th}>Dernière commande</th>
                  <th style={{ ...th, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.email}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{c.prenom} {c.nom}</div>
                      {c.societe && <div style={{ fontSize: 12, color: "#9aa0a8" }}>{c.societe}</div>}
                    </td>
                    <td style={td}>
                      <div>{c.email}</div>
                      {c.telephone && <div style={{ fontSize: 12, color: "#9aa0a8" }}>{c.telephone}</div>}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>{badgeCompte(c.possedeCompte)}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 600 }}>{c.nbCommandes}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{euro(c.totalDepense)}</td>
                    <td style={{ ...td, color: "#5c616a", whiteSpace: "nowrap" }}>{dateFR(c.dateDerniereCommande)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{boutonVoir(c.email)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>{messageVide}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}