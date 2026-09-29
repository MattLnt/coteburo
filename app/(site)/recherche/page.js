import { prisma } from "@/lib/prisma";
import { calculerPrixMini, urlProduit, getFiltresCatalogue, getMargeGlobale, resoudreVitrinePourPrix, appliquerPromoVitrine, attacherCampagnes, inclureCombinaisonsPrix } from "@/lib/catalogue";
import { getCampagnesActives } from "@/lib/promotions";
import RechercheClient from "@/components/RechercheClient";

export const dynamic = "force-dynamic";

const fmt = (n) => (n == null ? null : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return { title: q ? `Recherche : ${q}` : "Recherche", robots: { index: false } };
}

export default async function RecherchePage({ searchParams }) {
  const sp = await searchParams;
  const query = (sp?.q || "").trim();
  // Ces valeurs ne servent qu'au tout premier rendu (URL partagée directement) —
  // ensuite, tout le filtrage se fait côté navigateur, sans redemander au serveur.
  const valeursInitiales = {
    categorieSlug: sp?.categorie || null,
    sousCategorieSlug: sp?.sousCategorie || null,
    marqueSlug: sp?.marque || null,
    prixMin: sp?.prixMin || null,
    prixMax: sp?.prixMax || null,
  };

  const filtres = await getFiltresCatalogue();

  if (query.length < 2) {
    return (
      <main>
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-16">
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <p className="text-ink-soft">Saisissez au moins 2 caractères pour lancer une recherche.</p>
          </div>
        </div>
      </main>
    );
  }

  // Catégories/sous-catégories dont le nom correspond à la recherche (ex : "bur" -> "Bureaux")
  const [categoriesMatch, sousCategoriesMatch] = await Promise.all([
    prisma.categorie.findMany({ where: { nom: { contains: query, mode: "insensitive" } }, select: { id: true, slug: true } }),
    prisma.sousCategorie.findMany({ where: { nom: { contains: query, mode: "insensitive" } }, select: { id: true, slug: true } }),
  ]);
  const categorieIds = categoriesMatch.map((c) => c.id);
  const sousCategorieIds = sousCategoriesMatch.map((s) => s.id);

  const marge = await getMargeGlobale();

  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      publie: true,
      gamme: { publie: true },
      OR: [
        { nom: { contains: query, mode: "insensitive" } },
        ...(categorieIds.length ? [{ categories: { some: { id: { in: categorieIds } } } }] : []),
        ...(sousCategorieIds.length ? [{ sousCategories: { some: { id: { in: sousCategorieIds } } } }] : []),
      ],
    },
    include: {
      combinaisons: inclureCombinaisonsPrix,
      gamme: { select: { nom: true, venteSurDevis: true, marque: { select: { nom: true, slug: true } } } },
      // Toutes les catégories : une campagne peut viser n'importe laquelle.
      categories: { select: { slug: true } },
      sousCategories: { select: { slug: true }, take: 1 },
    },
    orderBy: { nom: "asc" },
  });
  // Le prix des résultats ignorait les promotions — celle de la fiche comme
  // les campagnes — et contredisait la carte du catalogue et la fiche.
  attacherCampagnes(vitrines, await getCampagnesActives());

  const resultatsNouveaux = vitrines.map((v) => {
    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    const prixMini = calculerPrixMini(resoudreVitrinePourPrix(v, marge), surDevis, marge);
    const promo = surDevis || prixMini == null
      ? { prixFinal: prixMini, prixBase: null, enPromo: false, promoPct: null }
      : appliquerPromoVitrine(v, prixMini);
    return {
      id: `vitrine:${v.id}`,
      href: urlProduit({ categorieSlug: v.categories[0]?.slug || null, sousCategorieSlug: v.sousCategories[0]?.slug || null, slug: v.slug }),
      nom: v.nom,
      gammeNom: v.gamme.nom,
      brand: v.gamme.marque?.nom || null,
      imageUrl: (v.images && v.images[0]) || v.imageUrl || null,
      prix: promo.prixFinal,
      prixAffiche: promo.prixFinal != null ? fmt(promo.prixFinal) : "Sur devis",
      oldPrice: promo.enPromo ? fmt(promo.prixBase) : null,
      promo: promo.enPromo ? `-${promo.promoPct}%` : null,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
      marqueSlug: v.gamme.marque?.slug || null,
    };
  });

  const resultats = [...resultatsNouveaux].sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));

  return (
    <main>
      <RechercheClient
        resultats={JSON.parse(JSON.stringify(resultats))}
        filtres={JSON.parse(JSON.stringify(filtres))}
        query={query}
        valeursInitiales={valeursInitiales}
      />
    </main>
  );
}