import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ventes" };

const euro = (v) =>
  `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const euro0 = (v) => `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;
const dateCourte = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

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

export default async function VentesPage() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);

  // Seules les commandes payées comptent dans le chiffre d'affaires : une commande
  // "en_attente" peut ne jamais aboutir (abandon au paiement Stripe).
  const [
    aggMois,
    aggMoisPrecedent,
    aggTotal,
    nbATraiter,
    nbClients,
    dernieresCommandes,
    derniersClients,
  ] = await Promise.all([
    prisma.commande.aggregate({
      where: { paye: true, createdAt: { gte: debutMois } },
      _sum: { totalTTC: true },
      _count: true,
    }),
    prisma.commande.aggregate({
      where: { paye: true, createdAt: { gte: debutMoisPrecedent, lt: debutMois } },
      _sum: { totalTTC: true },
      _count: true,
    }),
    prisma.commande.aggregate({
      where: { paye: true },
      _sum: { totalTTC: true },
      _count: true,
    }),
    prisma.commande.count({ where: { paye: true, statut: { in: ["en_attente", "payee", "en_preparation"] } } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.commande.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, numero: true, prenom: true, nom: true, societe: true,
        totalTTC: true, statut: true, paye: true, createdAt: true,
        _count: { select: { lignes: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, nom: true, email: true, createdAt: true },
    }),
  ]);

  const caMois = aggMois._sum.totalTTC || 0;
  const caMoisPrecedent = aggMoisPrecedent._sum.totalTTC || 0;
  // Pas d'évolution calculable si le mois précédent est à zéro (division par zéro).
  const evolution = caMoisPrecedent > 0
    ? Math.round(((caMois - caMoisPrecedent) / caMoisPrecedent) * 100)
    : null;

  const nbMois = aggMois._count || 0;
  const nbTotal = aggTotal._count || 0;
  const caTotal = aggTotal._sum.totalTTC || 0;
  const panierMoyen = nbTotal > 0 ? caTotal / nbTotal : 0;

  const kpis = [
    {
      label: "CA du mois",
      value: euro0(caMois),
      sub: evolution != null
        ? `${evolution >= 0 ? "▲" : "▼"} ${Math.abs(evolution)} % vs mois dernier`
        : "Pas de comparaison disponible",
      icon: "tag",
      grad: "linear-gradient(135deg, #f0661b 0%, #f6925a 100%)",
    },
    {
      label: "Commandes du mois",
      value: nbMois,
      sub: `${nbTotal} au total`,
      icon: "box",
      grad: "linear-gradient(135deg, #212428 0%, #3a3f45 100%)",
    },
    {
      label: "Panier moyen",
      value: euro0(panierMoyen),
      sub: "Sur l'ensemble des ventes",
      icon: "layers",
      grad: "linear-gradient(135deg, #d9551a 0%, #f0661b 100%)",
    },
    {
      label: "CA total",
      value: euro0(caTotal),
      sub: "Commandes payées",
      icon: "tag",
      grad: "linear-gradient(135deg, #2c3137 0%, #212428 100%)",
    },
  ];

  const badgeStatut = (statut, paye) => {
    if (!paye) {
      return (
        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: "#fef4ee", color: "#b45528", whiteSpace: "nowrap" }}>
          Non payée
        </span>
      );
    }
    const c = COULEUR_STATUT[statut] || { bg: "#f4f0ec", fg: "#5c616a" };
    return (
      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>
        {LIBELLE_STATUT[statut] || statut}
      </span>
    );
  };

  const carte = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };
  const titreCarte = { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: 0 };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Ventes</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Activité commerciale <strong style={{ color: "#212428" }}>Côté BURO</strong>.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: k.grad, borderRadius: 16, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
            <div style={{ position: "absolute", bottom: -40, right: 10, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>{k.label}</span>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={k.icon} size={18} color="#fff" />
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ligne 1 : dernières commandes + à traiter / clients */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }} className="vt-grid">
        <style>{`@media (max-width: 900px){ .vt-grid { grid-template-columns: 1fr !important; } .vt-grid2 { grid-template-columns: 1fr !important; } }`}</style>

        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={titreCarte}>Dernières commandes</h3>
            <Link href="/admin/commandes" style={{ fontSize: 13, fontWeight: 600, color: "#f0661b" }}>Tout voir →</Link>
          </div>

          {dernieresCommandes.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#9aa0a8", margin: 0 }}>Aucune commande pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {dernieresCommandes.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/admin/commandes/${c.id}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "14px 0", textDecoration: "none", color: "inherit",
                    borderTop: i === 0 ? "none" : "1px solid #f2efe9",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.societe || `${c.prenom} ${c.nom}`.trim()}
                    </p>
                    <p style={{ fontSize: 12, color: "#9aa0a8", margin: "2px 0 0" }}>
                      {c.numero} · {c._count.lignes} article{c._count.lignes > 1 ? "s" : ""} · {dateCourte(c.createdAt)}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {badgeStatut(c.statut, c.paye)}
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#23262a", whiteSpace: "nowrap" }}>{euro(c.totalTTC)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...carte, borderColor: nbATraiter > 0 ? "#f0c4a0" : "#ece8e0" }}>
            <h3 style={{ ...titreCarte, marginBottom: 14 }}>À traiter</h3>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: nbATraiter > 0 ? "#d9551a" : "#23262a", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 10 }}>
              {nbATraiter}
            </div>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>
              Commande{nbATraiter > 1 ? "s" : ""} en attente d'expédition
            </p>
            <Link href="/admin/commandes" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #f0ece4", textDecoration: "none", background: "#faf8f4" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="box" size={17} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#23262a" }}>Gérer les commandes</span>
            </Link>
          </div>

          <div style={carte}>
            <h3 style={{ ...titreCarte, marginBottom: 14 }}>Clients</h3>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "#23262a", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 10 }}>
              {nbClients}
            </div>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>Compte{nbClients > 1 ? "s" : ""} créé{nbClients > 1 ? "s" : ""}</p>
            <Link href="/admin/clients" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #f0ece4", textDecoration: "none", background: "#faf8f4" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="eye" size={17} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#23262a" }}>Voir les clients</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Ligne 2 : derniers clients */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }} className="vt-grid2">
        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={titreCarte}>Derniers clients inscrits</h3>
            <Link href="/admin/clients" style={{ fontSize: 13, fontWeight: 600, color: "#f0661b" }}>Tout voir →</Link>
          </div>

          {derniersClients.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#9aa0a8", margin: 0 }}>Aucun compte client pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {derniersClients.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "14px 0",
                    borderTop: i === 0 ? "none" : "1px solid #f2efe9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13.5, flexShrink: 0 }}>
                      {(u.nom || u.email).charAt(0).toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.nom || "—"}
                      </p>
                      <p style={{ fontSize: 12, color: "#9aa0a8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "#9aa0a8", flexShrink: 0, whiteSpace: "nowrap" }}>{dateCourte(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={carte}>
          <h3 style={{ ...titreCarte, marginBottom: 18 }}>Raccourcis</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { href: "/admin/commandes", label: "Toutes les commandes", icon: "box" },
              { href: "/admin/clients", label: "Tous les clients", icon: "eye" },
              { href: "/admin/promotions", label: "Promotions", icon: "tag" },
              { href: "/admin", label: "Vue d'ensemble", icon: "home" },
            ].map((r) => (
              <Link key={r.href} href={r.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #f0ece4", textDecoration: "none", background: "#faf8f4" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name={r.icon} size={17} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#23262a" }}>{r.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}