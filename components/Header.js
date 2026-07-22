"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { formatTel } from "@/lib/reglages";
import { useCart } from "@/components/cart/CartContext";
import { useDevis } from "@/components/devis/DevisContext";
import { ICONES_CATEGORIE } from "@/lib/iconesCategories";
import SearchBar from "@/components/SearchBar";

const CORP = [
  ["Notre société", "/a-propos"],
  ["Services", "/services"],
  ["Réalisations", "/realisations"],
  ["Conseils", "/conseils"],
  ["Contact", "/contact"],
];

const CAT_ACCROCHE = {
  accueil: "Faites une première impression mémorable.",
  bureaux: "Des postes de travail pensés pour la performance.",
  tables: "Réunions et collaborations, dans les meilleures conditions.",
  sieges: "Confort et ergonomie pour chaque journée.",
  rangements: "Rangez, classez, organisez avec style.",
  acoustique: "Le calme au cœur des espaces ouverts.",
};

// Icône par défaut si une catégorie n'a pas encore d'icône choisie en admin
const ICONE_PAR_DEFAUT = (<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 9h.01M15 9h.01M9 15c1 1 5 1 6 0" /></>);

export default function Header({ reglages = {}, categories = [] }) {
  const { count } = useCart();
  const { count: countDevis } = useDevis();
  const { data: session, status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [content, setContent] = useState(categories[0] || null);
  const [mobileCat, setMobileCat] = useState(null);
  const [compteMenuOuvert, setCompteMenuOuvert] = useState(false);
  const compteMenuRef = useRef(null);

  const connecte = sessionStatus === "authenticated";
  const initiale = (session?.user?.email || "?")[0]?.toUpperCase();

  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const bandeauActif = reglages.bandeauActif;
  const bandeauTexte = reglages.bandeauTexte || "Showroom Aix-en-Provence — 645 rue Mayor de Montricher";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    function onClick(e) {
      if (compteMenuRef.current && !compteMenuRef.current.contains(e.target)) setCompteMenuOuvert(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const enter = (cat) => { setContent(cat); setActive(cat.slug); };
  const sousCatContent = content?.sousCategories || [];
  const iconeDe = (cat) => (cat?.icone && ICONES_CATEGORIE[cat.icone]) || ICONE_PAR_DEFAUT;

  return (
    <header className="sticky top-0 z-50">
      <style>{`
        .cb-corp { display: none; }
        .cb-search { display: none; }
        .cb-nav-desktop { display: none; }
        .cb-catbar { display: none; }
        .cb-burger { display: grid; margin-left: auto; }
        @media (min-width: 768px) {
          .cb-corp { display: flex; }
        }
        @media (min-width: 1024px) {
          .cb-search { display: block; }
          .cb-nav-desktop { display: flex; }
          .cb-catbar { display: block; }
          .cb-burger { display: none; }
        }
      `}</style>

      <div className="bg-charcoal text-[#cdd1d6]" style={{ fontSize: 13 }}>
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7" style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span className="text-orange">●</span> {bandeauActif ? bandeauTexte : "Showroom Aix-en-Provence — 645 rue Mayor de Montricher"}
          </p>
          <div className="cb-corp" style={{ alignItems: "center", gap: 18, flexShrink: 0 }}>
            {CORP.map(([l, h]) => (
              <Link key={h} href={h} className="hover:text-white transition">{l}</Link>
            ))}
            <a href={telLink} className="text-white font-semibold">{tel}</a>
          </div>
        </div>
      </div>

      <div className="bg-bg border-b border-line">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7" style={{ height: 78, display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" aria-label="Côté BURO — accueil" style={{ flexShrink: 0 }}>
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={168} height={32} priority />
          </Link>

          <div className="cb-search" style={{ flex: 1, maxWidth: 440 }}>
            <SearchBar variant="desktop" />
          </div>

          <nav className="cb-nav-desktop" style={{ alignItems: "center", gap: 24, marginLeft: "auto", fontSize: 13, fontWeight: 600 }}>
            {connecte ? (
              <div ref={compteMenuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setCompteMenuOuvert((v) => !v)}
                  className="text-ink hover:text-orange transition"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, font: "inherit", color: "inherit" }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 11.5 }}>
                    {initiale}
                  </span>
                  <span>Compte</span>
                </button>
                {compteMenuOuvert && (
                  <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, width: 220, background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, boxShadow: "0 16px 40px rgba(33,36,40,0.14)", overflow: "hidden", zIndex: 60 }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #f2efe9" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#23262a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</p>
                      <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "2px 0 0" }}>Connecté</p>
                    </div>
                    <Link href="/compte" onClick={() => setCompteMenuOuvert(false)} style={{ display: "block", padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#23262a", textDecoration: "none" }}>Mon compte</Link>
                    <Link href="/compte/commandes" onClick={() => setCompteMenuOuvert(false)} style={{ display: "block", padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#23262a", textDecoration: "none" }}>Mes commandes</Link>
                    <button
                      onClick={() => { setCompteMenuOuvert(false); signOut({ callbackUrl: "/" }); }}
                      style={{ width: "100%", textAlign: "left", padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#d9551a", background: "none", border: "none", borderTop: "1px solid #f2efe9", cursor: "pointer" }}
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Action href="/connexion" label="Connexion"><UserIcon /></Action>
            )}
            <Link href="/devis" className="text-ink hover:text-orange transition" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {countDevis > 0 && <span className="bg-charcoal text-white" style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, padding: "0 3px" }}>{countDevis}</span>}
              <DevisIcon /><span>Devis</span>
            </Link>
            <Link href="/panier" className="text-ink hover:text-orange transition" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {count > 0 && <span className="bg-orange text-white" style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, padding: "0 3px" }}>{count}</span>}
              <CartIcon /><span>Panier</span>
            </Link>
          </nav>

          <button onClick={() => setOpen(true)} className="cb-burger text-ink" style={{ placeItems: "center", height: 40, width: 40, marginRight: -8 }} aria-label="Ouvrir le menu">
            <BurgerIcon />
          </button>
        </div>

        {/* Barre catégories + méga-menu — zone de survol resserrée sur 1400px,
            panneau collé sans décalage, même couleur crème que le header. */}
        <div className="cb-catbar border-t border-line/60" style={{ position: "relative" }}>
          <div className="mx-auto max-w-[1400px] relative" onMouseLeave={() => setActive(null)}>
            <div className="px-5 sm:px-7" style={{ height: 52, display: "flex", alignItems: "center", gap: 4 }}>
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/catalogue?categorie=${cat.slug}`} onMouseEnter={() => enter(cat)}
                  className={`transition ${active === cat.slug ? "text-orange" : "text-ink hover:text-orange"}`}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {cat.nom}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: active === cat.slug ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
                </Link>
              ))}
              <Link href="/devis" className="bg-orange text-white hover:bg-orange-dark transition" style={{ marginLeft: "auto", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
                Demander un devis →
              </Link>
            </div>

            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none", transition: "opacity .18s ease" }}>
              <div className="px-5 sm:px-7">
                <div className="bg-bg border border-line border-t-0" style={{ borderRadius: "0 0 22px 22px", boxShadow: "0 20px 50px -25px rgba(33,36,40,0.28)", padding: 20, display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, overflow: "hidden" }}>
                  <div style={{ padding: "8px 8px 8px 12px" }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange" style={{ marginBottom: 16 }}>{content?.nom}</p>

                    {sousCatContent.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {sousCatContent.map((s) => (
                          <Link key={s.slug} href={`/catalogue?categorie=${content.slug}&sousCategorie=${s.slug}`} className="group" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1px solid transparent", transition: "all .16s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#fce6d6"; e.currentTarget.style.borderColor = "rgba(240,102,27,0.25)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                            <span className="bg-surface-2 group-hover:bg-white transition" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center" }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconeDe(content)}</svg>
                            </span>
                            <span className="text-ink group-hover:text-orange-dark transition" style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{s.nom}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13.5, color: "#9aa0a8", padding: "10px 12px" }}>Nouveautés à venir dans cette catégorie.</p>
                    )}

                    <Link href={`/catalogue?categorie=${content?.slug}`} className="text-orange hover:text-orange-dark font-semibold transition" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, marginLeft: 4, fontSize: 14 }}>
                      Voir tout {content?.nom?.toLowerCase()} →
                    </Link>
                  </div>

                  <Link href={`/catalogue?categorie=${content?.slug}`} className="group" style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "linear-gradient(150deg, #23262a 0%, #3a2820 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 24, minHeight: 220 }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,102,27,0.35), transparent 70%)" }} />
                    <span style={{ position: "relative", width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconeDe(content)}</svg>
                    </span>
                    <div style={{ position: "relative" }}>
                      <p className="font-display font-bold text-white" style={{ fontSize: 20, lineHeight: 1.15 }}>{content?.nom}</p>
                      <p style={{ color: "#bfc4cb", fontSize: 13.5, marginTop: 6, lineHeight: 1.4 }}>{CAT_ACCROCHE[content?.slug] || "Découvrez notre sélection."}</p>
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
      </div>

      <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`} style={{ display: open ? "block" : undefined }}>
        <div onClick={() => setOpen(false)} className="transition-opacity duration-300" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0 }} />
        <div className="bg-bg transition-transform duration-300" style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "88%", maxWidth: 400, boxShadow: "-10px 0 40px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)" }}>
          <div className="border-b border-line" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 72 }}>
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={150} height={29} />
            <button onClick={() => setOpen(false)} className="text-ink" style={{ display: "grid", placeItems: "center", height: 40, width: 40, marginRight: -8 }} aria-label="Fermer"><CloseIcon /></button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ marginBottom: 18 }}>
              <SearchBar variant="mobile" />
            </div>

            {connecte && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "#faf8f4", border: "1px solid #ece8e0", marginBottom: 18 }}>
                <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{initiale}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#23262a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</p>
                  <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "1px 0 0" }}>Connecté</p>
                </div>
              </div>
            )}

            <nav style={{ display: "flex", flexDirection: "column" }}>
              {categories.map((cat) => (
                <div key={cat.slug} className="border-b border-line/70">
                  <button onClick={() => setMobileCat(mobileCat === cat.slug ? null : cat.slug)} className="text-ink" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", fontSize: 15, fontWeight: 600 }}>
                    {cat.nom}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transform: mobileCat === cat.slug ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  {mobileCat === cat.slug && (
                    <div style={{ paddingBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <Link href={`/catalogue?categorie=${cat.slug}`} onClick={() => setOpen(false)} className="text-orange font-semibold transition" style={{ fontSize: 14, paddingLeft: 4 }}>Tout {cat.nom.toLowerCase()}</Link>
                      {cat.sousCategories.length > 0 ? cat.sousCategories.map((s) => (
                        <Link key={s.slug} href={`/catalogue?categorie=${cat.slug}&sousCategorie=${s.slug}`} onClick={() => setOpen(false)} className="text-ink-soft hover:text-orange transition" style={{ fontSize: 14, paddingLeft: 4 }}>{s.nom}</Link>
                      )) : (
                        <span style={{ fontSize: 13, color: "#9aa0a8", paddingLeft: 4 }}>Nouveautés à venir</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {CORP.map(([l, h]) => (
                <Link key={h} href={h} onClick={() => setOpen(false)} className="text-ink hover:text-orange transition border-b border-line/70" style={{ padding: "13px 0", fontSize: 15, fontWeight: 600 }}>{l}</Link>
              ))}
            </nav>

            <Link href="/devis" onClick={() => setOpen(false)} className="bg-orange text-white hover:bg-orange-dark transition" style={{ display: "block", textAlign: "center", borderRadius: 999, padding: 13, fontWeight: 700, marginTop: 20 }}>
              Demander un devis →
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16, fontSize: 13, fontWeight: 600 }}>
              <MobileTile href={connecte ? "/compte" : "/connexion"} onClose={() => setOpen(false)} label={connecte ? "Mon compte" : "Connexion"}><UserIcon /></MobileTile>
              <MobileTile href="/devis" onClose={() => setOpen(false)} label={`Devis${countDevis > 0 ? ` (${countDevis})` : ""}`}><DevisIcon /></MobileTile>
              <MobileTile href="/panier" onClose={() => setOpen(false)} label="Panier"><CartIcon /></MobileTile>
            </div>

            {connecte && (
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                style={{ width: "100%", textAlign: "center", marginTop: 14, padding: "12px 0", fontSize: 13.5, fontWeight: 600, color: "#d9551a", background: "none", border: "none", cursor: "pointer" }}
              >
                Se déconnecter
              </button>
            )}
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

function UserIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>; }
function CartIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>; }
function DevisIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>; }
function BurgerIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>; }
function CloseIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>; }