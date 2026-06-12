"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  { label: "Sièges", href: "/catalogue/sieges" },
  { label: "Bureaux", href: "/catalogue/bureaux" },
  { label: "Tables", href: "/catalogue/tables" },
  { label: "Rangements", href: "/catalogue/rangements" },
  { label: "Acoustique", href: "/catalogue/acoustique" },
  { label: "Accueil", href: "/catalogue/accueil" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Conseils", href: "/conseils" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  // bloque le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      {/* Barre utilitaire */}
      <div className="bg-charcoal text-[#cdd1d6] text-[13px]">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-7 h-9 flex items-center justify-between gap-4">
          <p className="truncate">
            <span className="text-orange">●</span> Showroom Aix-en-Provence — 645 rue Mayor de Montricher
          </p>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <a href="tel:0620391390" className="hover:text-white transition">06 20 39 13 90</a>
            <Link href="/contact" className="hover:text-white transition">Nous écrire</Link>
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div className="bg-bg/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-7 h-[72px] flex items-center gap-5">
          <Link href="/" className="shrink-0" aria-label="Côté BURO — accueil">
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={168} height={32} priority />
          </Link>

          {/* Recherche (desktop) */}
          <div className="hidden lg:flex flex-1 max-w-[420px] items-center gap-2 bg-surface border border-line rounded-full px-4 py-2.5 text-ink-soft">
            <SearchIcon />
            <input
              className="w-full bg-transparent text-sm outline-none text-ink placeholder:text-ink-soft"
              placeholder="Rechercher un siège, un bureau, une marque…"
            />
          </div>

          {/* Actions (desktop) */}
          <nav className="hidden md:flex items-center gap-6 ml-auto text-[13px] font-semibold">
            <Action href="/compte" label="Compte"><UserIcon /></Action>
            <Action href="/devis" label="Devis"><QuoteIcon /></Action>
            <Link href="/panier" className="relative flex flex-col items-center gap-0.5 text-ink hover:text-orange transition">
              <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">2</span>
              <CartIcon />
              <span>Panier</span>
            </Link>
          </nav>

          {/* Burger (mobile) */}
          <button onClick={() => setOpen(true)} className="ml-auto md:hidden grid place-items-center h-10 w-10 -mr-2 text-ink" aria-label="Ouvrir le menu">
            <BurgerIcon />
          </button>
        </div>

        {/* Nav catégories (desktop) */}
        <nav className="hidden md:block border-t border-line/60">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-7 h-[50px] flex items-center gap-1.5 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <Link key={c.href} href={c.href} className="whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold text-ink hover:bg-surface-2 hover:text-orange transition">
                {c.label}
              </Link>
            ))}
            <Link href="/catalogue" className="ml-auto whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold text-orange">
              Voir le catalogue →
            </Link>
          </div>
        </nav>
      </div>

      {/* Menu mobile */}
      <div className={`fixed inset-0 z-[60] md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute right-0 top-0 h-full w-[86%] max-w-sm bg-bg shadow-2xl transition-transform duration-300 flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between px-5 h-[72px] border-b border-line">
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={150} height={29} />
            <button onClick={() => setOpen(false)} className="grid place-items-center h-10 w-10 -mr-2 text-ink" aria-label="Fermer le menu">
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="flex items-center gap-2 bg-surface border border-line rounded-full px-4 py-3 text-ink-soft mb-6">
              <SearchIcon />
              <input className="w-full bg-transparent text-sm outline-none text-ink placeholder:text-ink-soft" placeholder="Rechercher…" />
            </div>

            <nav className="flex flex-col">
              {CATEGORIES.map((c) => (
                <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="py-3 border-b border-line/70 text-[15px] font-semibold text-ink hover:text-orange transition">
                  {c.label}
                </Link>
              ))}
            </nav>

            <div className="grid grid-cols-3 gap-3 mt-6 text-[13px] font-semibold text-center">
              <Link href="/compte" onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 rounded-xl border border-line py-3 text-ink"><UserIcon />Compte</Link>
              <Link href="/devis" onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 rounded-xl border border-line py-3 text-ink"><QuoteIcon />Devis</Link>
              <Link href="/panier" onClick={() => setOpen(false)} className="flex flex-col items-center gap-1.5 rounded-xl border border-line py-3 text-ink"><CartIcon />Panier</Link>
            </div>
          </div>

          <div className="px-5 py-5 border-t border-line">
            <a href="tel:0620391390" className="block w-full text-center rounded-full bg-orange text-white font-semibold py-3 hover:bg-orange-dark transition">
              06 20 39 13 90
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

/* — Sous-composants — */
function Action({ href, label, children }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 text-ink hover:text-orange transition">
      {children}
      <span>{label}</span>
    </Link>
  );
}

/* — Icônes — */
function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}
function UserIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
}
function QuoteIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 4h11l-1.5 9h-12L4 2H2" /><path d="M6.5 13 5 18h13" /><circle cx="8" cy="21" r="1.4" /><circle cx="17" cy="21" r="1.4" /></svg>;
}
function CartIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>;
}
function BurgerIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
function CloseIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>;
}