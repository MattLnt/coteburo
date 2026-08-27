"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { StatutCommande, STATUTS } from "@/components/dashboard/StatutCommande";
import { FormSelect } from "@/components/dashboard/FormSelect";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function CommandesTable({ commandes }) {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [tri, setTri] = useState("recent");

  const statutOptions = [
    { value: "", label: "Tous les statuts" },
    ...Object.entries(STATUTS).map(([v, s]) => ({ value: v, label: s.label })),
  ];
  const triOptions = [
    { value: "recent", label: "Plus récentes" },
    { value: "ancien", label: "Plus anciennes" },
    { value: "montant-desc", label: "Montant décroissant" },
    { value: "montant-asc", label: "Montant croissant" },
  ];

  const filtered = useMemo(() => {
    let list = [...commandes];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((c) =>
        c.numero?.toLowerCase().includes(term) ||
        c.nom?.toLowerCase().includes(term) ||
        c.prenom?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(term)
      );
    }
    if (statut) list = list.filter((c) => c.statut === statut);

    switch (tri) {
      case "recent": list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case "ancien": list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case "montant-desc": list.sort((a, b) => b.totalTTC - a.totalTTC); break;
      case "montant-asc": list.sort((a, b) => a.totalTTC - b.totalTTC); break;
    }
    return list;
  }, [commandes, q, statut, tri]);

  const resetFiltres = () => { setQ(""); setStatut(""); setTri("recent"); };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "16px 18px 13px", whiteSpace: "nowrap" };
  const td = { padding: "15px 18px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9", verticalAlign: "middle" };

  const boutonDetail = (id, plein = false) => (
    <Link
      href={`/admin/commandes/${id}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: plein ? "8px 16px" : "7px 13px",
        borderRadius: plein ? 10 : 9,
        border: "1px solid #e8e3da",
        background: plein ? "#faf8f4" : "transparent",
        color: "#23262a", textDecoration: "none", fontSize: 12.5, fontWeight: 600,
      }}
    >
      <Icon name="eye" size={14} /> Détail
    </Link>
  );

  // Une valeur de la bande centrale des cartes mobile (mini-label + valeur)
  const infoCarte = (label, valeur, aligne = "left") => (
    <div style={{ flex: 1, minWidth: 0, textAlign: aligne }}>
      <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 12.5, color: "#23262a", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{valeur}</p>
    </div>
  );

  return (
    <div>
      <style>{`
        /* En dessous de 1024px : cartes empilées. Au-dessus : tableau classique. */
        .cmd-cartes { display: flex; flex-direction: column; gap: 10px; }
        .cmd-tableau { display: none; }
        @media (min-width: 1024px) {
          .cmd-cartes { display: none; }
          .cmd-tableau { display: block; }
        }
      `}</style>

      {/* Filtres */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8", display: "flex" }}><Icon name="search" size={18} /></span>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par numéro, nom, email…"
            style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <FormSelect value={statut} onChange={setStatut} options={statutOptions} />
          <FormSelect value={tri} onChange={setTri} options={triOptions} />
        </div>
      </div>

      {/* Compteur + reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
          <strong style={{ color: "#23262a" }}>{filtered.length}</strong> commande{filtered.length > 1 ? "s" : ""}
          {filtered.length !== commandes.length && <span style={{ color: "#9aa0a8" }}> sur {commandes.length}</span>}
        </p>
        {(q || statut) && (
          <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Réinitialiser</button>
        )}
      </div>

      {/* ─── Cartes (mobile / tablette) ─── */}
      <div className="cmd-cartes">
        {filtered.map((c) => (
          <div key={c.id} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14.5, fontWeight: 700, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.prenom} {c.nom}
                </p>
                <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.email}
                </p>
              </div>
              <div style={{ flexShrink: 0 }}><StatutCommande statut={c.statut} /></div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #f2efe9", borderBottom: "1px solid #f2efe9", marginBottom: 10 }}>
              {infoCarte("Numéro", c.numero)}
              {infoCarte("Date", dateFR(c.createdAt))}
              <div style={{ flexShrink: 0, textAlign: "center", minWidth: 50 }}>
                <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Articles</p>
                <p style={{ fontSize: 12.5, color: "#23262a", margin: "1px 0 0" }}>{c.lignes.length}</p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Total TTC</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#23262a", margin: "1px 0 0" }}>{euro(c.totalTTC)}</p>
              </div>
              {boutonDetail(c.id, true)}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>
              {commandes.length === 0 ? "Aucune commande pour l'instant." : "Aucune commande ne correspond à ces filtres."}
            </p>
          </div>
        )}
      </div>

      {/* ─── Tableau (desktop) ─── */}
      <div className="cmd-tableau">
        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={th}>Commande</th>
                  <th style={th}>Date</th>
                  <th style={th}>Client</th>
                  <th style={{ ...th, textAlign: "center" }}>Articles</th>
                  <th style={{ ...th, textAlign: "right" }}>Total TTC</th>
                  <th style={{ ...th, textAlign: "center" }}>Statut</th>
                  <th style={{ ...th, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{c.numero}</td>
                    <td style={{ ...td, color: "#5c616a", whiteSpace: "nowrap" }}>{dateFR(c.createdAt)}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{c.prenom} {c.nom}</div>
                      <div style={{ fontSize: 12, color: "#9aa0a8" }}>{c.email}</div>
                    </td>
                    <td style={{ ...td, textAlign: "center", color: "#5c616a" }}>{c.lignes.length}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{euro(c.totalTTC)}</td>
                    <td style={{ ...td, textAlign: "center" }}><StatutCommande statut={c.statut} /></td>
                    <td style={{ ...td, textAlign: "right" }}>{boutonDetail(c.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>
                {commandes.length === 0 ? "Aucune commande pour l'instant." : "Aucune commande ne correspond à ces filtres."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 