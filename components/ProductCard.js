"use client";
import { useState } from "react";
import Link from "next/link";
import FavoriButton from "@/components/FavoriButton";

export default function ProductCard({ href = "/catalogue", codeRacine, vitrineId, brand, name, attr, price, oldPrice, promo, image, images, favori = false, connecte = false }) {
  const gallery = (Array.isArray(images) && images.length > 0 ? images : image ? [image] : []);
  const [idx, setIdx] = useState(0);
  const hasMultiple = gallery.length > 1;

  const go = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + dir + gallery.length) % gallery.length);
  };

  const goTo = (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx(i);
  };

  return (
    <Link href={href} className="group h-full flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(33,36,40,0.05)] hover:border-transparent transition">
      {/* Fond blanc uni : le dégradé crème créait un halo qui entrait en
          conflit avec les photos d'ambiance. */}
      <div className="relative aspect-square grid place-items-center border-b border-line/60 bg-white overflow-hidden">
        {promo && (
          <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 bg-orange text-white text-[10px] sm:text-[11px] font-bold tracking-wide px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full">{promo}</span>
        )}
        {(codeRacine || vitrineId) && (
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20">
            <FavoriButton codeRacine={codeRacine} vitrineId={vitrineId} initial={favori} connecte={connecte} variant="float" />
          </div>
        )}

        {gallery.length > 0 ? (
          // object-contain + coins arrondis : l'image entière reste visible,
          // et une photo rectangulaire devient un visuel assumé plutôt qu'un
          // rectangle posé au milieu de la carte.
          <img src={gallery[idx]} alt={name} className="w-full h-full object-contain p-2.5 sm:p-3 rounded-[14px] transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <svg width="52%" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal opacity-80 transition duration-300 group-hover:scale-105">
            <path d="M38 22c0-5 4-9 9-9h26c5 0 9 4 9 9v40H38z" /><path d="M32 62h56l-4 20H36z" /><path d="M60 82v28" /><path d="M40 130l20-16 20 16" />
          </svg>
        )}

        {hasMultiple && (
          <>
            {/* Flèches masquées sur mobile : elles n'apparaissent qu'au survol,
                qui n'existe pas au doigt — les points de pagination suffisent. */}
            <button onClick={(e) => go(e, -1)} aria-label="Image précédente"
              className="hidden sm:grid absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full place-items-center bg-white/90 border border-line text-ink shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-orange hover:text-white hover:border-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button onClick={(e) => go(e, 1)} aria-label="Image suivante"
              className="hidden sm:grid absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full place-items-center bg-white/90 border border-line text-ink shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-orange hover:text-white hover:border-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
            <div className="absolute bottom-2.5 sm:bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
              {gallery.map((_, i) => (
                <button key={i} onClick={(e) => goTo(e, i)} aria-label={`Image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-orange" : "w-1.5 bg-white/80 border border-line"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-3 sm:p-4 pb-3.5 sm:pb-[18px] flex flex-col flex-1">
        {brand && <span className="text-orange text-[9.5px] sm:text-[11px] font-bold tracking-[0.12em] sm:tracking-[0.14em] uppercase truncate">{brand}</span>}
        {/* line-clamp : sans limite, un nom long faisait varier la hauteur des
            cartes d'une colonne à l'autre. */}
        <span className="font-display font-bold text-ink text-[13.5px] sm:text-[16.5px] leading-tight mt-1 sm:mt-1.5 mb-1 line-clamp-2">{name}</span>
        {attr && <span className="text-ink-soft text-[11px] sm:text-[12.5px] mb-2.5 sm:mb-3.5 truncate">{attr}</span>}
        <div className="mt-auto flex items-end justify-between gap-2 sm:gap-2.5">
          <div className="min-w-0">
            <span className="block text-ink-soft text-[11px] sm:text-[12.5px] line-through min-h-[15px] sm:min-h-[17px] truncate">{oldPrice || "\u00A0"}</span>
            <span className="font-display font-bold text-ink text-[15px] sm:text-[19px] whitespace-nowrap">{price} <span className="text-ink-soft text-[10px] sm:text-[11px] font-medium">HT</span></span>
          </div>
          <span className="w-9 h-9 sm:w-[42px] sm:h-[42px] rounded-lg sm:rounded-xl grid place-items-center bg-charcoal text-white group-hover:bg-orange transition shrink-0">
            <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}