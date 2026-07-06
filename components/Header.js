"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatTel } from "@/lib/reglages";
import { useCart } from "@/components/cart/CartContext";
import { CATEGORIES } from "@/lib/categories";

const CORP = [
  ["Notre société", "/a-propos"],
  ["Services", "/services"],
  ["Réalisations", "/realisations"],
  ["Conseils", "/conseils"],
  ["Contact", "/contact"],
];

// Icône par catégorie (réutilise le style du CategoryBar)
const CAT_ICON = {
  accueil: (<><path d="M5 11.5v-1.2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1.2" /><path d="M3.5 13.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5h-17z" /><path d="M5.5 18.5v2M18.5 18.5v2" /></>),
  bureaux: (<><path d="M3 9h18" /><path d="M5 9v11M19 9v11" /><path d="M5 9l2-4.5h10L19 9" /><path d="M14 14h4" /></>),
  tables: (<><ellipse cx="12" cy="8" rx="8.5" ry="2.8" /><path d="M5 9.2v9M19 9.2v9M9.5 10v8.5M14.5 10v8.5" /></>),
  sieges: (<><path d="M7 11V6a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 6v5" /><path d="M5 11h14l-1.2 5H6.2z" /><path d="M12 16v4" /><path d="M8.5 22l3.5-3 3.5 3" /></>),
  rangements: (<><rect x="6.5" y="3.5" width="11" height="17" rx="1.5" /><path d="M6.5 9.2h11M6.5 14.8h11" /><path d="M11 6.2h2M11 11.8h2M11 17.4h2" /></>),
  acoustique: (<><path d="M6 20.5V11a6 6 0 0 1 12 0v9.5" /><path d="M6 20.5h12" /><path d="M9.5 20.5v-5.5h5v5.5" /></>),
};

const CAT_ACCROCHE = {
  accueil: "Faites une première impression mémorable.",
  bureaux: "Des postes de travail pensés pour la performance.",
  tables: "Réunions et collaborations, dans les meilleures conditions.",
  sieges: "Confort et ergonomie pour chaque journée.",
  rangements: "Rangez, classez, organisez avec style.",
  acoustique: "Le calme au cœur des espaces ouverts.",
};

export default function Header({ reglages = {} }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [content, setContent] = useState(CATEGORIES[0]);
  const [mobileCat, setMobileCat] = useState(null);

  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const bandeauActif = reglages.bandeauActif;
  const bandeauTexte = reglages.bandeauTexte || "Showroom Aix-en-Provence — 645 rue Mayor de Montricher";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const enter = (cat) => { setContent(cat); setActive(cat.slug); };

  return (
    <header className="sticky top-0 z-50">
      {/* Barre utilitaire */}
      <div className="bg-charcoal text-[#cdd1d6]" style={{ fontSize: 13 }}>
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7" style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span className="text-orange">●</span> {bandeauActif ? bandeauTexte : "Showroom Aix-en-Provence — 645 rue Mayor de Montricher"}
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
              {count > 0 && <span className="bg-orange text-white" style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, padding: "0 3px" }}>{count}</span>}
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
            {CATEGORIES.map((cat) => (
              <Link key={cat.slug} href={`/catalogue/${cat.slug}`} onMouseEnter={() => enter(cat)}
                className={`transition ${active === cat.slug ? "text-orange" : "text-ink hover:text-orange"}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
                {cat.label}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: active === cat.slug ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
              </Link>
            ))}
            <Link href="/contact" className="bg-orange text-white hover:bg-orange-dark transition" style={{ marginLeft: "auto", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
              Demander un devis →
            </Link>
          </div>

          {/* Panneau méga-menu premium */}
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(8px)", pointerEvents: active ? "auto" : "none", transition: "opacity .18s ease, transform .18s ease" }}>
            <div className="mx-auto max-w-[1400px] px-5 sm:px-7">
              <div className="bg-surface border border-line" style={{ marginTop: 8, borderRadius: 22, boxShadow: "0 30px 70px -25px rgba(33,36,40,0.32)", padding: 20, display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, overflow: "hidden" }}>
                {/* Colonne sous-catégories en cartes */}
                <div style={{ padding: "8px 8px 8px 12px" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange" style={{ marginBottom: 16 }}>{content.label}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {content.sousCategories.map((s) => (
                      <Link key={s.slug} href={`/catalogue/${content.slug}/${s.slug}`} className="group" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1px solid transparent", transition: "all .16s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fce6d6"; e.currentTarget.style.borderColor = "rgba(240,102,27,0.25)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                        <span className="bg-surface-2 group-hover:bg-white transition" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{CAT_ICON[content.slug]}</svg>
                        </span>
                        <span className="text-ink group-hover:text-orange-dark transition" style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{s.label}</span>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/catalogue/${content.slug}`} className="text-orange hover:text-orange-dark font-semibold transition" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, marginLeft: 4, fontSize: 14 }}>
                    Voir tout {content.label.toLowerCase()} →
                  </Link>
                </div>

                {/* Encart vitrine catégorie */}
                <Link href={`/catalogue/${content.slug}`} className="group" style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "linear-gradient(150deg, #23262a 0%, #3a2820 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 24, minHeight: 220 }}>
                  <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,102,27,0.35), transparent 70%)" }} />
                  <span style={{ position: "relative", width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{CAT_ICON[content.slug]}</svg>
                  </span>
                  <div style={{ position: "relative" }}>
                    <p className="font-display font-bold text-white" style={{ fontSize: 20, lineHeight: 1.15 }}>{content.label}</p>
                    <p style={{ color: "#bfc4cb", fontSize: 13.5, marginTop: 6, lineHeight: 1.4 }}>{CAT_ACCROCHE[content.slug]}</p>
                    <span className="group-hover:gap-2.5 transition-all" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, color: "#f0661b", fontSize: 13.5, fontWeight: 700 }}>
                      Explorer la collection →
                    </span>
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
              {CATEGORIES.map((cat) => (
                <div key={cat.slug} className="border-b border-line/70">
                  <button onClick={() => setMobileCat(mobileCat === cat.slug ? null : cat.slug)} className="text-ink" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", fontSize: 15, fontWeight: 600 }}>
                    {cat.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transform: mobileCat === cat.slug ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  {mobileCat === cat.slug && (
                    <div style={{ paddingBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <Link href={`/catalogue/${cat.slug}`} onClick={() => setOpen(false)} className="text-orange font-semibold transition" style={{ fontSize: 14, paddingLeft: 4 }}>Tout {cat.label.toLowerCase()}</Link>
                      {cat.sousCategories.map((s) => (
                        <Link key={s.slug} href={`/catalogue/${cat.slug}/${s.slug}`} onClick={() => setOpen(false)} className="text-ink-soft hover:text-orange transition" style={{ fontSize: 14, paddingLeft: 4 }}>{s.label}</Link>
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