import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import { ProduitsParCategorie, AjoutsArea, StatutDonut } from "@/components/dashboard/AdminCharts";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const CATS = [
  { key: "sieges", label: "Sièges" },
  { key: "bureaux", label: "Bureaux" },
  { key: "tables", label: "Tables" },
  { key: "rangements", label: "Rangements" },
  { key: "acoustique", label: "Acoustique" },
  { key: "accueil", label: "Accueil" },
];

export default async function AdminDashboard() {
  const [produits, nbMarques, nbMarquesActives, nbRealisations, nbRealisationsPubliees] = await Promise.all([
    prisma.produit.findMany({ select: { categorie: true, publie: true, prixVenteHT: true, prixPublicHT: true, createdAt: true } }),
    prisma.marque.count(),
    prisma.marque.count({ where: { actif: true } }),
    prisma.realisation.count(),
    prisma.realisation.count({ where: { publie: true } }),
  ]);

  const now = new Date();

  // KPIs
  const nbProduits = produits.length;
  const nbPublies = produits.filter((p) => p.publie).length;
  const nbBrouillons = nbProduits - nbPublies;
  const nbPromos = produits.filter((p) => p.prixVenteHT != null && p.prixVenteHT < p.prixPublicHT).length;

  // Produits par catégorie (publiés)
  const parCategorie = CATS.map((c) => ({
    cat: c.label,
    produits: produits.filter((p) => p.publie && p.categorie === c.key).length,
  }));

  // Ajouts par mois (6 derniers mois)
  const ajoutsParMois = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = produits.filter((p) => {
      const cd = new Date(p.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    ajoutsParMois.push({ mois: MOIS_COURTS[d.getMonth()], produits: count });
  }

  // Donut statut
  const statutData = [
    { name: "Publiés", value: nbPublies },
    { name: "Brouillons", value: nbBrouillons },
  ].filter((d) => d.value > 0);

  const kpis = [
    { label: "Produits publiés", value: nbPublies, sub: `${nbProduits} au total`, icon: "box", grad: "linear-gradient(135deg, #212428 0%, #3a3f45 100%)" },
    { label: "Marques actives", value: nbMarquesActives, sub: `${nbMarques} référencées`, icon: "layers", grad: "linear-gradient(135deg, #f0661b 0%, #f6925a 100%)" },
    { label: "Réalisations", value: nbRealisationsPubliees, sub: `${nbRealisations} au total`, icon: "image", grad: "linear-gradient(135deg, #d9551a 0%, #f0661b 100%)" },
    { label: "Promotions actives", value: nbPromos, sub: "Prix de vente < tarif", icon: "tag", grad: "linear-gradient(135deg, #2c3137 0%, #212428 100%)" },
  ];

  const raccourcis = [
    { href: "/admin/produits", label: "Gérer les produits", icon: "box" },
    { href: "/admin/realisations", label: "Gérer les réalisations", icon: "image" },
    { href: "/admin/reglages", label: "Réglages", icon: "settings" },
    { href: "/", label: "Voir le site", icon: "eye" },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Vue d'ensemble</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Activité du catalogue <strong style={{ color: "#212428" }}>Côté BURO</strong>.</p>
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

      {/* Ligne 1 : ajouts + donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }} className="adm-grid">
        <style>{`@media (max-width: 900px){ .adm-grid { grid-template-columns: 1fr !important; } }`}</style>
        <AjoutsArea data={ajoutsParMois} />
        <StatutDonut data={statutData} />
      </div>

      {/* Ligne 2 : barchart catégories + raccourcis */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }} className="adm-grid2">
        <style>{`@media (max-width: 900px){ .adm-grid2 { grid-template-columns: 1fr !important; } }`}</style>
        <ProduitsParCategorie data={parCategorie} />

        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: "0 0 18px" }}>Raccourcis</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {raccourcis.map((r) => (
              <Link key={r.href} href={r.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #f0ece4", textDecoration: "none", background: "#faf8f4", transition: "all 0.15s" }}>
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