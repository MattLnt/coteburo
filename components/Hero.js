import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-5 sm:pt-8 w-full">
      <div className="flex flex-wrap gap-2.5 sm:gap-4">

        {/* Grande carte gauche — 520px sur mobile occupaient tout l'écran */}
        <div className="group relative rounded-[20px] sm:rounded-3xl overflow-hidden bg-charcoal h-[360px] lg:h-[520px] flex-[2_1_600px] min-w-0">
          <Image src="https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=1400&q=80" alt="Espace de travail aménagé par Côté BURO" fill sizes="(max-width:1024px) 100vw, 60vw" className="object-cover transition duration-700 group-hover:scale-105" priority />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.88) 0%, rgba(33,36,40,0.42) 50%, rgba(33,36,40,0.62) 100%)" }} />
          <div className="absolute inset-0 p-[22px] sm:p-11 flex flex-col justify-between">
            <div>
              <p className="text-[9px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.22em] text-white/85">Mobilier de bureau · Aix-en-Provence</p>
              <h1 className="font-display font-bold text-white text-[29px] sm:text-5xl leading-[1.08] sm:leading-[1.05] mt-2.5 sm:mt-3 max-w-[460px]">
                Des bureaux qui donnent envie de travailler.
              </h1>
            </div>
            <div className="flex gap-2 sm:gap-3 sm:flex-wrap">
              <Link href="/catalogue" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-orange text-white font-semibold px-4 sm:px-6 py-3 sm:py-3.5 text-[12.5px] sm:text-base hover:bg-orange-dark transition">
                <span className="sm:hidden">Catalogue →</span>
                <span className="hidden sm:inline">Voir le catalogue →</span>
              </Link>
              <Link href="/contact" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-white text-ink font-semibold px-4 sm:px-6 py-3 sm:py-3.5 text-[12.5px] sm:text-base hover:bg-white/90 transition">
                <span className="sm:hidden">Devis</span>
                <span className="hidden sm:inline">Demander un devis</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Colonne droite — les deux cartes passent côte à côte sur mobile */}
        <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2.5 sm:gap-4 flex-[1_1_300px] min-w-0 w-full lg:w-auto">

          {/* Sièges */}
          <div className="group relative rounded-[20px] sm:rounded-3xl overflow-hidden bg-charcoal h-[165px] lg:h-[252px]">
            <Image src="https://images.unsplash.com/photo-1750306957077-b74e45fe1819?auto=format&fit=crop&w=900&q=80" alt="Sièges & fauteuils" fill sizes="(max-width:1024px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.92) 0%, rgba(33,36,40,0.6) 48%, rgba(33,36,40,0.2) 100%)" }} />
            <div className="absolute inset-0 p-3.5 sm:p-7 flex flex-col justify-end">
              <h2 className="font-display font-bold text-white text-[15px] sm:text-2xl leading-tight">Sièges &amp; fauteuils</h2>
              <Link href="/catalogue?categorie=sieges" className="inline-flex items-center gap-1.5 rounded-full bg-white text-ink font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 text-[11px] sm:text-sm hover:bg-orange hover:text-white transition mt-2 sm:mt-3 self-start">Découvrir →</Link>
            </div>
          </div>

          {/* Bureaux */}
          <div className="group relative rounded-[20px] sm:rounded-3xl overflow-hidden bg-charcoal h-[165px] lg:h-[252px]">
            <Image src="https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=900&q=80" alt="Bureaux & rangements" fill sizes="(max-width:1024px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.92) 0%, rgba(33,36,40,0.6) 48%, rgba(33,36,40,0.2) 100%)" }} />
            <div className="absolute inset-0 p-3.5 sm:p-7 flex flex-col justify-end">
              <h2 className="font-display font-bold text-white text-[15px] sm:text-2xl leading-tight">Bureaux &amp; rangements</h2>
              <Link href="/catalogue?categorie=bureaux" className="inline-flex items-center gap-1.5 rounded-full bg-white text-ink font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 text-[11px] sm:text-sm hover:bg-orange hover:text-white transition mt-2 sm:mt-3 self-start">Découvrir →</Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}