"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function ClientsTable({ clients }) {
  const [q, setQ] = useState("");
  const [compte, setCompte] = useState("");
  const [tri, setTri] = useState("recent");

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

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9aa0a8", padding: "16px 18px 13px", whiteSpace: "nowrap" };
  const td = { padding: "15px 18px", fontSize: 13.5, color: "#23262a", borderTop: "1px solid #f2efe9", verticalAlign: "middle" };

  return (
    <div>
      {/* Filtres */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8" }}><Icon name="search" size={18} /></span>
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, email, société…"
            style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <FormSelect value={compte} onChange={setCompte} options={compteOptions} />
          <FormSelect value={tri} onChange={setTri} options={triOptions} />
        </div>
      </div>

      {/* Compteur + reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <p style={{ fontSize: 13, color: "#5c616a", margin: 0 }}>
          <strong style={{ color: "#23262a" }}>{filtered.length}</strong> client{filtered.length > 1 ? "s" : ""}
          {filtered.length !== clients.length && <span style={{ color: "#9aa0a8" }}> sur {clients.length}</span>}
        </p>
        {(q || compte) && (
          <button onClick={resetFiltres} style={{ fontSize: 13, color: "#d9551a", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Réinitialiser</button>
        )}
      </div>

      {/* Tableau */}
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
                  <td style={{ ...td, textAlign: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: c.possedeCompte ? "#e8f6f0" : "#f0ece4", color: c.possedeCompte ? "#1f7a52" : "#5c616a" }}>
                      {c.possedeCompte ? "Compte" : "Invité"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 600 }}>{c.nbCommandes}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{euro(c.totalDepense)}</td>
                  <td style={{ ...td, color: "#5c616a", whiteSpace: "nowrap" }}>{dateFR(c.dateDerniereCommande)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/admin/clients/${encodeURIComponent(c.email)}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid #e8e3da", color: "#23262a", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                      <Icon name="eye" size={14} /> Voir
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
              {clients.length === 0 ? "Aucun client pour l'instant." : "Aucun client ne correspond à ces filtres."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}