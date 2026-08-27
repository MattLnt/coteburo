"use client";
import Link from "next/link";

const euro = (v) =>
  `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const euro0 = (v) =>
  `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;
const dateCourte = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const LIBELLE_STATUT = {
  en_attente: "En attente",
  payee: "Payée",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

const COULEUR_STATUT = {
  en_attente: { bg: "#fef4ee", fg: "#b45528" },
  payee: { bg: "#e8f6f0", fg: "#1f7a52" },
  en_preparation: { bg: "#eef1f6", fg: "#3a6ea5" },
  expediee: { bg: "#eef1f6", fg: "#3a6ea5" },
  livree: { bg: "#e8f6f0", fg: "#1f7a52" },
  annulee: { bg: "#f4f0ec", fg: "#8a8378" },
};

export function VentesDashboard({ donnees }) {
  const {
    caMois, evolution, nbMois, panierMoyen,
    caTotal, nbTotal, nbATraiter, nbClients,
    dernieresCommandes, derniersClients,
  } = donnees;

  const carte = {
    background: "#fff",
    border: "1px solid #ece8e0",
    borderRadius: 16,
    padding: 20,
  };

  const labelStat = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#9aa0a8",
    margin: "0 0 8px",
  };

  const valeurStat = {
    fontFamily: "var(--font-display)",
    fontSize: 26,
    fontWeight: 800,
    color: "#23262a",
    margin: 0,
    lineHeight: 1.1,
  };

  const badgeStatut = (statut, paye) => {
    if (!paye) {
      return (
        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#fef4ee", color: "#b45528" }}>
          Non payée
        </span>
      );
    }
    const c = COULEUR_STATUT[statut] || { bg: "#f4f0ec", fg: "#5c616a" };
    return (
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: c.bg, color: c.fg }}>
        {LIBELLE_STATUT[statut] || statut}
      </span>
    );
  };

  return (
    <div>
      <style>{`
        .vt-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        .vt-listes {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 18px;
        }
        @media (max-width: 900px) {
          .vt-stats { grid-template-columns: repeat(2, 1fr); }
          .vt-listes { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .vt-stats { grid-template-columns: 1fr; }
        }
        .vt-ligne {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-top: 1px solid #f2efe9;
          text-decoration: none;
          color: inherit;
        }
        .vt-ligne:first-of-type { border-top: none; }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>
          Ventes
        </h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>
          Activité commerciale : chiffre d'affaires, commandes et clients.
        </p>
      </div>

      {/* ── Statistiques ── */}
      <div className="vt-stats">
        <div style={carte}>
          <p style={labelStat}>CA du mois</p>
          <p style={valeurStat}>{euro0(caMois)}</p>
          {evolution != null ? (
            <p style={{ fontSize: 12.5, fontWeight: 600, margin: "8px 0 0", color: evolution >= 0 ? "#1f7a52" : "#c4735a" }}>
              {evolution >= 0 ? "▲" : "▼"} {Math.abs(evolution)} % vs mois dernier
            </p>
          ) : (
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "8px 0 0" }}>Pas de comparaison disponible</p>
          )}
        </div>

        <div style={carte}>
          <p style={labelStat}>Commandes du mois</p>
          <p style={valeurStat}>{nbMois}</p>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "8px 0 0" }}>Commandes payées</p>
        </div>

        <div style={carte}>
          <p style={labelStat}>Panier moyen</p>
          <p style={valeurStat}>{euro0(panierMoyen)}</p>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "8px 0 0" }}>Sur l'ensemble des ventes</p>
        </div>

        <div style={carte}>
          <p style={labelStat}>CA total</p>
          <p style={valeurStat}>{euro0(caTotal)}</p>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "8px 0 0" }}>{nbTotal} commande{nbTotal > 1 ? "s" : ""} payée{nbTotal > 1 ? "s" : ""}</p>
        </div>

        <div style={{ ...carte, borderColor: nbATraiter > 0 ? "#f0c4a0" : "#ece8e0" }}>
          <p style={labelStat}>À traiter</p>
          <p style={{ ...valeurStat, color: nbATraiter > 0 ? "#d9551a" : "#23262a" }}>{nbATraiter}</p>
          <Link href="/admin/commandes" style={{ fontSize: 12.5, fontWeight: 600, color: "#f0661b", margin: "8px 0 0", display: "inline-block" }}>
            Voir les commandes →
          </Link>
        </div>

        <div style={carte}>
          <p style={labelStat}>Clients</p>
          <p style={valeurStat}>{nbClients}</p>
          <Link href="/admin/clients" style={{ fontSize: 12.5, fontWeight: 600, color: "#f0661b", margin: "8px 0 0", display: "inline-block" }}>
            Voir les clients →
          </Link>
        </div>
      </div>

      {/* ── Listes ── */}
      <div className="vt-listes">
        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#23262a", margin: 0 }}>
              Dernières commandes
            </h2>
            <Link href="/admin/commandes" style={{ fontSize: 13, fontWeight: 600, color: "#f0661b" }}>Tout voir</Link>
          </div>

          {dernieresCommandes.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#9aa0a8", padding: "18px 0 4px", margin: 0 }}>Aucune commande pour l'instant.</p>
          ) : (
            dernieresCommandes.map((c) => (
              <Link key={c.id} href={`/admin/commandes/${c.id}`} className="vt-ligne">
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.client}
                  </p>
                  <p style={{ fontSize: 12, color: "#9aa0a8", margin: "2px 0 0" }}>
                    {c.numero} · {c.nbLignes} article{c.nbLignes > 1 ? "s" : ""} · {dateCourte(c.date)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  {badgeStatut(c.statut, c.paye)}
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#23262a", whiteSpace: "nowrap" }}>{euro(c.totalTTC)}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#23262a", margin: 0 }}>
              Derniers clients
            </h2>
            <Link href="/admin/clients" style={{ fontSize: 13, fontWeight: 600, color: "#f0661b" }}>Tout voir</Link>
          </div>

          {derniersClients.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#9aa0a8", padding: "18px 0 4px", margin: 0 }}>Aucun compte client pour l'instant.</p>
          ) : (
            derniersClients.map((u) => (
              <div key={u.id} className="vt-ligne">
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13.5, flexShrink: 0 }}>
                    {(u.nom !== "—" ? u.nom : u.email).charAt(0).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.nom}
                    </p>
                    <p style={{ fontSize: 12, color: "#9aa0a8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#9aa0a8", flexShrink: 0, whiteSpace: "nowrap" }}>{dateCourte(u.date)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}