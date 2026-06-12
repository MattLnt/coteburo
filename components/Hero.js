import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 py-14 lg:py-20">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">
        {/* Texte */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">
            Aménagement d&apos;espaces de travail · Aix-en-Provence
          </p>
          <h1 className="font-display font-bold text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem] mt-4">
            Des bureaux qui donnent envie de <span className="text-orange">travailler autrement.</span>
          </h1>
          <p className="text-ink-soft text-lg mt-6 max-w-[480px]">
            Conseil, mobilier et installation sur-mesure. Nous concevons des espaces qui inspirent
            vos équipes, favorisent leur bien-être et renforcent votre image de marque.
          </p>

          <div className="flex flex-wrap gap-3.5 mt-8">
            <Link href="/devis" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark hover:-translate-y-0.5 transition">
              Demander un devis →
            </Link>
            <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full border border-line font-semibold px-6 py-3.5 hover:bg-ink hover:text-white transition">
              Découvrir le catalogue
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-9 gap-y-5 mt-10">
            <Stat value="+20" unit="ans" label="d'expérience" />
            <Stat value="7" unit="ans" label="de garantie offerte" />
            <Stat value="3D" label="plan d'aménagement" />
          </div>
        </div>

        {/* Visuel */}
        <div className="relative aspect-[1/1.02] rounded-[24px] overflow-hidden border border-line shadow-[0_30px_70px_-25px_rgba(33,36,40,0.28)]">
          <Image
            src="https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=1100&q=80"
            alt="Espace de travail aménagé par Côté BURO"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal/35" />

          {/* chips flottantes */}
          <Chip className="top-[8%] left-[-3%] animate-float" title="Plan 3D offert" sub="Projetez vos espaces">
            <path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" />
          </Chip>
          <Chip className="bottom-[14%] right-[-4%] animate-float [animation-delay:0.8s]" title="Livraison & montage" sub="Partout en PACA">
            <path d="m20 6-11 11-5-5" />
          </Chip>
          <Chip className="bottom-[5%] left-[7%] animate-float [animation-delay:1.6s]" title="Garantie 7 ans" sub="Équipement pro">
            <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" />
          </Chip>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, unit, label }) {
  return (
    <div>
      <p className="font-display font-bold text-2xl sm:text-[1.7rem] leading-none">
        {value}{unit && <span className="text-orange"> {unit}</span>}
      </p>
      <p className="text-[13px] text-ink-soft mt-1">{label}</p>
    </div>
  );
}

function Chip({ className, title, sub, children }) {
  return (
    <div className={`absolute flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur border border-line px-3.5 py-2.5 shadow-[0_8px_30px_rgba(33,36,40,0.10)] ${className}`}>
      <span className="grid place-items-center h-[30px] w-[30px] rounded-[9px] bg-orange-tint text-orange-dark shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{children}</svg>
      </span>
      <span>
        <span className="block font-display font-bold text-[15px] leading-tight">{title}</span>
        <span className="block text-xs text-ink-soft">{sub}</span>
      </span>
    </div>
  );
}