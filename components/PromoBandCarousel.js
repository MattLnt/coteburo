"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

export default function PromoBandCarousel({ promos }) {
  const [start, setStart] = useState(0);
  const pause = useRef(false);
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

  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="flex flex-wrap items-stretch gap-5">

        {/* Colonne gauche 60% : carrousel 3 produits */}
        <div className="flex-[3] basis-[560px] min-w-0" onMouseEnter={() => (pause.current = true)} onMouseLeave={() => (pause.current = false)}>
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Bons plans</p>
              <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">En promotion</h2>
            </div>
            {n > 3 && (
              <div className="flex gap-2.5">
                <button onClick={prev} aria-label="Précédent" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button onClick={next} aria-label="Suivant" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {visible.map((p, i) => (
              <ProductCard
                key={`${start}-${i}-${p.codeRacine}`}
                href={`/produit/${p.slug || p.codeRacine}`}
                brand={p.brand}
                name={p.name}
                attr={p.attr}
                images={p.images}
                price={p.price}
                oldPrice={p.oldPrice}
                promo={p.promo}
              />
            ))}
          </div>
        </div>

        {/* Colonne droite 40% : encadré promo */}
        <div className="flex-[2] basis-[360px] min-w-0 relative overflow-hidden rounded-3xl p-10 bg-charcoal flex flex-col justify-center">
          <div className="absolute w-[420px] h-[420px] rounded-full -right-[150px] -top-[180px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.55),transparent_65%)]" />
          <span className="relative text-orange text-xs font-bold tracking-[0.22em] uppercase">Offres du moment</span>
          <h2 className="relative font-display font-bold text-white text-[34px] leading-tight mt-3">Des prix <span className="text-orange">réduits</span> sur une sélection</h2>
          <p className="relative text-[#c4c9d0] mt-3.5 text-[15px]">Sièges, bureaux et rangements en promotion — livrés et montés en région PACA.</p>
          <div className="relative flex flex-wrap gap-3 mt-6">
            <Link href="/catalogue" className="bg-orange text-white font-semibold rounded-full px-6 py-3 hover:bg-orange-dark transition">Voir le catalogue →</Link>
          </div>
        </div>

      </div>
    </section>
  );
}