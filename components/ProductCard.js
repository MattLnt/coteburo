import Image from "next/image";
import Link from "next/link";

export default function ProductCard({ href = "#", image, brand, name, attr, price, oldPrice, badge }) {
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_30px_70px_-25px_rgba(33,36,40,0.28)]">
      <div className="relative aspect-square border-b border-line/70 bg-surface-2">
        <Image src={image} alt={name} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className="object-cover" />
        {badge && (
          <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${badge.type === "promo" ? "bg-orange text-white" : "bg-[#e8f3ec] text-[#2f8a55]"}`}>
            {badge.label}
          </span>
        )}
        <span className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full border border-line bg-white/90 text-ink-soft transition group-hover:text-orange">♡</span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{brand}</span>
        <span className="font-display font-bold text-[16.5px] leading-tight mt-1.5 mb-1">{name}</span>
        <span className="text-[12.5px] text-ink-soft mb-3.5">{attr}</span>
        <div className="mt-auto flex items-end justify-between gap-2.5">
          <div>
            {oldPrice && <span className="block text-[12.5px] text-ink-soft line-through">{oldPrice}</span>}
            <span className="font-display font-bold text-[19px]">{price}</span>{" "}
            <span className="text-[11px] font-medium text-ink-soft">HT</span>
          </div>
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-charcoal text-white transition group-hover:bg-orange">+</span>
        </div>
      </div>
    </Link>
  );
}