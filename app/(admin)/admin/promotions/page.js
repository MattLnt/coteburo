import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import { PromotionsManager } from "./PromotionsManager";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  // Les campagnes ciblent des fiches vitrine. L'ancien sélecteur lisait la
  // table Produit, vide depuis la migration, et n'affichait donc jamais rien.
  const [promotions, vitrines] = await Promise.all([
    prisma.promotion.findMany({
      include: { vitrines: { select: { vitrineId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.produitVitrine.findMany({
      where: { publie: true },
      select: { id: true, nom: true, gamme: { select: { nom: true } } },
      orderBy: { nom: "asc" },
    }),
  ]);

  const cibles = vitrines.map((v) => ({ vitrineId: v.id, nom: v.nom, gammeNom: v.gamme?.nom || null }));
  const promotionsPlates = promotions.map((p) => ({ ...p, cibles: p.vitrines }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="tag" size={22} />
        </span>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0, lineHeight: 1.1 }}>Promotions</h1>
          <p style={{ fontSize: 14, color: "#5c616a", margin: "3px 0 0" }}>Créez des campagnes de remise sur des catégories ou des produits.</p>
        </div>
      </div>

      <PromotionsManager
        promotions={JSON.parse(JSON.stringify(promotionsPlates))}
        cibles={JSON.parse(JSON.stringify(cibles))}
      />
    </>
  );
}
