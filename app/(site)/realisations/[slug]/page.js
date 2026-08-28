import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { urlProduit } from "@/lib/catalogue";
import CtaBand from "@/components/CtaBand";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const r = await prisma.realisation.findUnique({ where: { slug }, select: { titre: true, client: true, secteur: true } });
  if (!r) return { title: "Réalisation introuvable" };
  return {
    title: r.titre,
    description: [r.client, r.secteur].filter(Boolean).join(" · "),
    alternates: { canonical: `/realisations/${slug}` },
  };
}

// Découpe un tableau en groupes de N éléments — utilisé pour la galerie asymétrique
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default async function RealisationDetailPage({ params }) {
  const { slug } = await params;

  const r = await prisma.realisation.findUnique({
    where: { slug, publie: true },
    include: {
      produitsLies: {
        where: { publie: true },
        include: {
          gamme: { select: { nom: true } },
          categories: { select: { slug: true }, take: 1 },
          sousCategories: { select: { slug: true }, take: 1 },
        },
      },
    },
  });
  if (!r) notFound();

  const autres = await prisma.realisation.findMany({
    where: { publie: true, NOT: { id: r.id } },
    orderBy: [{ ordre: "asc" }, { createdAt: "desc" }],
    take: 3,
    select: { id: true, titre: true, slug: true, secteur: true, imageUrl: true },
  });

  const carnet = Array.isArray(r.carnetChantier) ? r.carnetChantier : [];
  const aAvantApres = !!(r.avantImageUrl && r.apresImageUrl);
  const ficheItems = [
    r.client && { label: "Client", valeur: r.client },
    r.secteur && { label: "Secteur", valeur: r.secteur },
    r.surface && { label: "Surface", valeur: r.surface },
  ].filter(Boolean);
  const groupesGalerie = r.galerie?.length > 0 ? chunk(r.galerie, 3) : [];

  return (
    <main>
      {/* Fil d'ariane — « Accueil » masqué sur mobile, la ligne débordait */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-7 pt-4 sm:pt-6 pb-2 text-[11.5px] sm:text-sm text-ink-soft">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link href="/" className="hidden sm:inline hover:text-orange">Accueil</Link>
          <span className="hidden sm:inline text-ink-soft/40">/</span>
          <Link href="/realisations" className="hover:text-orange whitespace-nowrap shrink-0">Réalisations</Link>
          <span className="text-ink-soft/40 shrink-0">/</span>
          <span className="text-ink truncate min-w-0">{r.titre}</span>
        </div>
      </div>

      {/* Hero + fiche technique */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-7 mt-2 sm:mt-3">
        <section className={`relative h-[52vh] sm:h-[60vh] min-h-[320px] sm:min-h-[400px] max-h-[620px] overflow-hidden ${ficheItems.length > 0 ? "rounded-t-[20px] sm:rounded-t-[28px]" : "rounded-[20px] sm:rounded-[28px]"}`}>
          {r.imageUrl ? (
            <img src={r.imageUrl} alt={r.titre} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-surface-2" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(20,21,23,0.08) 0%, rgba(20,21,23,0.2) 30%, rgba(15,16,18,0.72) 62%, rgba(12,13,14,0.94) 100%)" }}
          />
          <div
            className="absolute inset-0 hidden sm:block"
            style={{ background: "linear-gradient(100deg, rgba(10,11,12,0.62) 0%, rgba(10,11,12,0.4) 30%, rgba(10,11,12,0) 60%)" }}
          />
          <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-20">
            {r.secteur && (
              <p className="inline-flex items-center gap-2 text-[10px] sm:text-[11.5px] font-bold uppercase tracking-[0.16em] text-orange-tint/90 mb-2.5 sm:mb-4 before:content-[''] before:w-[18px] before:h-[1.5px] before:bg-orange">
                Réalisation — {r.secteur}
              </p>
            )}
            <h1 className="font-display font-bold text-white text-[26px] sm:text-4xl lg:text-5xl leading-tight max-w-3xl" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}>
              {r.titre}
            </h1>
            {r.client && (
              <p className="text-[#eef0f2] text-[13px] sm:text-[16px] mt-2 sm:mt-3" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>{r.client}</p>
            )}
          </div>
        </section>

        {ficheItems.length > 0 && (
          <div className="bg-charcoal rounded-b-[20px] sm:rounded-b-[28px] overflow-hidden">
            {/* Grille sur mobile : en flex, les trois blocs se chevauchaient */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center gap-y-4 gap-x-3 sm:gap-10 lg:gap-16 px-5 sm:px-20 py-5 sm:py-8">
              {ficheItems.flatMap((item, i) => [
                i > 0 ? <span key={`sep-${i}`} className="hidden sm:block w-px h-10 bg-white/10" /> : null,
                <div key={item.label} className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a8f96] mb-1 sm:mb-1.5">{item.label}</p>
                  <p className="font-display font-bold text-white text-[13.5px] sm:text-[19px] leading-tight">{item.valeur}</p>
                </div>,
              ]).filter(Boolean)}
            </div>
          </div>
        )}
      </div>

      {/* À partir d'ici : largeur maquette (1180) */}
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        {/* Récit + carnet */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-16 py-8 sm:py-16">
          <div>
            {r.recit ? (
              <>
                <p className="text-[10px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-orange mb-2.5 sm:mb-3.5">Le projet</p>
                {/* La lettrine passe de 52 à 38px sur mobile : à 52 elle mangeait
                    trois lignes de texte sur une colonne étroite. */}
                <div
                  className="prose prose-sm sm:prose-lg max-w-[640px] text-ink-soft leading-relaxed [&_p:first-of-type::first-letter]:font-display [&_p:first-of-type::first-letter]:text-[38px] sm:[&_p:first-of-type::first-letter]:text-[52px] [&_p:first-of-type::first-letter]:font-bold [&_p:first-of-type::first-letter]:text-orange [&_p:first-of-type::first-letter]:float-left [&_p:first-of-type::first-letter]:leading-[0.8] [&_p:first-of-type::first-letter]:pr-2 sm:[&_p:first-of-type::first-letter]:pr-2.5 [&_p:first-of-type::first-letter]:pt-1.5 sm:[&_p:first-of-type::first-letter]:pt-2"
                  dangerouslySetInnerHTML={{ __html: r.recit }}
                />
              </>
            ) : (
              <p className="text-ink-soft text-[13.5px] sm:text-base">Le récit de ce projet sera bientôt disponible.</p>
            )}

            {r.citationTexte && (
              <blockquote className="mt-7 sm:mt-10 pl-4 sm:pl-6 border-l-2 border-orange max-w-[560px]">
                <p className="font-display italic text-[16px] sm:text-[21px] text-ink leading-relaxed">« {r.citationTexte} »</p>
                {(r.citationAuteur || r.citationPoste) && (
                  <cite className="not-italic block mt-3 sm:mt-3.5 text-[12px] sm:text-[13px] font-semibold text-ink-soft">
                    — {[r.citationAuteur, r.citationPoste].filter(Boolean).join(", ")}
                  </cite>
                )}
              </blockquote>
            )}
          </div>

          {carnet.length > 0 && (
            <aside className="lg:sticky lg:top-24 h-fit rounded-[18px] sm:rounded-[20px] border border-line bg-surface p-4 sm:p-6">
              <h2 className="font-display font-bold text-[14px] sm:text-[15px] pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-line">Carnet de chantier</h2>
              <div className="flex flex-col">
                {carnet.map((l, i) => (
                  <div key={i} className={`flex justify-between gap-3 text-[12.5px] sm:text-[13.5px] py-2.5 ${i < carnet.length - 1 ? "border-b border-[#f2efe9]" : ""}`}>
                    <span className="text-ink-soft">{l.label}</span>
                    <span className="font-semibold text-right">{l.valeur}</span>
                  </div>
                ))}
              </div>
              <Link href="/devis" className="block text-center rounded-full bg-orange text-white font-semibold text-[13px] sm:text-[14px] px-6 py-3.5 mt-4 sm:mt-5 hover:bg-orange-dark transition">
                Discuter de mon projet
              </Link>
              <p className="text-[11.5px] sm:text-[12px] text-ink-soft text-center mt-3 leading-relaxed">Un projet similaire en tête ? Nos équipes étudient votre besoin sans engagement.</p>
            </aside>
          )}
        </div>

        {/* Galerie — composition asymétrique sur desktop, grille simple sur mobile */}
        {groupesGalerie.length > 0 && (
          <section className="pb-8 sm:pb-16">
            <div className="flex items-end justify-between mb-4 sm:mb-6">
              <h2 className="font-display font-bold text-[19px] sm:text-2xl">En images</h2>
              <span className="text-[12px] sm:text-[13px] text-ink-soft">{r.galerie.length} photo{r.galerie.length > 1 ? "s" : ""}</span>
            </div>

            {/* Mobile : la composition asymétrique écrase les photos empilées
                à moins de 100px de haut. Une grille régulière rend mieux. */}
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              {r.galerie.map((img, i) => (
                <div key={i} className={`rounded-xl overflow-hidden ${i % 3 === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="hidden sm:flex flex-col gap-3.5">
              {groupesGalerie.map((groupe, gi) => {
                const grandADroite = gi % 2 === 1;
                if (groupe.length === 3) {
                  const [a, b, c] = groupe;
                  const grandePhoto = (
                    <div className="flex-[3] h-full rounded-2xl overflow-hidden min-w-0">
                      <img src={a} alt="" className="w-full h-full object-cover" />
                    </div>
                  );
                  const colonneEmpilee = (
                    <div className="flex-[2] h-full flex flex-col gap-3.5 min-w-0">
                      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
                        <img src={b} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
                        <img src={c} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  );
                  return (
                    <div key={gi} className="flex gap-3.5 h-[300px] sm:h-[440px]">
                      {grandADroite ? (
                        <>{colonneEmpilee}{grandePhoto}</>
                      ) : (
                        <>{grandePhoto}{colonneEmpilee}</>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={gi} className={`grid gap-3.5 ${groupe.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {groupe.map((img, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden aspect-[4/3]">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Avant / Après */}
        {aAvantApres && (
          <section className="pb-8 sm:pb-16">
            <p className="text-[10px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-orange mb-2 sm:mb-2.5">Transformation</p>
            <h2 className="font-display font-bold text-[19px] sm:text-2xl mb-4 sm:mb-6">Avant / après</h2>
            {/* Empilé sur mobile : côte à côte, chaque photo fait 160px de large
                et on ne distingue plus rien. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-[3px] rounded-[16px] sm:rounded-[20px] overflow-hidden">
              <div className="relative aspect-[16/10] sm:aspect-[4/3]">
                <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-charcoal/85 text-white text-[10.5px] sm:text-[12px] font-bold uppercase tracking-wide px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">Avant</span>
                <img src={r.avantImageUrl} alt="Avant" className="w-full h-full object-cover rounded-[16px] sm:rounded-none" />
              </div>
              <div className="relative aspect-[16/10] sm:aspect-[4/3]">
                <span className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-orange text-white text-[10.5px] sm:text-[12px] font-bold uppercase tracking-wide px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">Après</span>
                <img src={r.apresImageUrl} alt="Après" className="w-full h-full object-cover rounded-[16px] sm:rounded-none" />
              </div>
            </div>
          </section>
        )}

        {/* Produits liés */}
        {r.produitsLies?.length > 0 && (
          <section className="pb-8 sm:pb-16">
            <p className="text-[10px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-orange mb-2 sm:mb-2.5">Sur ce projet</p>
            <h2 className="font-display font-bold text-[19px] sm:text-2xl mb-4 sm:mb-6">Mobilier installé</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {r.produitsLies.map((p) => (
                <Link key={p.id} href={urlProduit({ categorieSlug: p.categories[0]?.slug || null, sousCategorieSlug: p.sousCategories[0]?.slug || null, slug: p.slug })}
                  className="group rounded-2xl border border-line bg-surface overflow-hidden hover:border-orange/50 transition">
                  <div className="aspect-[4/3] bg-surface-2 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.nom} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-ink-soft/25">
                        <svg width="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-3.5">
                    <p className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide text-orange truncate">{p.gamme.nom}</p>
                    <p className="font-semibold text-[12.5px] sm:text-[13.5px] text-ink mt-1 leading-snug line-clamp-2">{p.nom}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Autres réalisations */}
        {autres.length > 0 && (
          <section className="pb-8 sm:pb-16">
            <div className="flex items-end justify-between mb-4 sm:mb-6">
              <h2 className="font-display font-bold text-[19px] sm:text-2xl">Autres réalisations</h2>
              <Link href="/realisations" className="text-[12.5px] sm:text-[13.5px] font-semibold text-orange hover:text-orange-dark transition whitespace-nowrap">
                <span className="sm:hidden">Tout voir →</span>
                <span className="hidden sm:inline">Toutes les réalisations →</span>
              </Link>
            </div>
            {/* Défilement horizontal sur mobile : trois cartes en 4/5 empilées
                font plus de 900px de haut pour un bloc secondaire. */}
            <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto sm:overflow-visible pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] sm:[scroll-snap-type:none]">
              {autres.map((a) => (
                <Link key={a.id} href={`/realisations/${a.slug}`}
                  className="group relative shrink-0 sm:shrink w-[210px] sm:w-auto rounded-[18px] sm:rounded-[20px] overflow-hidden aspect-[4/5] [scroll-snap-align:start]">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.titre} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="absolute inset-0 bg-surface-2" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/10 to-transparent" />
                  <div className="absolute inset-x-4 sm:inset-x-5 bottom-4 sm:bottom-5">
                    {a.secteur && <p className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide text-orange-tint">{a.secteur}</p>}
                    <h3 className="font-display font-bold text-white text-[15px] sm:text-[18px] mt-1 leading-tight">{a.titre}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Espace de respiration avant le bandeau CTA */}
      <div className="h-8 sm:h-20" />

      <CtaBand />
    </main>
  );
}