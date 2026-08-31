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
  // Catégorie ouverte dans le menu mobile — null = grille des catégories
  const [catOuverte, setCatOuverte] = useState(null);
  const [compteMenuOuvert, setCompteMenuOuvert] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const compteMenuRef = useRef(null);

  const connecte = sessionStatus === "authenticated";
  const initiale = (session?.user?.email || "?")[0]?.toUpperCase();

  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const bandeauActif = reglages.bandeauActif;
            <span className="text-orange">●</span> {bandeauActif ? bandeauTexte : "Showroom Aix-en-Provence — 645 rue Mayor de Montricher"}

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  // On revient toujours sur la grille en rouvrant le menu
  useEffect(() => { if (!open) setCatOuverte(null); }, [open]);

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
  const fermer = () => setOpen(false);

  // Ombre douce commune aux cartes du menu — pas de bordure, elles flottent
  // sur le fond crème plutôt que d'être des cases dessinées.
  const ombreCarte = "0 1px 2px rgba(35,38,42,0.04), 0 10px 26px -20px rgba(35,38,42,0.4)";

  return (
    <header className="sticky top-0 z-50">
      <style>{`
        .cb-corp { display: none; }
        .cb-search { display: none; }
        .cb-nav-desktop { display: none; }
        .cb-catbar { display: none; }
        .cb-actions-mobile { display: flex; margin-left: auto; }
        @media (min-width: 768px) {
          .cb-corp { display: flex; }
        }
        @media (min-width: 1024px) {
          .cb-search { display: block; }
          .cb-nav-desktop { display: flex; }
          .cb-catbar { display: block; }
          .cb-actions-mobile { display: none; }
        }
      `}</style>

      {/* Bandeau — le téléphone y apparaît aussi sur mobile : c'est là qu'un
          appel se déclenche en un seul tap. */}
      <div className="bg-charcoal text-[#cdd1d6] text-[11px] sm:text-[13px]">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7 h-8 sm:h-[38px] flex items-center justify-between gap-3 sm:gap-4">
          <p className="truncate min-w-0">
            <span className="text-orange">●</span> {bandeauActif ? bandeauTexte : "Showroom Aix-en-Provence — 645 rue Mayor de Montricher"}
          </p>
          <a href={telLink} className="lg:hidden text-white font-semibold whitespace-nowrap shrink-0">{tel}</a>
          <div className="cb-corp items-center gap-[18px] shrink-0">
            {CORP.map(([l, h]) => (
              <Link key={h} href={h} className="hover:text-white transition">{l}</Link>
            ))}
            <a href={telLink} className="text-white font-semibold">{tel}</a>
          </div>
        </div>
      </div>

      <div className="bg-bg border-b border-line">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-7 h-[62px] lg:h-[78px] flex items-center gap-4 lg:gap-6">
          <Link href="/" aria-label="Côté BURO — accueil" className="shrink-0">
            <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={168} height={32} priority className="w-[140px] lg:w-[168px] h-auto" />
          </Link>

          <div className="cb-search flex-1 max-w-[440px]">
            <SearchBar variant="desktop" />
          </div>

          {/* Actions mobile — la recherche et surtout le panier étaient enfermés
              dans le menu : rien ne confirmait un ajout au panier. */}
          <div className="cb-actions-mobile items-center gap-0.5">
            <button onClick={() => setRechercheOuverte((v) => !v)} aria-label="Rechercher"
              className="grid place-items-center w-[38px] h-[38px] text-ink">
              {rechercheOuverte ? <CloseIcon size={21} /> : <SearchIcon />}
            </button>
            <Link href="/panier" aria-label="Panier" className="relative grid place-items-center w-[38px] h-[38px] text-ink">
              <CartIcon size={21} />
              {count > 0 && (
                <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full bg-orange text-white text-[9.5px] font-bold grid place-items-center">{count}</span>
              )}
            </Link>
            <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu"
              className="grid place-items-center w-[38px] h-[38px] text-ink -mr-2">
              <BurgerIcon />
            </button>
          </div>

          <nav className="cb-nav-desktop items-center gap-6 ml-auto text-[13px] font-semibold">
            {connecte ? (
              <div ref={compteMenuRef} className="relative">
                <button
                  onClick={() => setCompteMenuOuvert((v) => !v)}
                  className="text-ink hover:text-orange transition flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer text-[13px] font-semibold"
                >
                  <span className="w-[22px] h-[22px] rounded-full bg-orange-tint text-orange-dark grid place-items-center font-bold text-[11.5px]">
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
            <Link href="/devis" className="text-ink hover:text-orange transition relative flex flex-col items-center gap-0.5">
              {countDevis > 0 && <span className="bg-charcoal text-white absolute -top-1.5 -right-2 min-w-4 h-4 rounded-lg grid place-items-center text-[10px] font-bold px-[3px]">{countDevis}</span>}
              <DevisIcon /><span>Devis</span>
            </Link>
            <Link href="/panier" className="text-ink hover:text-orange transition relative flex flex-col items-center gap-0.5">
              {count > 0 && <span className="bg-orange text-white absolute -top-1.5 -right-2 min-w-4 h-4 rounded-lg grid place-items-center text-[10px] font-bold px-[3px]">{count}</span>}
              <CartIcon /><span>Panier</span>
            </Link>
          </nav>
        </div>

        {/* Champ de recherche mobile, déplié par la loupe */}
        {rechercheOuverte && (
          <div className="lg:hidden px-5 pb-3 -mt-1">
            <SearchBar variant="mobile" />
          </div>
        )}

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

      {/* ═══ MENU PLEIN ÉCRAN (mobile) ═══ */}
      <div
        className="lg:hidden fixed inset-0 z-[70] flex flex-col bg-bg transition-all duration-300"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transform: open ? "translateY(0)" : "translateY(-12px)",
        }}
      >
        {/* Halo orange, comme sur les cartes hero et CTA */}
        <div className="absolute -top-20 -right-16 w-[260px] h-[260px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,102,27,0.13), transparent 68%)" }} />

        {/* En-tête du menu */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
          {catOuverte ? (
            <button onClick={() => setCatOuverte(null)} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer">
              <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-white/70 border border-ink/[0.08] text-ink backdrop-blur-sm">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </span>
              <span className="text-[12px] text-ink-soft">Le catalogue</span>
            </button>
          ) : (
            <Link href="/" onClick={fermer}>
              <Image src="/logo-coteburo-bicolore.svg" alt="Côté BURO" width={140} height={27} className="h-auto" />
            </Link>
          )}
          <button onClick={fermer} aria-label="Fermer"
            className="grid place-items-center w-9 h-9 rounded-full bg-white/70 border border-ink/[0.08] text-ink backdrop-blur-sm">
            <CloseIcon size={19} />
          </button>
        </div>

        {/* ── Vue catégorie ── */}
        {catOuverte ? (
          <>
            <div className="relative px-5 pt-4 pb-[18px] shrink-0">
              <div className="flex items-center gap-3.5">
                <span className="grid place-items-center w-[46px] h-[46px] rounded-[14px] text-orange-dark shrink-0"
                  style={{ background: "linear-gradient(145deg, #fce6d6, #f8dcc8)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconeDe(catOuverte)}</svg>
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink text-[22px] leading-tight">{catOuverte.nom}</p>
                  <p className="text-[12px] text-ink-soft mt-0.5">
                    {catOuverte.sousCategories.length > 0
                      ? `${catOuverte.sousCategories.length} sous-catégorie${catOuverte.sousCategories.length > 1 ? "s" : ""}`
                      : "Nouveautés à venir"}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-5">
              <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: ombreCarte }}>
                <Link href={`/catalogue?categorie=${catOuverte.slug}`} onClick={fermer}
                  className="flex items-center justify-between px-[17px] py-[15px]"
                  style={{ background: "linear-gradient(90deg, #fce6d6, rgba(252,230,214,0.35))" }}>
                  <span className="text-[14px] font-semibold text-orange-dark">Tout voir dans {catOuverte.nom}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-orange-dark shrink-0"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>

                {catOuverte.sousCategories.map((s) => (
                  <Link key={s.slug} href={`/catalogue?categorie=${catOuverte.slug}&sousCategorie=${s.slug}`} onClick={fermer}
                    className="flex items-center justify-between px-[17px] py-[15px] border-t border-line/70 active:bg-surface-2 transition">
                    <span className="text-[14px] text-ink">{s.nom}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink-soft/50 shrink-0"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── Vue racine ── */
          <>
            <div className="relative px-5 pt-3.5 pb-4 shrink-0">
              <SearchBar variant="mobile" />
            </div>

            <div className="relative flex-1 overflow-y-auto px-5 pb-2">
              {connecte && (
                <Link href="/compte" onClick={fermer}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white mb-5" style={{ boxShadow: ombreCarte }}>
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-orange-tint text-orange-dark font-bold text-[14px] shrink-0">{initiale}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink truncate">{session.user.email}</p>
                    <p className="text-[11px] text-ink-soft mt-px">Voir mon compte</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink-soft/50 shrink-0"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-soft/70">Le catalogue</span>
                <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(35,38,42,0.09), transparent)" }} />
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {categories.map((cat) => (
                  <button key={cat.slug} onClick={() => setCatOuverte(cat)}
                    className="bg-white rounded-2xl p-[15px] flex flex-col gap-[22px] text-left active:scale-[0.98] transition"
                    style={{ boxShadow: ombreCarte }}>
                    <span className="grid place-items-center w-9 h-9 rounded-[11px] text-orange-dark"
                      style={{ background: "linear-gradient(145deg, #fce6d6, #f8dcc8)" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconeDe(cat)}</svg>
                    </span>
                    <span className="flex items-center justify-between">
                      <span className="text-[13.5px] font-semibold text-ink">{cat.nom}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink-soft/40"><path d="M7 17 17 7M7 7h10v10" /></svg>
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-soft/70">La maison</span>
                <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(35,38,42,0.09), transparent)" }} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {CORP.map(([l, h]) => (
                  <Link key={h} href={h} onClick={fermer}
                    className="text-[12.5px] px-3.5 py-2 rounded-full bg-white/75 text-ink-soft active:bg-white transition">
                    {l}
                  </Link>
                ))}
              </div>

              {connecte && (
                <button onClick={() => { fermer(); signOut({ callbackUrl: "/" }); }}
                  className="w-full text-center mt-5 py-3 text-[13px] font-semibold text-orange-dark bg-transparent border-none cursor-pointer">
                  Se déconnecter
                </button>
              )}
            </div>
          </>
        )}

        {/* Pied — dégradé plutôt qu'une bordure nette */}
        <div className="relative shrink-0 px-5 pt-4 pb-[18px]"
          style={{ background: "linear-gradient(to top, var(--color-bg) 72%, transparent)", paddingBottom: "calc(18px + env(safe-area-inset-bottom))" }}>
          <Link href="/devis" onClick={fermer}
            className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-orange text-white text-[14px] font-semibold mb-3"
            style={{ boxShadow: "0 8px 22px -8px rgba(240,102,27,0.6)" }}>
            Demander un devis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>

          <div className="flex items-center justify-between gap-1.5">
            <Link href={connecte ? "/compte" : "/connexion"} onClick={fermer} className="flex-1 flex flex-col items-center gap-1.5 py-1 text-ink-soft">
              <UserIcon size={18} /><span className="text-[10.5px]">Compte</span>
            </Link>
            <Link href="/devis" onClick={fermer} className="relative flex-1 flex flex-col items-center gap-1.5 py-1 text-ink-soft">
              <DevisIcon size={18} /><span className="text-[10.5px]">Devis</span>
              {countDevis > 0 && <span className="absolute -top-0.5 right-[22px] min-w-[15px] h-[15px] px-1 rounded-full bg-charcoal text-white text-[9px] grid place-items-center">{countDevis}</span>}
            </Link>
            <Link href="/panier" onClick={fermer} className="relative flex-1 flex flex-col items-center gap-1.5 py-1 text-ink-soft">
              <CartIcon size={18} /><span className="text-[10.5px]">Panier</span>
              {count > 0 && <span className="absolute -top-0.5 right-[20px] min-w-[15px] h-[15px] px-1 rounded-full bg-orange text-white text-[9px] grid place-items-center">{count}</span>}
            </Link>
            <a href={telLink} className="flex-1 flex flex-col items-center gap-1.5 py-1 text-ink-soft">
              <PhoneIcon /><span className="text-[10.5px]">Appeler</span>
            </a>
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

function UserIcon({ size = 22 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>; }
function CartIcon({ size = 22 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>; }
function DevisIcon({ size = 22 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>; }
function PhoneIcon({ size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>; }
function SearchIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function BurgerIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>; }
function CloseIcon({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>; }