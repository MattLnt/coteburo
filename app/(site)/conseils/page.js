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

export default async function ConseilsPage() {
  const articles = await prisma.article.findMany({
    where: { publie: true },
    orderBy: { createdAt: "desc" },
  });

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <Link key={a.id} href={`/conseils/${a.slug}`} className="group flex flex-col rounded-[20px] overflow-hidden border border-line bg-surface hover:shadow-[0_20px_50px_-25px_rgba(33,36,40,0.25)] hover:-translate-y-1 transition duration-300">
                <div className="aspect-[16/10] bg-surface-2 overflow-hidden relative">
                  {a.imageUrl ? (
                    <Image src={a.imageUrl} alt={a.titre} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-ink-soft/25">
                      <svg width="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
                    </div>
                  )}
                  {a.categorie && (
                    <span className="absolute top-4 left-4 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-orange-dark">{a.categorie}</span>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-[12.5px] text-ink-soft">{dateFR(a.createdAt)}{a.auteur ? ` · ${a.auteur}` : ""}</p>
                  <h2 className="font-display font-bold text-xl mt-2 leading-snug group-hover:text-orange transition">{a.titre}</h2>
                  {a.extrait && <p className="text-[14px] text-ink-soft mt-2.5 leading-relaxed line-clamp-3 flex-1">{a.extrait}</p>}
                  <span className="inline-flex items-center gap-1.5 text-orange font-semibold text-sm mt-5 group-hover:gap-2.5 transition-all">Lire l&apos;article →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}