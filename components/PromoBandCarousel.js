"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

export default function PromoBandCarousel({ promos, favorisCodes = [], favorisVitrines = [], connecte = false }) {
  const [start, setStart] = useState(0);
  const pause = useRef(false);
  const favSetCodes = useMemo(() => new Set(favorisCodes), [favorisCodes]);
  const favSetVitrines = useMemo(() => new Set(favorisVitrines), [favorisVitrines]);
  const n = promos.length;

  const next = () => setStart((s) => (s + 1) % n);
  const prev = () => setStart((s) => (s - 1 + n) % n);

  useEffect(() => {
    if (n <= 3) return;
    const id = setInterval(() => { if (!pause.current) setStart((s) => (s + 1) % n); }, 4000);
    return () => clearInterval(id);
  }, [n]);

  const visible = n <= 3 ? promos : [
    promos[start],
    promos[(start + 1) % n],
    promos[(start + 2) % n],
  ];

  const carte = (p, cle) => (
    <ProductCard
      key={cle}
      href={p.href}
      codeRacine={p.estNouveau ? undefined : p.codeRacine}
      vitrineId={p.estNouveau ? p.codeRacine : undefined}
      favori={p.estNouveau ? favSetVitrines.has(p.codeRacine) : favSetCodes.has(p.codeRacine)}
      connecte={connecte}
      brand={p.brand}
      name={p.name}
      attr={p.attr}
      images={p.images}
      price={p.price}
      oldPrice={p.oldPrice}
      promo={p.promo}
    />
  );

  return (
    <section className="w-full">
      <div className="mx-auto max-w-[1400px] flex flex-wrap items-stretch gap-4 sm:gap-5 px-5 sm:px-7">

        {/* Encadré promo — remonté en premier sur mobile : c'est l'accroche */}
        <div className="order-1 lg:order-2 flex-[2] basis-full lg:basis-[360px] min-w-0 relative overflow-hidden rounded-[20px] sm:rounded-3xl p-6 sm:p-10 bg-charcoal flex flex-col justify-center">
          <div className="absolute w-[420px] h-[420px] rounded-full -right-[150px] -top-[180px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.55),transparent_65%)]" />
          <span className="relative text-orange text-[10px] sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.22em] uppercase">Offres du moment</span>
          <h2 className="relative font-display font-bold text-white text-[25px] sm:text-[34px] leading-tight mt-2 sm:mt-3">Des prix <span className="text-orange">réduits</span> sur une sélection</h2>
          <p className="relative text-[#c4c9d0] mt-2.5 sm:mt-3.5 text-[13px] sm:text-[15px] leading-relaxed">Sièges, bureaux et rangements en promotion — livrés et montés en région PACA.</p>
          <div className="relative flex flex-wrap gap-3 mt-4 sm:mt-6">
            <Link href="/catalogue" className="bg-orange text-white font-semibold rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-[12.5px] sm:text-base hover:bg-orange-dark transition">Voir le catalogue →</Link>
          </div>
        </div>

        {/* Carrousel produits */}
        <div className="order-2 lg:order-1 flex-[3] basis-full lg:basis-[560px] min-w-0" onMouseEnter={() => (pause.current = true)} onMouseLeave={() => (pause.current = false)}>
          <div className="flex items-end justify-between gap-4 mb-3.5 sm:mb-5">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Bons plans</p>
              <h2 className="font-display font-bold text-ink text-[21px] sm:text-3xl mt-1 sm:mt-1.5">En promotion</h2>
            </div>
            {/* Flèches masquées sur mobile : on fait glisser au doigt */}
            {n > 3 && (
              <div className="hidden lg:flex gap-2.5">
                <button onClick={prev} aria-label="Précédent" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button onClick={next} aria-label="Suivant" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Mobile : toutes les promos en défilement libre. La rotation
              automatique de trois cartes n'a pas de sens quand on peut glisser. */}
          <div className="lg:hidden -mx-5 px-5 flex gap-3 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory]">
            {promos.map((p, i) => (
              <div key={p.id} className="shrink-0 w-[220px] [scroll-snap-align:start]">
                {carte(p, `m-${i}-${p.id}`)}
              </div>
            ))}
          </div>

          {/* Desktop : rotation automatique de trois cartes */}
          <div className="hidden lg:grid grid-cols-3 gap-5">
            {visible.map((p, i) => carte(p, `${start}-${i}-${p.id}`))}
          </div>
        </div>

      </div>
    </section>
  );
}