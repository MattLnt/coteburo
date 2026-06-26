import Image from "next/image";
import Link from "next/link";

export default function AmbianceBand() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="relative overflow-hidden rounded-3xl h-[400px] sm:h-[440px] bg-charcoal">
        <Image src="https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=1900&q=80" alt="Espace de travail aménagé par Côté BURO" fill sizes="(max-width:1400px) 100vw, 1400px" className="object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(33,36,40,0.92) 0%, rgba(33,36,40,0.7) 45%, rgba(33,36,40,0.35) 100%)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(240,102,27,0.3),transparent_55%)]" />

        <div className="relative h-full flex items-center px-7 sm:px-12">
          <div className="max-w-[560px]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Aménagement sur-mesure</p>
            <h2 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-[46px] leading-[1.05] mt-4">Chaque espace raconte une histoire. Écrivons la vôtre.</h2>
            <p className="text-white/80 text-[15px] sm:text-base mt-5 leading-relaxed">Du conseil à l'installation, nous concevons des environnements de travail qui inspirent vos équipes et renforcent votre image.</p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/contact" className="bg-orange text-white font-semibold rounded-full px-7 py-3.5 hover:bg-orange-dark transition">Parler de mon projet →</Link>
              <Link href="/realisations" className="text-white font-semibold rounded-full px-7 py-3.5 border border-white/30 hover:bg-white/10 transition">Voir nos réalisations</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}