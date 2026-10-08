import { prisma } from "@/lib/prisma";
import PromoBandCarousel from "@/components/PromoBandCarousel";
import { calculerPrixMini, appliquerPromoVitrine, urlProduit, getMargeGlobale, resoudreVitrinePourPrix, attacherCampagnes, inclureCombinaisonsPrix , imagesVitrine } from "@/lib/catalogue";
import { getCampagnesActives } from "@/lib/promotions";

const fmt = (n) => n == null ? null : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function PromoBand() {
  // Le bandeau ne montrait que les promos de fiche (promoPct) : une campagne
  // sur un fournisseur ou une catégorie remisait des produits sans les y
  // faire apparaître. On ramène aussi tout ce que les campagnes visent.
  const campagnes = await getCampagnesActives();
  const marques = [...new Set(campagnes.flatMap((c) => Object.keys(c.remisesMarques)))];
  const generales = campagnes.filter((c) => c.valeur > 0);
  const categoriesCiblees = [...new Set(generales.flatMap((c) => c.categories))];
  const vitrinesCiblees = [...new Set(generales.flatMap((c) => c.vitrineIds))];
  const cibles = [{ promoPct: { not: null } }];
  if (marques.length) cibles.push({ gamme: { marque: { slug: { in: marques } } } });
  if (categoriesCiblees.length) cibles.push({ categories: { some: { slug: { in: categoriesCiblees } } } });
  if (vitrinesCiblees.length) cibles.push({ id: { in: vitrinesCiblees } });

  const vitrines = await prisma.produitVitrine.findMany({
    // Même règle que le catalogue : un accessoire vendu seulement avec un
    // produit n'est pas une offre en soi.
    where: { publie: true, accessoireSeul: false, gamme: { publie: true }, OR: cibles },
    include: {
      combinaisons: inclureCombinaisonsPrix,
      gamme: { select: { venteSurDevis: true, marque: { select: { nom: true, slug: true } } } },
      categories: { select: { slug: true } },
      sousCategories: { select: { slug: true }, take: 1 },
    },
    orderBy: { nom: "asc" },
    // Une campagne fournisseur vise des centaines de fiches ; neuf suffisent.
    take: 40,
  });
  attacherCampagnes(vitrines, campagnes);

  // Un bouton par fournisseur remisé : « Sokoa −20 % ». Le client choisit sa
  // marque d'un tap, sans passer par les filtres.
  const liens = [];
  for (const c of campagnes) {
    for (const m of c.marques) {
      const href = `/catalogue?marque=${encodeURIComponent(m.slug)}&promo=1`;
      if (!liens.some((l) => l.href === href)) liens.push({ href, label: `${m.nom} −${m.pct} %` });
    }
  }

  // Sans la marge, calculerPrixMini retombe sur les montants stockés : le
  // bandeau promo calculait donc sa remise sur un prix de base périmé.
  const marge = await getMargeGlobale();

  const enPromo = vitrines
    .map((v) => {
      const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
      const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
      const calc = appliquerPromoVitrine(v, prixMini);
      return { v, calc };
    })
    .filter(({ calc }) => calc.enPromo)
    .map(({ v, calc }) => ({
      id: `vitrine:${v.id}`,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      codeRacine: v.id,
      estNouveau: true,
      brand: v.gamme.marque?.nom || null,
      name: v.nom,
      attr: null,
      images: imagesVitrine(v),
      price: fmt(calc.prixFinal),
      oldPrice: fmt(calc.prixBase),
      promo: `-${calc.promoPct}%`,
    }))
    .slice(0, 9);

  if (enPromo.length === 0) return null;

  return <PromoBandCarousel promos={enPromo} liens={liens} />;
}
