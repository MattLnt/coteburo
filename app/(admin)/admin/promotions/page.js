import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import { PromotionsManager } from "./PromotionsManager";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  // Les campagnes ciblent des fiches vitrine. L'ancien sélecteur lisait la
  // table Produit, vide depuis la migration, et n'affichait donc jamais rien.
  const [promotions, vitrines, marques] = await Promise.all([
    prisma.promotion.findMany({
      include: { vitrines: { select: { vitrineId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.produitVitrine.findMany({
      where: { publie: true },
      select: { id: true, nom: true, gamme: { select: { nom: true } } },
      orderBy: { nom: "asc" },
    }),
    // Les fournisseurs, lus en base : la liste des catégories du formulaire
    // est codée en dur, celle-ci suit l'onglet Marques.
    prisma.marque.findMany({
      where: { actif: true },
      select: { nom: true, slug: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  // Combien de fois chaque code a réellement servi. Compté sur les commandes
  // PAYÉES, comme le garde-fou : un panier abandonné ne consomme pas une place.
  const codes = promotions.map((p) => p.code).filter(Boolean);
  const usages = codes.length
    ? await prisma.commande.groupBy({
      by: ["codePromo"],
      where: { codePromo: { in: codes }, paye: true },
      _count: { _all: true },
    })
    : [];
  const parCode = Object.fromEntries(usages.map((u) => [u.codePromo, u._count._all]));

  const cibles = vitrines.map((v) => ({ vitrineId: v.id, nom: v.nom, gammeNom: v.gamme?.nom || null }));
  const promotionsPlates = promotions.map((p) => ({
    ...p,
    cibles: p.vitrines,
    utilisations: p.code ? (parCode[p.code] || 0) : 0,
  }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="tag" size={22} />
        </span>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0, lineHeight: 1.1 }}>Promotions</h1>
          <p style={{ fontSize: 14, color: "#5c616a", margin: "3px 0 0" }}>Remises automatiques sur un fournisseur, des catégories ou des produits — ou codes promo à saisir au panier.</p>
        </div>
      </div>

      <PromotionsManager
        promotions={JSON.parse(JSON.stringify(promotionsPlates))}
        cibles={JSON.parse(JSON.stringify(cibles))}
        marques={marques}
      />
    </>
  );
}
