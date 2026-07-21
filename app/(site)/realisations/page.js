import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Réalisations",
  description:
    "Découvrez les aménagements de bureaux réalisés par Côté BURO en région PACA : cabinets, open spaces, sièges sociaux et espaces d'accueil.",
  alternates: { canonical: "/realisations" },
};

// Extrait texte brut à partir du récit HTML (Tiptap) — pour l'aperçu sous le titre
function extraitDuRecit(html, longueur = 150) {
  if (!html) return null;
  const texte = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!texte) return null;
  return texte.length > longueur ? texte.slice(0, longueur).trim() + "…" : texte;
}

export default async function RealisationsPage() {
  const realisations = await prisma.realisation.findMany({
    where: { publie: true },
    orderBy: [{ ordre: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <div className="mx-auto max-w-[1440px] px-5 sm:px-7">
        {/* En-tête */}
        <div className="pt-20 pb-16">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-orange mb-4">Nos réalisations</p>
          <h1 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] tracking-[-0.02em] max-w-3xl">Des espaces qui ont pris vie</h1>
          <p className="text-ink-soft text-lg mt-5 max-w-[540px]">
            Quelques aménagements livrés clés en main par nos équipes en région PACA — du cabinet au grand plateau.
          </p>
        </div>

        {/* Liste — une section par réalisation, alternée */}
        {realisations.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center mb-20">
            <p className="text-ink-soft">Nos réalisations seront bientôt présentées ici.</p>
            <Link href="/devis" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Demander un devis →</Link>
          </div>
        ) : (
          realisations.map((r, i) => {
            const inverse = i % 2 === 1;
            const extrait = extraitDuRecit(r.recit);
            return (
              <div key={r.id} className={`grid lg:grid-cols-2 items-center gap-10 lg:gap-16 py-16 lg:py-20 border-t border-line ${inverse ? "" : ""}`}>
                <Link
                  href={`/realisations/${r.slug}`}
                  className={`group relative rounded-[26px] overflow-hidden aspect-[4/3.3] ${inverse ? "lg:order-2" : ""}`}
                >
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.titre} className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="w-full h-full bg-surface-2 grid place-items-center text-ink-soft/25">
                      <svg width="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
                    </div>
                  )}
                  <span className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-white/95 text-ink text-[13px] font-bold px-5 py-2.5 opacity-0 translate-y-1.5 transition duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    Voir le projet
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </Link>

                <div className={inverse ? "lg:order-1" : ""}>
                  <p className="font-display font-bold text-[15px] text-orange flex items-center gap-3 mb-5">
                    {String(i + 1).padStart(2, "0")}{r.secteur ? ` · ${r.secteur}` : ""}
                    <span className="w-10 h-px bg-line hidden sm:inline-block" />
                  </p>
                  <h2 className="font-display font-bold text-[28px] sm:text-4xl leading-tight tracking-[-0.01em] mb-5">
                    <Link href={`/realisations/${r.slug}`} className="hover:text-orange transition">{r.titre}</Link>
                  </h2>
                  {(r.client || r.surface) && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {r.client && <span className="text-[12px] font-semibold rounded-full bg-orange-tint text-orange-dark px-3.5 py-1.5">{r.client}</span>}
                      {r.surface && <span className="text-[12px] font-semibold rounded-full border border-line text-ink-soft px-3.5 py-1.5">{r.surface}</span>}
                    </div>
                  )}
                  {extrait && <p className="text-[15.5px] text-ink-soft leading-relaxed max-w-[440px] mb-6">{extrait}</p>}
                  <Link href={`/realisations/${r.slug}`} className="group/lien inline-flex items-center gap-2.5 font-bold text-[14px] text-ink">
                    Découvrir le projet
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="transition group-hover/lien:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                </div>
              </div>
            );
          })
        )}

        {/* CTA final */}
        <div className="relative overflow-hidden rounded-[28px] bg-charcoal text-center px-10 sm:px-14 py-16 sm:py-[72px] mt-4 mb-20">
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.3), transparent 70%)" }} />
          <p className="relative text-[11.5px] font-bold uppercase tracking-[0.2em] text-[#ffb98a]">Vous avez un projet ?</p>
          <h2 className="relative font-display font-bold text-white text-3xl sm:text-[42px] mt-4 max-w-[640px] mx-auto">Parlons-en autour d'un café.</h2>
          <p className="relative text-[#c4c9d0] text-[16px] mt-4 max-w-[520px] mx-auto">
            Nos experts vous accompagnent sur l'aménagement de vos bureaux — d'un poste isolé à plusieurs centaines de m².
          </p>
          <Link href="/devis" className="relative inline-flex items-center gap-2.5 mt-8 bg-orange text-white font-bold text-[15px] px-8 py-4 rounded-full hover:bg-orange-dark transition">
            Demander un devis →
          </Link>
        </div>
      </div>
    </main>
  );
}