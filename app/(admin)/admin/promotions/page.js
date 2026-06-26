import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import { PromotionsManager } from "./PromotionsManager";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const [promotions, produits] = await Promise.all([
    prisma.promotion.findMany({
      include: { produits: { select: { codeRacine: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.produit.findMany({
      select: { codeRacine: true, designation: true, gamme: true },
      orderBy: { designation: "asc" },
    }),
  ]);

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
        promotions={JSON.parse(JSON.stringify(promotions))}
        produits={JSON.parse(JSON.stringify(produits))}
      />
    </>
  );
}