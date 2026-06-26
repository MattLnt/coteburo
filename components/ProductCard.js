import Link from "next/link";

export default function ProductCard({ href = "/catalogue", brand, name, attr, price, oldPrice, promo }) {
  return (
    <Link href={href} className="group h-full flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(33,36,40,0.05)] hover:border-transparent transition">
      <div className="relative aspect-square grid place-items-center border-b border-line/60 bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)]">
        {promo && (
          <span className="absolute top-3 left-3 bg-orange text-white text-[11px] font-bold tracking-wide px-2.5 py-1.5 rounded-full">{promo}</span>
        )}
        <span className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center bg-white/90 border border-line text-ink-soft group-hover:text-orange transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" /></svg>
        </span>
        <svg width="52%" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal opacity-80 transition duration-300 group-hover:scale-105">
          <path d="M38 22c0-5 4-9 9-9h26c5 0 9 4 9 9v40H38z" /><path d="M32 62h56l-4 20H36z" /><path d="M60 82v28" /><path d="M40 130l20-16 20 16" />
        </svg>
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