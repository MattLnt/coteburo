"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BOTTOM_NAV, sectionDeChemin } from "./navConfig";

// Icônes de la bottom bar — jeu autonome, pour ne pas dépendre du composant Icon
// de la sidebar (dont les noms peuvent évoluer indépendamment).
function IconeBottom({ nom, taille = 21 }) {
  const p = { width: taille, height: taille, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (nom) {
    case "home":
      return <svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    case "cart":
      return <svg {...p}><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>;
    case "box":
      return <svg {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></svg>;
    case "layers":
      return <svg {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></svg>;
    case "tag":
      return <svg {...p}><path d="M3 11V4h7l11 11-7 7z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
    case "image":
      return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="m4 17 5-5 4 4 3-2 4 4" /></svg>;
    case "edit":
      return <svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "eye":
      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "settings":
      return <svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>;
    case "site":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></svg>;
    case "logout":
      return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

export function BottomBar() {
  const pathname = usePathname();
  const section = sectionDeChemin(pathname);
  const items = BOTTOM_NAV[section] || BOTTOM_NAV.racine;

  // Un item est actif si l'URL courante correspond à son lien.
  // "exact" évite que /admin s'allume sur toutes les pages enfants.
  const estActif = (item) => {
    if (!item.href || item.type === "externe" || item.type === "logout") return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const styleItem = (actif) => ({
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 4, minWidth: 64, padding: "9px 8px 7px", flexShrink: 0,
    textDecoration: "none", border: "none", background: "none", cursor: "pointer",
    fontSize: 10.5, fontWeight: 600, lineHeight: 1.1, textAlign: "center",
    color: actif ? "#f0661b" : "#5c616a",
    fontFamily: "inherit",
  });

  return (
    <nav className="adm-bottombar" aria-label="Navigation administration">
      <style>{`
        .adm-bottombar {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 80;
          background: #fff;
          border-top: 1px solid #ece8e0;
          box-shadow: 0 -6px 24px -12px rgba(33,38,42,0.28);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .adm-bottombar-scroll {
          display: flex;
          align-items: stretch;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .adm-bottombar-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
        @media (max-width: 1023px) {
          .adm-bottombar { display: block; }
        }
      `}</style>

      <div className="adm-bottombar-scroll">
        {items.map((item) => {
          const actif = estActif(item);

          if (item.type === "logout") {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{ ...styleItem(false), color: "#c4735a" }}
              >
                <IconeBottom nom={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          }

          if (item.type === "externe") {
            return (
              <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" style={styleItem(false)}>
                <IconeBottom nom={item.icon} />
                <span>{item.label}</span>
              </a>
            );
          }

          return (
            <Link key={item.id} href={item.href} style={styleItem(actif)}>
              <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
                <IconeBottom nom={item.icon} />
                {actif && (
                  <span style={{ position: "absolute", bottom: -5, width: 16, height: 2.5, borderRadius: 999, background: "#f0661b" }} />
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}