"use client";
import { useState } from "react";
import Link from "next/link";

export default function ProductCard({ href = "/catalogue", brand, name, attr, price, oldPrice, promo, image, images }) {
  // Normalise en tableau d'images (priorité à `images`, sinon `image` seul)
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
      <div className="relative aspect-square grid place-items-center border-b border-line/60 bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)] overflow-hidden">
        {promo && (
          <span className="absolute top-3 left-3 z-20 bg-orange text-white text-[11px] font-bold tracking-wide px-2.5 py-1.5 rounded-full">{promo}</span>
        )}
        <span className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full grid place-items-center bg-white/90 border border-line text-ink-soft group-hover:text-orange transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" /></svg>
        </span>

        {gallery.length > 0 ? (
          <img src={gallery[idx]} alt={name} className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <svg width="52%" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal opacity-80 transition duration-300 group-hover:scale-105">
            <path d="M38 22c0-5 4-9 9-9h26c5 0 9 4 9 9v40H38z" /><path d="M32 62h56l-4 20H36z" /><path d="M60 82v28" /><path d="M40 130l20-16 20 16" />
          </svg>
        )}

        {hasMultiple && (
          <>
            <button onClick={(e) => go(e, -1)} aria-label="Image précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full grid place-items-center bg-white/90 border border-line text-ink shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-orange hover:text-white hover:border-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button onClick={(e) => go(e, 1)} aria-label="Image suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full grid place-items-center bg-white/90 border border-line text-ink shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-orange hover:text-white hover:border-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
              {gallery.map((_, i) => (
                <button key={i} onClick={(e) => goTo(e, i)} aria-label={`Image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-orange" : "w-1.5 bg-white/80 border border-line"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 pb-[18px] flex flex-col flex-1">
        <span className="text-orange text-[11px] font-bold tracking-[0.14em] uppercase">{brand}</span>
        <span className="font-display font-bold text-ink text-[16.5px] leading-tight mt-1.5 mb-1">{name}</span>
        <span className="text-ink-soft text-[12.5px] mb-3.5">{attr}</span>
        <div className="mt-auto flex items-end justify-between gap-2.5">
          <div>
            <span className="block text-ink-soft text-[12.5px] line-through min-h-[17px]">{oldPrice || "\u00A0"}</span>
            <span className="font-display font-bold text-ink text-[19px]">{price} <span className="text-ink-soft text-[11px] font-medium">HT</span></span>
          </div>
          <span className="w-[42px] h-[42px] rounded-xl grid place-items-center bg-charcoal text-white group-hover:bg-orange transition shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}