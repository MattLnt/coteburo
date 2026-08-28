import Image from "next/image";
import Link from "next/link";

const REALS = [
  { secteur: "Cabinet médical", titre: "Sophia Santé", client: "Centre de consultations · 320 m²", image: "https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=800&q=80" },
  { secteur: "Open space", titre: "Provence Avocats", client: "Cabinet d'avocats · 18 postes", image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=800&q=80" },
  { secteur: "Domaine viticole", titre: "Château Mistral", client: "Bureaux & accueil · 240 m²", image: "https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=800&q=80" },
];

export default function Realisations() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 flex items-end justify-between gap-4 mb-4 sm:mb-8">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos réalisations</p>
          <h2 className="font-display font-bold text-ink text-[21px] sm:text-3xl mt-1 sm:mt-1.5">Des espaces qui ont pris vie</h2>
        </div>
        <Link href="/realisations" className="text-orange font-semibold whitespace-nowrap text-[12.5px] sm:text-[15px] hover:text-orange-dark transition">
          <span className="sm:hidden">Tout voir →</span>
          <span className="hidden sm:inline">Toutes les réalisations →</span>
        </Link>
      </div>

      {/* Défilement horizontal sur mobile : trois cartes de 340px empilées
          faisaient plus de 1000px de haut pour un bloc secondaire. */}
      <div className="mx-auto max-w-[1400px] flex md:grid md:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto md:overflow-visible px-5 sm:px-7 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none]">
        {REALS.map((r, i) => (
          <Link key={i} href="/realisations" className="group relative block shrink-0 md:shrink w-[270px] md:w-auto h-[250px] sm:h-[340px] rounded-[18px] sm:rounded-3xl overflow-hidden bg-charcoal [scroll-snap-align:start]">
            <Image src={r.image} alt={r.titre} fill sizes="(max-width:768px) 270px, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.9) 0%, rgba(33,36,40,0.25) 55%, rgba(33,36,40,0.1) 100%)" }} />
            <span className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 bg-orange/90 text-white text-[10px] sm:text-[11px] font-bold tracking-wide uppercase px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">{r.secteur}</span>
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <h3 className="font-display font-bold text-white text-[19px] sm:text-2xl">{r.titre}</h3>
              <p className="text-white/75 text-[11.5px] sm:text-[13px] mt-1">{r.client}</p>
              <span className="inline-flex items-center gap-1.5 text-white text-[12px] sm:text-[13px] font-semibold mt-2.5 sm:mt-3 group-hover:gap-2.5 transition-all">Voir l&apos;aménagement <span>→</span></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}