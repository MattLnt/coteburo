import Image from "next/image";
import Link from "next/link";

export default function AmbianceBand() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-3xl h-[400px] sm:h-[440px] bg-charcoal">
        <Image src="https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=1900&q=80" alt="Espace de travail aménagé par Côté BURO" fill sizes="(max-width:1400px) 100vw, 1400px" className="object-cover" />
        {/* Dégradé vertical sur mobile : en horizontal, le côté droit du texte
            restait sur une zone claire et devenait illisible. */}
        <div className="absolute inset-0 sm:hidden" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.94) 0%, rgba(33,36,40,0.75) 55%, rgba(33,36,40,0.4) 100%)" }} />
        <div className="absolute inset-0 hidden sm:block" style={{ background: "linear-gradient(90deg, rgba(33,36,40,0.92) 0%, rgba(33,36,40,0.7) 45%, rgba(33,36,40,0.35) 100%)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(240,102,27,0.3),transparent_55%)]" />

        <div className="relative h-full flex items-end sm:items-center px-6 sm:px-12 py-7 sm:py-0">
          <div className="max-w-[560px]">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.22em] text-orange">Aménagement sur-mesure</p>
            <h2 className="font-display font-bold text-white text-[26px] sm:text-4xl lg:text-[46px] leading-[1.1] sm:leading-[1.05] mt-2.5 sm:mt-4">
              Chaque espace raconte une histoire. Écrivons la vôtre.
            </h2>
            <p className="text-white/80 text-[13px] sm:text-base mt-3 sm:mt-5 leading-relaxed">
              Du conseil à l&apos;installation, nous concevons des environnements de travail qui inspirent vos équipes.
            </p>
            <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-8 sm:flex-wrap">
              <Link href="/contact" className="flex-1 sm:flex-none text-center bg-orange text-white font-semibold rounded-full px-4 sm:px-7 py-3 sm:py-3.5 text-[12.5px] sm:text-base hover:bg-orange-dark transition">
                <span className="sm:hidden">Mon projet →</span>
                <span className="hidden sm:inline">Parler de mon projet →</span>
              </Link>
              <Link href="/realisations" className="flex-1 sm:flex-none text-center text-white font-semibold rounded-full px-4 sm:px-7 py-3 sm:py-3.5 text-[12.5px] sm:text-base border border-white/30 hover:bg-white/10 transition">
                <span className="sm:hidden">Réalisations</span>
                <span className="hidden sm:inline">Voir nos réalisations</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}