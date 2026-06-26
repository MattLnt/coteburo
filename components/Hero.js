import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-8 w-full">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>

        {/* Grande carte gauche */}
        <div className="group relative rounded-3xl overflow-hidden bg-charcoal" style={{ height: 520, flex: "2 1 600px", minWidth: 0 }}>
          <Image src="https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=1400&q=80" alt="Espace de travail aménagé par Côté BURO" fill sizes="(max-width:1024px) 100vw, 60vw" className="object-cover transition duration-700 group-hover:scale-105" priority />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.88) 0%, rgba(33,36,40,0.42) 50%, rgba(33,36,40,0.62) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, padding: 44, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">Mobilier de bureau · Aix-en-Provence</p>
              <h1 className="font-display font-bold text-white text-4xl sm:text-5xl leading-[1.05]" style={{ marginTop: 12, maxWidth: 460 }}>Des bureaux qui donnent envie de travailler.</h1>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Voir le catalogue →</Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-white text-ink font-semibold px-6 py-3.5 hover:bg-white/90 transition">Demander un devis</Link>
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "1 1 300px", minWidth: 0 }}>

          {/* Sièges */}
          <div className="group relative rounded-3xl overflow-hidden bg-charcoal" style={{ height: 252 }}>
            <Image src="https://images.unsplash.com/photo-1750306957077-b74e45fe1819?auto=format&fit=crop&w=900&q=80" alt="Sièges & fauteuils" fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.92) 0%, rgba(33,36,40,0.6) 48%, rgba(33,36,40,0.2) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, padding: 28, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <h2 className="font-display font-bold text-white text-2xl">Sièges &amp; fauteuils</h2>
              <Link href="/catalogue/sieges" className="inline-flex items-center gap-2 rounded-full bg-white text-ink font-semibold px-5 py-2.5 text-sm hover:bg-orange hover:text-white transition" style={{ marginTop: 12, alignSelf: "flex-start" }}>Découvrir →</Link>
            </div>
          </div>

          {/* Bureaux */}
          <div className="group relative rounded-3xl overflow-hidden bg-charcoal" style={{ height: 252 }}>
            <Image src="https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=900&q=80" alt="Bureaux & rangements" fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(33,36,40,0.92) 0%, rgba(33,36,40,0.6) 48%, rgba(33,36,40,0.2) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, padding: 28, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <h2 className="font-display font-bold text-white text-2xl">Bureaux &amp; rangements</h2>
              <Link href="/catalogue/bureaux" className="inline-flex items-center gap-2 rounded-full bg-white text-ink font-semibold px-5 py-2.5 text-sm hover:bg-orange hover:text-white transition" style={{ marginTop: 12, alignSelf: "flex-start" }}>Découvrir →</Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
