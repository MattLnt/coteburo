"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatTel } from "@/lib/reglages";

const NAV = [
  {
    label: "Sièges", href: "/catalogue/sieges",
    sub: ["Sièges ergonomiques", "Fauteuils de direction", "Chaises de réunion", "Chaises visiteur", "Tabourets & assis-debout"],
    featured: { name: "Fauteuil ergonomique Atlas", price: "dès 263 € HT", image: "https://images.unsplash.com/photo-1750306957077-b74e45fe1819?auto=format&fit=crop&w=600&q=80" },
  },
  {
    label: "Bureaux", href: "/catalogue/bureaux",
    sub: ["Bureaux individuels", "Bureaux de direction", "Bureaux bench", "Bureaux assis-debout", "Bureaux d'angle"],
    featured: { name: "Bureau assis-debout Élévation", price: "dès 498 € HT", image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=600&q=80" },
  },
  {
    label: "Tables", href: "/catalogue/tables",
    sub: ["Tables de réunion", "Tables hautes", "Tables basses", "Tables de collectivité"],
    featured: { name: "Table de réunion Ovale", price: "dès 690 € HT", image: "https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=600&q=80" },
  },
  {
    label: "Rangements", href: "/catalogue/rangements",
    sub: ["Armoires", "Caissons", "Bibliothèques", "Casiers & vestiaires"],
    featured: { name: "Caisson mobile Trio", price: "dès 189 € HT", image: "https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=600&q=80" },
  },
  {
    label: "Acoustique", href: "/catalogue/acoustique",
    sub: ["Cabines acoustiques", "Panneaux muraux", "Cloisons & séparateurs", "Alcôves"],
    featured: { name: "Cabine acoustique Quiet", price: "dès 3 290 € HT", image: "https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=600&q=80" },
  },
  {
    label: "Accueil", href: "/catalogue/accueil",
    sub: ["Banques d'accueil", "Fauteuils & canapés", "Chaises salle d'attente", "Tables basses"],
    featured: { name: "Banque d'accueil Lounge", price: "sur devis", image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=600&q=80" },
  },
];

const CORP = [
  ["Notre société", "/a-propos"],
  ["Services", "/services"],
  ["Réalisations", "/realisations"],
  ["Conseils", "/conseils"],
  ["Contact", "/contact"],
];

export default function Header({ reglages = {} }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [content, setContent] = useState(NAV[0]);
  const [mobileCat, setMobileCat] = useState(null);

  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const bandeauActif = reglages.bandeauActif;
  const bandeauTexte = reglages.bandeauTexte || "Showroom Aix-en-Provence — 645 rue Mayor de Montricher";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const enter = (cat) => { setContent(cat); setActive(cat.label); };

  return (
    <header className="sticky top-0 z-50">
      {/* Barre utilitaire */}
      <div className="bg-charcoal text-[#cdd1d6]" style={{ fontSize: 13 }}>
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7" style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bandeauActif ? <><span className="text-orange">●</span> {bandeauTexte}</> : <><span className="text-orange">●</span> Showroom Aix-en-Provence — 645 rue Mayor de Montricher</>}
          </p>
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 18, flexShrink: 0 }}>
            {CORP.map(([l, h]) => (
              <Link key={h} href={h} className="hover:text-white transition">{l}</Link>
            ))}
            <a href={telLink} className="text-white font-semibold">{tel}</a>
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div className="bg-bg/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7" style={{ height: 78, display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" aria-label="Côté BURO — accueil" style={{ flexShrink: 0 }}>
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={168} height={32} priority />
          </Link>

          <div className="hidden lg:flex bg-surface border border-line text-ink-soft" style={{ flex: 1, maxWidth: 440, alignItems: "center", gap: 10, borderRadius: 999, padding: "11px 18px" }}>
            <SearchIcon />
            <input className="text-ink placeholder:text-ink-soft" style={{ width: "100%", background: "transparent", border: 0, outline: 0, fontSize: 14 }} placeholder="Rechercher un siège, un bureau, une marque…" />
          </div>

          <nav className="hidden md:flex" style={{ alignItems: "center", gap: 24, marginLeft: "auto", fontSize: 13, fontWeight: 600 }}>
            <Action href="/compte" label="Compte"><UserIcon /></Action>
            <Action href="/contact" label="Devis"><QuoteIcon /></Action>
            <Link href="/panier" className="text-ink hover:text-orange transition" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span className="bg-orange text-white" style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, padding: "0 3px" }}>2</span>
              <CartIcon /><span>Panier</span>
            </Link>
          </nav>

          <button onClick={() => setOpen(true)} className="md:hidden text-ink" style={{ marginLeft: "auto", display: "grid", placeItems: "center", height: 40, width: 40, marginRight: -8 }} aria-label="Ouvrir le menu">
            <BurgerIcon />
          </button>
        </div>

        {/* Barre catégories + méga-menu (desktop) */}
        <div className="hidden lg:block border-t border-line/60" onMouseLeave={() => setActive(null)} style={{ position: "relative" }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-7" style={{ height: 52, display: "flex", alignItems: "center", gap: 4 }}>
            {NAV.map((cat) => (
              <Link key={cat.href} href={cat.href} onMouseEnter={() => enter(cat)}
                className={`transition ${active === cat.label ? "text-orange" : "text-ink hover:text-orange"}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
                {cat.label}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: active === cat.label ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
              </Link>
            ))}
            <Link href="/contact" className="bg-orange text-white hover:bg-orange-dark transition" style={{ marginLeft: "auto", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
              Demander un devis →
            </Link>
          </div>

          {/* Panneau méga-menu */}
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(8px)", pointerEvents: active ? "auto" : "none", transition: "opacity .18s ease, transform .18s ease" }}>
            <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
              <div className="bg-surface border border-line" style={{ marginTop: 8, borderRadius: 20, boxShadow: "0 30px 70px -25px rgba(33,36,40,0.28)", padding: 28, display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 32 }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange" style={{ marginBottom: 16 }}>{content.label}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                    {content.sub.map((s) => (
                      <Link key={s} href={content.href} className="text-ink hover:text-orange transition" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 500 }}>
                        <span className="text-orange" style={{ fontSize: 13 }}>›</span>{s}
                      </Link>
                    ))}
                  </div>
                  <Link href={content.href} className="text-orange hover:text-orange-dark font-semibold transition" style={{ display: "inline-block", marginTop: 22, fontSize: 14 }}>
                    Voir tout {content.label.toLowerCase()} →
                  </Link>
                </div>

                <Link href={content.href} className="group bg-surface-2" style={{ borderRadius: 16, overflow: "hidden", display: "block" }}>
                  <div style={{ position: "relative", height: 150 }}>
                    <Image src={content.featured.image} alt={content.featured.name} fill sizes="320px" className="object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div style={{ padding: "14px 16px 16px" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange">Produit phare</p>
                    <p className="font-display font-bold text-ink" style={{ fontSize: 16, marginTop: 4, lineHeight: 1.2 }}>{content.featured.name}</p>
                    <p className="text-ink-soft" style={{ fontSize: 13, marginTop: 4 }}>{content.featured.price}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <div className={`fixed inset-0 z-[70] lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className="transition-opacity duration-300" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0 }} />
        <div className="bg-bg transition-transform duration-300" style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "88%", maxWidth: 400, boxShadow: "-10px 0 40px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)" }}>
          <div className="border-b border-line" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 72 }}>
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={150} height={29} />
            <button onClick={() => setOpen(false)} className="text-ink" style={{ display: "grid", placeItems: "center", height: 40, width: 40, marginRight: -8 }} aria-label="Fermer"><CloseIcon /></button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <nav style={{ display: "flex", flexDirection: "column" }}>
              {NAV.map((cat) => (
                <div key={cat.href} className="border-b border-line/70">
                  <button onClick={() => setMobileCat(mobileCat === cat.label ? null : cat.label)} className="text-ink" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", fontSize: 15, fontWeight: 600 }}>
                    {cat.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transform: mobileCat === cat.label ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  {mobileCat === cat.label && (
                    <div style={{ paddingBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {cat.sub.map((s) => (
                        <Link key={s} href={cat.href} onClick={() => setOpen(false)} className="text-ink-soft hover:text-orange transition" style={{ fontSize: 14, paddingLeft: 4 }}>{s}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {CORP.map(([l, h]) => (
                <Link key={h} href={h} onClick={() => setOpen(false)} className="text-ink hover:text-orange transition border-b border-line/70" style={{ padding: "13px 0", fontSize: 15, fontWeight: 600 }}>{l}</Link>
              ))}
            </nav>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 22, fontSize: 13, fontWeight: 600 }}>
              <MobileTile href="/compte" onClose={() => setOpen(false)} label="Compte"><UserIcon /></MobileTile>
              <MobileTile href="/contact" onClose={() => setOpen(false)} label="Devis"><QuoteIcon /></MobileTile>
              <MobileTile href="/panier" onClose={() => setOpen(false)} label="Panier"><CartIcon /></MobileTile>
            </div>
          </div>

          <div className="border-t border-line" style={{ padding: 20 }}>
            <a href={telLink} className="bg-orange text-white hover:bg-orange-dark transition" style={{ display: "block", textAlign: "center", borderRadius: 999, padding: 12, fontWeight: 600 }}>{tel}</a>
          </div>
        </div>
      </div>
    </header>
  );
}

function Action({ href, label, children }) {
  return (
    <Link href={href} className="text-ink hover:text-orange transition" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      {children}<span>{label}</span>
    </Link>
  );
}
function MobileTile({ href, label, children, onClose }) {
  return (
    <Link href={href} onClick={onClose} className="text-ink border border-line" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, borderRadius: 12, padding: "12px 0" }}>
      {children}{label}
    </Link>
  );
}

function SearchIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function UserIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>; }
function QuoteIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 4h11l-1.5 9h-12L4 2H2" /><path d="M6.5 13 5 18h13" /><circle cx="8" cy="21" r="1.4" /><circle cx="17" cy="21" r="1.4" /></svg>; }
function CartIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>; }
function BurgerIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>; }
function CloseIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>; }