import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ventes" };

const euro = (v) =>
  `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const euro0 = (v) => `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;
const dateCourte = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

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

  const tuiles = [
    { label: "CA total", value: euro0(caTotal) },
    { label: "Panier moyen", value: euro0(panierMoyen) },
    { label: "Commandes", value: nbTotal },
    { label: "Clients", value: nbClients },
  ];

  const raccourcis = [
    { href: "/admin/commandes", label: "Commandes", icon: "box" },
    { href: "/admin/clients", label: "Clients", icon: "eye" },
    { href: "/admin/promotions", label: "Promotions", icon: "tag" },
    { href: "/admin", label: "Vue d'ensemble", icon: "home" },
  ];

  const badgeStatut = (statut, paye) => {
    const c = !paye
      ? { bg: "#fef4ee", fg: "#b45528" }
      : (COULEUR_STATUT[statut] || { bg: "#f4f0ec", fg: "#5c616a" });
    const texte = !paye ? "Non payée" : (LIBELLE_STATUT[statut] || statut);
    return (
      <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: c.bg, color: c.fg, whiteSpace: "nowrap", flexShrink: 0 }}>
        {texte}
      </span>
    );
  };

  const carte = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18 };
  const titreCarte = { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: 0 };
  const titreSection = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#9aa0a8", margin: "0 0 10px",
  };
  const kpiCircleA = { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" };
  const kpiCircleB = { position: "absolute", bottom: -40, right: 10, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.05)" };

  return (
    <>
      <style>{`
        .vt-mois { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 22px; }
        .vt-mois-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .vt-tuiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 22px; }
        .vt-listes { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 22px; }
        .vt-raccourcis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (min-width: 1024px) {
          .vt-mois { grid-template-columns: 1.4fr 1fr 1fr; }
          .vt-mois-duo { display: contents; }
          .vt-tuiles { grid-template-columns: repeat(4, 1fr); }
          .vt-listes { grid-template-columns: 1.3fr 1fr; }
          .vt-raccourcis { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Ventes</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Activité commerciale <strong style={{ color: "#212428" }}>Côté BURO</strong>.</p>
      </div>

      {/* ─── Ce mois-ci ─── */}
      <p style={titreSection}>Ce mois-ci</p>
      <div className="vt-mois">
        <div style={{ background: "linear-gradient(135deg, #f0661b 0%, #f6925a 100%)", borderRadius: 16, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
          <div style={kpiCircleA} />
          <div style={kpiCircleB} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", margin: "0 0 8px", fontWeight: 500 }}>Chiffre d'affaires</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>{euro0(caMois)}</p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.78)", margin: "8px 0 0", fontWeight: 500 }}>
                {evolution != null
                  ? `${evolution >= 0 ? "▲" : "▼"} ${Math.abs(evolution)} % vs mois dernier`
                  : "Pas de comparaison disponible"}
              </p>
            </div>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="tag" size={18} color="#fff" />
            </span>
          </div>
        </div>

        <div className="vt-mois-duo">
          <div style={{ background: "linear-gradient(135deg, #212428 0%, #3a3f45 100%)", borderRadius: 16, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <div style={kpiCircleA} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", margin: "0 0 8px", fontWeight: 500 }}>Commandes</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>{nbMois}</p>
            </div>
          </div>

          <div style={{
            background: nbATraiter > 0
              ? "linear-gradient(135deg, #d9551a 0%, #f0661b 100%)"
              : "linear-gradient(135deg, #2c3137 0%, #212428 100%)",
            borderRadius: 16, padding: "16px 18px", position: "relative", overflow: "hidden",
          }}>
            <div style={kpiCircleA} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", margin: "0 0 8px", fontWeight: 500 }}>À traiter</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>{nbATraiter}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Vue globale ─── */}
      <p style={titreSection}>Vue globale</p>
      <div className="vt-tuiles">
        {tuiles.map((t) => (
          <div key={t.label} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 6px", fontWeight: 500 }}>{t.label}</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "#23262a", margin: 0, lineHeight: 1.1 }}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Activité récente ─── */}
      <p style={titreSection}>Activité récente</p>
      <div className="vt-listes">
        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h3 style={titreCarte}>Dernières commandes</h3>
            <Link href="/admin/commandes" style={{ fontSize: 12.5, fontWeight: 600, color: "#f0661b" }}>Tout voir</Link>
          </div>

          {dernieresCommandes.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#9aa0a8", margin: "14px 0 0" }}>Aucune commande pour l'instant.</p>
          ) : (
            dernieresCommandes.map((c, i) => (
              <Link
                key={c.id}
                href={`/admin/commandes/${c.id}`}
                style={{
                  display: "block", padding: "11px 0", textDecoration: "none", color: "inherit",
                  borderTop: i === 0 ? "none" : "1px solid #f2efe9",
                  marginTop: i === 0 ? 6 : 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.societe || `${c.prenom} ${c.nom}`.trim()}
                  </p>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#23262a", whiteSpace: "nowrap" }}>{euro(c.totalTTC)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
                  {badgeStatut(c.statut, c.paye)}
                  <span style={{ fontSize: 11, color: "#9aa0a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.numero} · {dateCourte(c.createdAt)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div style={carte}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h3 style={titreCarte}>Derniers clients</h3>
            <Link href="/admin/clients" style={{ fontSize: 12.5, fontWeight: 600, color: "#f0661b" }}>Tout voir</Link>
          </div>

          {derniersClients.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#9aa0a8", margin: "14px 0 0" }}>Aucun compte client pour l'instant.</p>
          ) : (
            derniersClients.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 0",
                  borderTop: i === 0 ? "none" : "1px solid #f2efe9",
                  marginTop: i === 0 ? 6 : 0,
                }}
              >
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {(u.nom || u.email).charAt(0).toUpperCase()}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.nom || "—"}
                  </p>
                  <p style={{ fontSize: 11, color: "#9aa0a8", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "#9aa0a8", flexShrink: 0, whiteSpace: "nowrap" }}>{dateCourte(u.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Raccourcis ─── */}
      <div className="vt-raccourcis">
        {raccourcis.map((r) => (
          <Link key={r.href} href={r.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid #f0ece4", textDecoration: "none", background: "#fff" }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name={r.icon} size={16} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a" }}>{r.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}