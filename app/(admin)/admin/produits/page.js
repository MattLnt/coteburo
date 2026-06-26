import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { ProduitsTable } from "./ProduitsTable";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export default async function ProduitsPage() {
  const [produitsRaw, marques, promosActives] = await Promise.all([
    prisma.produit.findMany({ include: { marque: { select: { nom: true } } }, orderBy: { designation: "asc" } }),
    prisma.marque.findMany({ orderBy: { nom: "asc" } }),
    getPromotionsActives(),
  ]);

  // On enrichit chaque produit avec son prix final (promo manuelle + campagnes)
  const produits = produitsRaw.map((p) => {
    const calc = appliquerPromotions(p, promosActives);
    // Type de promo : "campagne" si une campagne active réduit le prix sous le prix de vente normal
    const prixVenteNormal = p.prixVenteHT ?? p.prixPublicHT;
    const promoManuelle = p.prixVenteHT != null && p.prixVenteHT < p.prixPublicHT;
    const promoCampagne = calc.prixFinal < prixVenteNormal;
    return {
      ...p,
      _prixFinal: calc.prixFinal,
      _enPromo: calc.enPromo,
      _promoPct: calc.promoPct,
      _promoManuelle: promoManuelle,
      _promoCampagne: promoCampagne,
    };
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Produits</h1>
          <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Gérez votre catalogue, les prix et la publication.</p>
        </div>
        <Link href="/admin/produits/import" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          <Icon name="plus" size={17} /> Importer des produits
        </Link>
      </div>

      <ProduitsTable produits={JSON.parse(JSON.stringify(produits))} marques={marques} />
    </>
  );
}