import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CtaBand from "@/components/CtaBand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Réalisations",
  description:
    "Découvrez les aménagements de bureaux réalisés par Côté BURO en région PACA : cabinets, open spaces, sièges sociaux et espaces d'accueil.",
  alternates: { canonical: "/realisations" },
};

export default async function RealisationsPage() {
  const realisations = await prisma.realisation.findMany({
    where: { publie: true },
    orderBy: [{ ordre: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-14 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos réalisations</p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3 max-w-3xl">Des espaces qui ont pris vie</h1>
        <p className="text-ink-soft text-lg mt-5 max-w-[580px]">
          Quelques aménagements livrés clés en main par nos équipes en région PACA — du cabinet au grand plateau.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-16">
        {realisations.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-12 text-center">
            <p className="text-ink-soft">Nos réalisations seront bientôt présentées ici.</p>
            <Link href="/devis" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Demander un devis →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {realisations.map((it) => (
              <div key={it.id} className="group relative flex flex-col justify-end overflow-hidden rounded-[24px] border border-line aspect-[4/3.2]">
                {it.imageUrl ? (
                  <Image src={it.imageUrl} alt={it.titre} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-surface-2 grid place-items-center text-ink-soft/25">
                    <svg width="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-charcoal/5 via-charcoal/30 to-charcoal/85" />
                {it.secteur && <span className="absolute top-5 left-5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-orange">{it.secteur}</span>}
                <div className="relative p-6 text-white">
                  <h3 className="font-display font-bold text-[22px]">{it.titre}</h3>
                  <p className="text-[13px] text-white/80 mt-1">{[it.client, it.surface].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CtaBand />
    </main>
  );
}