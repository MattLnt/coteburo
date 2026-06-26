"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

const PROMOS = [
  { href: "/catalogue/sieges", brand: "OfficePro", name: "Fauteuil ergonomique Atlas", attr: "Dossier maille · accoudoirs 4D", price: "263,20 €", oldPrice: "329,00 €", promo: "-20%" },
  { href: "/catalogue/sieges", brand: "Buronomic", name: "Fauteuil direction Filo", attr: "Structure noire · cuir noir", price: "405,00 €", oldPrice: "540,00 €", promo: "-25%" },
  { href: "/catalogue/rangements", brand: "Buronomic", name: "Armoire haute Confidence", attr: "Portes battantes · serrure", price: "419,00 €", oldPrice: "490,00 €", promo: "-14%" },
  { href: "/catalogue/sieges", brand: "Buronomic", name: "Chaise réunion Taurus", attr: "Empilable · 4 pieds chromés", price: "52,70 €", oldPrice: "62,00 €", promo: "-15%" },
  { href: "/catalogue/bureaux", brand: "OfficePro", name: "Bureau bench Duo", attr: "2 postes · voile de fond", price: "624,00 €", oldPrice: "734,00 €", promo: "-15%" },
  { href: "/catalogue/tables", brand: "Sokoa", name: "Table de réunion Ovale", attr: "10 personnes · piètement chromé", price: "586,00 €", oldPrice: "690,00 €", promo: "-15%" },
  { href: "/catalogue/sieges", brand: "Sokoa", name: "Fauteuil ergonomique Horra", attr: "Mécanisme synchrone · maille", price: "330,00 €", oldPrice: "389,00 €", promo: "-15%" },
  { href: "/catalogue/rangements", brand: "OfficePro", name: "Caisson mobile Trio", attr: "3 tiroirs · fermeture à clé", price: "160,00 €", oldPrice: "189,00 €", promo: "-15%" },
  { href: "/catalogue/bureaux", brand: "Buronomic", name: "Bureau d'angle Atria", attr: "Retour à gauche · chêne nebraska", price: "392,00 €", oldPrice: "461,00 €", promo: "-15%" },
];

export default function PromoBand() {
  const [start, setStart] = useState(0);
  const pause = useRef(false);

  const next = () => setStart((s) => (s + 1) % PROMOS.length);
  const prev = () => setStart((s) => (s - 1 + PROMOS.length) % PROMOS.length);

  useEffect(() => {
    const id = setInterval(() => { if (!pause.current) next(); }, 4000);
    return () => clearInterval(id);
  }, []);

  const visible = [PROMOS[start], PROMOS[(start + 1) % PROMOS.length]];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 w-full">
      <div className="flex flex-wrap items-stretch gap-5">

        <div className="flex-1 basis-[460px] min-w-0" onMouseEnter={() => (pause.current = true)} onMouseLeave={() => (pause.current = false)}>
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Bons plans</p>
              <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">En promotion</h2>
            </div>
            <div className="flex gap-2.5">
              <button onClick={prev} aria-label="Précédent" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button onClick={next} aria-label="Suivant" className="w-[42px] h-[42px] rounded-full grid place-items-center bg-surface border border-line text-ink hover:border-orange hover:text-orange transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {visible.map((p, i) => (
              <ProductCard key={`${start}-${i}`} {...p} />
            ))}
          </div>
        </div>

        <div className="flex-1 basis-[340px] min-w-0 relative overflow-hidden rounded-3xl p-10 bg-charcoal flex flex-col justify-center">
          <div className="absolute w-[420px] h-[420px] rounded-full -right-[150px] -top-[180px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.55),transparent_65%)]" />
          <span className="relative text-orange text-xs font-bold tracking-[0.22em] uppercase">Offres du moment</span>
          <h2 className="relative font-display font-bold text-white text-[34px] leading-tight mt-3">Jusqu'à <span className="text-orange">-25 %</span> sur une sélection</h2>
          <p className="relative text-[#c4c9d0] mt-3.5 text-[15px]">Sièges, bureaux et rangements en promotion — livrés et montés en région PACA.</p>
          <div className="relative flex flex-wrap gap-3 mt-6">
            <Link href="/catalogue?promo=1" className="bg-orange text-white font-semibold rounded-full px-6 py-3 hover:bg-orange-dark transition">Voir les promotions →</Link>
          </div>
        </div>

      </div>
    </section>
  );
}