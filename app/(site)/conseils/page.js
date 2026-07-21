import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conseils & actualités",
  description: "Conseils d'aménagement, tendances et actualités du mobilier de bureau par Côté BURO, spécialiste à Aix-en-Provence.",
  alternates: { canonical: "/conseils" },
};

const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const gradientCouches = (
  <>
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, rgba(20,21,23,0.08) 0%, rgba(20,21,23,0.2) 30%, rgba(15,16,18,0.72) 62%, rgba(12,13,14,0.94) 100%)" }}
    />
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(100deg, rgba(10,11,12,0.62) 0%, rgba(10,11,12,0.4) 30%, rgba(10,11,12,0) 60%)" }}
    />
  </>
);

export default async function ConseilsPage() {
  const articles = await prisma.article.findMany({ where: { publie: true }, orderBy: { createdAt: "desc" } });

  const [premier, ...autresArticles] = articles;

  return (
    <main>
      {/* En-tête */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-14 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Le blog</p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3">Conseils & actualités</h1>
        <p className="text-ink-soft text-lg mt-5 max-w-[600px]">
          Nos conseils d&apos;experts pour aménager vos espaces de travail, les dernières tendances et les actualités de Côté BURO.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20">
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <p className="text-ink-soft">Nos premiers articles arrivent bientôt.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-10 xl:gap-14 items-start">
            {/* ───── Colonne principale ───── */}
            <div className="min-w-0">
              {/* À la une — le dernier article, pleine largeur */}
              <Link href={`/conseils/${premier.slug}`} className="group relative block h-[340px] sm:h-[440px] rounded-[24px] overflow-hidden mb-10">
                {premier.imageUrl ? (
                  <Image src={premier.imageUrl} alt={premier.titre} fill sizes="(max-width:1024px) 100vw, 70vw" className="object-cover group-hover:scale-[1.03] transition duration-500" priority />
                ) : (
                  <div className="absolute inset-0 bg-surface-2" />
                )}
                {gradientCouches}
                <div className="absolute inset-x-7 sm:inset-x-10 bottom-7 sm:bottom-10">
                  {premier.categorie && (
                    <span className="inline-block rounded-full bg-orange px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white mb-4">{premier.categorie}</span>
                  )}
                  <h2 className="font-display font-bold text-white text-2xl sm:text-[32px] leading-tight max-w-2xl">{premier.titre}</h2>
                  <p className="text-white/70 text-[13.5px] mt-3">{dateFR(premier.createdAt)}{premier.auteur ? ` · ${premier.auteur}` : ""}</p>
                </div>
              </Link>

              {/* Grille — image plein cadre, texte en superposition */}
              {autresArticles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {autresArticles.map((a) => (
                    <Link key={a.id} href={`/conseils/${a.slug}`} className="group relative aspect-[4/3.2] rounded-[20px] overflow-hidden">
                      {a.imageUrl ? (
                        <Image src={a.imageUrl} alt={a.titre} fill sizes="(max-width:640px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-surface-2" />
                      )}
                      {gradientCouches}
                      {a.categorie && (
                        <span className="absolute top-4 left-4 rounded-full bg-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{a.categorie}</span>
                      )}
                      <div className="absolute inset-x-5 bottom-5">
                        <h3 className="font-display font-bold text-white text-[18px] leading-snug line-clamp-2">{a.titre}</h3>
                        <p className="text-white/70 text-[12px] mt-2">{dateFR(a.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ───── Sidebar — collante, sous le header sticky (≈130px de haut) ───── */}
            <aside className="lg:sticky lg:top-[220px] flex flex-col gap-6">
              {/* Encart contact premium */}
              <div className="rounded-[22px] bg-charcoal p-7 relative overflow-hidden">
                <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />
                <div className="relative">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 border border-white/15 mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.8"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  </span>
                  <h3 className="font-display font-bold text-xl text-white leading-snug">Un projet d&apos;aménagement ?</h3>
                  <p className="text-white/60 text-[14px] mt-2 leading-relaxed">Nos experts vous accompagnent de la conception à l&apos;installation. Recevez un devis gratuit et sur mesure.</p>
                  <Link href="/devis" className="block text-center rounded-full bg-orange text-white font-semibold px-5 py-3 mt-5 hover:bg-orange-dark transition">Demander un devis →</Link>
                  <a href="tel:0781020631" className="block text-center rounded-full border border-white/20 text-white font-semibold px-5 py-3 mt-3 hover:bg-white/10 transition">07 81 02 06 31</a>
                </div>
              </div>

              {/* Encart showroom */}
              <div className="rounded-[22px] border border-line bg-orange-tint p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-dark mb-2">Notre showroom</p>
                <p className="font-display font-bold text-ink leading-snug">Venez tester nos produits à Aix-en-Provence</p>
                <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">TECH&apos;INDUS — Bât D, Porte 8<br />645 rue Mayor de Montricher</p>
                <Link href="/contact" className="inline-flex items-center gap-1.5 text-orange-dark font-semibold text-sm mt-3 hover:gap-2.5 transition-all">Nous trouver →</Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}