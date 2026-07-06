import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import CatalogueContent from "@/components/CatalogueContent";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { CAT_LABEL, SOUSCAT_LABEL, SOUSCAT_PARENT } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = slug?.[0];
  const sousCat = slug?.[1];
  let titre = "Catalogue";
  if (sousCat && SOUSCAT_LABEL[sousCat]) titre = SOUSCAT_LABEL[sousCat];
  else if (cat && CAT_LABEL[cat]) titre = CAT_LABEL[cat];
  const canonical = sousCat ? `/catalogue/${cat}/${sousCat}` : cat ? `/catalogue/${cat}` : "/catalogue";
  return { title: titre, alternates: { canonical } };
}

export default async function CataloguePage({ params }) {
  const { slug } = await params;
  const cat = slug?.[0];
  const sousCat = slug?.[1];

  const catValide = cat && CAT_LABEL[cat] ? cat : "";
  const sousCatValide = sousCat && SOUSCAT_PARENT[sousCat] === catValide ? sousCat : "";

  const titre = sousCatValide ? SOUSCAT_LABEL[sousCatValide] : catValide ? CAT_LABEL[catValide] : "Tout le catalogue";

  const session = await auth();

  const [produitsRaw, promosActives, favoris] = await Promise.all([
    prisma.produit.findMany({
      where: { publie: true },
      include: { marque: { select: { nom: true } } },
      orderBy: { designation: "asc" },
    }),
    getPromotionsActives(),
    session?.user?.id
      ? prisma.favori.findMany({ where: { userId: session.user.id }, select: { codeRacine: true } })
      : Promise.resolve([]),
  ]);

  const favorisCodes = favoris.map((f) => f.codeRacine);

  // Enrichissement prix/promo côté serveur
  const produits = produitsRaw.map((p) => {
    const { prixFinal, prixBase, enPromo, promoPct } = appliquerPromotions(p, promosActives);
    return {
      codeRacine: p.codeRacine,
      slug: p.slug,
      designation: p.designation,
      gamme: p.gamme,
      brand: p.marque?.nom || null,
      images: p.images,
      categorie: p.categorie,
      sousCategorie: p.sousCategorie,
      prixPublicHT: p.prixPublicHT,
      _prixFinal: prixFinal,
      _prixBase: prixBase,
      _enPromo: enPromo,
      _promoPct: promoPct,
    };
  });

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
        <div className="pt-6 pb-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <Link href="/catalogue" className="hover:text-orange">Catalogue</Link>
          {catValide && <> / <Link href={`/catalogue/${catValide}`} className="hover:text-orange">{CAT_LABEL[catValide]}</Link></>}
          {sousCatValide && <> / <span className="text-ink">{SOUSCAT_LABEL[sousCatValide]}</span></>}
        </div>
        <div className="pt-2 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Catalogue</p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3">{titre}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-16">
        <CatalogueContent
          produits={produits}
          categorieInitiale={catValide}
          sousCategorieInitiale={sousCatValide}
          favorisCodes={favorisCodes}
          connecte={!!session?.user}
        />
      </div>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20">
        <div className="rounded-[24px] bg-charcoal text-white p-9 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div>
            <h3 className="font-display font-bold text-2xl">Un projet d&apos;aménagement complet ?</h3>
            <p className="text-[#bfc4cb] mt-1.5">Au-delà de la boutique, nos experts vous accompagnent sur devis avec plan 3D, livraison et montage.</p>
          </div>
          <Link href="/devis" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Demander un devis →</Link>
        </div>
      </section>
    </main>
  );
}