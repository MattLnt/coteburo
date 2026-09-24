import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Les trois dernières réalisations publiées, sur la page d'accueil.
//
// Le bloc portait trois cartes écrites en dur, avec des photos de banque
// d'images : « Sophia Santé », « Provence Avocats », « Château Mistral »
// n'ont jamais existé. Il lit désormais la même table que /realisations,
// les plus récentes d'abord, et disparaît tant qu'il n'y en a aucune avec
// une image — mieux vaut rien qu'un chantier inventé.
export default async function Realisations() {
  const reals = await prisma.realisation.findMany({
    where: { publie: true, imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, slug: true, titre: true, client: true, secteur: true, surface: true, imageUrl: true },
  });
  if (!reals.length) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="flex items-end justify-between gap-4 mb-4 sm:mb-8">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos réalisations</p>
          <h2 className="font-display font-bold text-ink text-[21px] sm:text-3xl mt-1 sm:mt-1.5">Des espaces qui ont pris vie</h2>
        </div>
        <Link href="/realisations" className="text-orange font-semibold whitespace-nowrap text-[12.5px] sm:text-[15px] hover:text-orange-dark transition">
          <span className="sm:hidden">Tout voir →</span>
          <span className="hidden sm:inline">Toutes les réalisations →</span>
        </Link>
      </div>

      {/* Le conteneur reste dans la marge du parent (pas de -mx-5 : sur un
          élément défilant, le padding gauche est absorbé par le scroll et la
          première carte se colle au bord). */}
      <div className="flex md:grid md:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto md:overflow-visible pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none]">
        {reals.map((r) => {
          const sousTitre = [r.client, r.surface].filter(Boolean).join(" · ");
          return (
            <Link key={r.id} href={`/realisations/${r.slug}`} className="group relative block shrink-0 md:shrink w-[270px] md:w-auto h-[250px] sm:h-[340px] rounded-[18px] sm:rounded-3xl overflow-hidden bg-charcoal [scroll-snap-align:start]">
              <img src={r.imageUrl} alt={r.titre} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.9) 0%, rgba(33,36,40,0.25) 55%, rgba(33,36,40,0.1) 100%)" }} />
              {r.secteur && (
                <span className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 bg-orange/90 text-white text-[10px] sm:text-[11px] font-bold tracking-wide uppercase px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">{r.secteur}</span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <h3 className="font-display font-bold text-white text-[19px] sm:text-2xl">{r.titre}</h3>
                {sousTitre && <p className="text-white/75 text-[11.5px] sm:text-[13px] mt-1">{sousTitre}</p>}
                <span className="inline-flex items-center gap-1.5 text-white text-[12px] sm:text-[13px] font-semibold mt-2.5 sm:mt-3 group-hover:gap-2.5 transition-all">Voir l&apos;aménagement <span>→</span></span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
