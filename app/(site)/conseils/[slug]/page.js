import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const dateCourte = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article) return { title: "Article introuvable" };
  return {
    title: article.titre,
    description: article.extrait || undefined,
    alternates: { canonical: `/conseils/${slug}` },
    openGraph: article.imageUrl ? { images: [article.imageUrl] } : undefined,
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article || !article.publie) notFound();

  const autres = await prisma.article.findMany({
    where: { publie: true, slug: { not: slug } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <main className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-5 sm:pt-10 pb-12 sm:pb-20">
      {/* Fil d'ariane — « Accueil » masqué sur mobile, la ligne débordait */}
      <div className="text-[11.5px] sm:text-sm text-ink-soft mb-5 sm:mb-8">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link href="/" className="hidden sm:inline hover:text-orange">Accueil</Link>
          <span className="hidden sm:inline text-ink-soft/40">/</span>
          <Link href="/conseils" className="hover:text-orange whitespace-nowrap shrink-0">Conseils</Link>
          <span className="text-ink-soft/40 shrink-0">/</span>
          <span className="text-ink truncate min-w-0">{article.titre}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 xl:gap-14 items-start">
        {/* ───── Article ───── */}
        <article className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 text-[11.5px] sm:text-[13px] flex-wrap">
            {article.categorie && <span className="font-bold uppercase tracking-wide text-orange">{article.categorie}</span>}
            <span className="text-ink-soft">{dateFR(article.createdAt)}</span>
            {article.auteur && <><span className="text-ink-soft/40">·</span><span className="text-ink-soft">{article.auteur}</span></>}
          </div>
          <h1 className="font-display font-bold text-[27px] sm:text-4xl lg:text-5xl mt-2.5 sm:mt-4 leading-tight">{article.titre}</h1>
          {article.extrait && <p className="text-ink-soft text-[14px] sm:text-lg mt-3 sm:mt-4 leading-relaxed">{article.extrait}</p>}

          {article.imageUrl && (
            <div className="rounded-[16px] sm:rounded-[24px] overflow-hidden border border-line mt-5 sm:mt-8 aspect-[16/9] relative">
              <Image src={article.imageUrl} alt={article.titre} fill sizes="(max-width:1024px) 100vw, 900px" className="object-cover" priority />
            </div>
          )}

          <div className="article-contenu mt-6 sm:mt-9" dangerouslySetInnerHTML={{ __html: article.contenu }} />

          {/* Retour */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-line">
            <Link href="/conseils" className="inline-flex items-center gap-2 text-orange font-semibold text-[13.5px] sm:text-base hover:gap-3 transition-all">← Tous les articles</Link>
          </div>
        </article>

        {/* ───── Sidebar ───── */}
        <aside className="lg:sticky lg:top-24 flex flex-col gap-3 sm:gap-6">
          {/* Derniers articles */}
          {autres.length > 0 && (
            <div className="rounded-[18px] sm:rounded-[22px] border border-line bg-surface p-4 sm:p-6">
              <h2 className="font-display font-bold text-[16px] sm:text-lg mb-4 sm:mb-5">Derniers articles</h2>
              <div className="flex flex-col gap-4 sm:gap-5">
                {autres.map((a) => (
                  <Link key={a.id} href={`/conseils/${a.slug}`} className="group flex gap-3 sm:gap-4 items-center">
                    <div className="w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-2 shrink-0 relative">
                      {a.imageUrl ? (
                        <Image src={a.imageUrl} alt={a.titre} fill sizes="80px" className="object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-ink-soft/25">
                          <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      {a.categorie && <p className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wide text-orange">{a.categorie}</p>}
                      <p className="font-semibold text-[13px] sm:text-[14px] text-ink leading-snug mt-0.5 line-clamp-2 group-hover:text-orange transition">{a.titre}</p>
                      <p className="text-[11px] sm:text-[12px] text-ink-soft mt-1">{dateCourte(a.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Encart contact premium */}
          <div className="rounded-[18px] sm:rounded-[22px] bg-charcoal p-5 sm:p-7 relative overflow-hidden">
            <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />
            <div className="relative">
              <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-white/10 border border-white/15 mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.8"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
              </span>
              <h3 className="font-display font-bold text-[17px] sm:text-xl text-white leading-snug">Un projet d&apos;aménagement ?</h3>
              <p className="text-white/60 text-[12.5px] sm:text-[14px] mt-2 leading-relaxed">Nos experts vous accompagnent de la conception à l&apos;installation. Recevez un devis gratuit et sur mesure.</p>
              <div className="flex sm:flex-col gap-2 sm:gap-0 mt-4 sm:mt-5">
                <Link href="/devis" className="flex-1 text-center rounded-full bg-orange text-white font-semibold px-4 sm:px-5 py-3 text-[12.5px] sm:text-base hover:bg-orange-dark transition">
                  <span className="sm:hidden">Devis gratuit</span>
                  <span className="hidden sm:inline">Demander un devis →</span>
                </Link>
                <a href="tel:0781020631" className="flex-1 text-center rounded-full border border-white/20 text-white font-semibold px-4 sm:px-5 py-3 text-[12.5px] sm:text-base sm:mt-3 hover:bg-white/10 transition">
                  <span className="sm:hidden">Appeler</span>
                  <span className="hidden sm:inline">07 81 02 06 31</span>
                </a>
              </div>
            </div>
          </div>

          {/* Encart showroom */}
          <div className="rounded-[18px] sm:rounded-[22px] border border-line bg-orange-tint p-4 sm:p-6">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-orange-dark mb-2">Notre showroom</p>
            <p className="font-display font-bold text-ink text-[14.5px] sm:text-base leading-snug">Venez tester nos produits à Aix-en-Provence</p>
            <p className="text-[12px] sm:text-[13px] text-ink-soft mt-2 leading-relaxed">TECH&apos;INDUS — Bât D, Porte 8<br />645 rue Mayor de Montricher</p>
            <Link href="/contact" className="inline-flex items-center gap-1.5 text-orange-dark font-semibold text-[12.5px] sm:text-sm mt-3 hover:gap-2.5 transition-all">Nous trouver →</Link>
          </div>
        </aside>
      </div>

      {/* Styles du contenu riche — tailles réduites sur mobile */}
      <style>{`
        .article-contenu { font-size: 14.5px; line-height: 1.75; color: #23262a; }
        .article-contenu h2 { font-family: var(--font-display); font-size: 21px; font-weight: 700; margin: 26px 0 10px; color: #23262a; line-height: 1.3; }
        .article-contenu h3 { font-family: var(--font-display); font-size: 17.5px; font-weight: 700; margin: 22px 0 8px; color: #23262a; line-height: 1.35; }
        .article-contenu p { margin: 14px 0; }
        .article-contenu ul { list-style: disc; padding-left: 20px; margin: 14px 0; }
        .article-contenu ol { list-style: decimal; padding-left: 20px; margin: 14px 0; }
        .article-contenu li { margin: 6px 0; }
        .article-contenu a { color: #f0661b; text-decoration: underline; }
        .article-contenu a:hover { color: #d9551a; }
        .article-contenu blockquote { border-left: 3px solid #f0661b; padding-left: 16px; margin: 20px 0; color: #5c616a; font-style: italic; font-size: 15.5px; }
        .article-contenu img { border-radius: 14px; max-width: 100%; height: auto; margin: 20px 0; }
        .article-contenu strong { font-weight: 700; }

        @media (min-width: 640px) {
          .article-contenu { font-size: 16.5px; line-height: 1.8; }
          .article-contenu h2 { font-size: 26px; margin: 32px 0 12px; }
          .article-contenu h3 { font-size: 21px; margin: 26px 0 10px; }
          .article-contenu p { margin: 16px 0; }
          .article-contenu ul, .article-contenu ol { padding-left: 26px; margin: 16px 0; }
          .article-contenu blockquote { padding-left: 20px; margin: 22px 0; font-size: 18px; }
          .article-contenu img { border-radius: 16px; margin: 24px 0; }
        }
      `}</style>
    </main>
  );
}