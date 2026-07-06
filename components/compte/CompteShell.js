"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/compte", label: "Tableau de bord", icon: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
  { href: "/compte/commandes", label: "Mes commandes", icon: (<><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></>) },
  { href: "/compte/favoris", label: "Mes favoris", icon: (<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />) },
  { href: "/compte/profil", label: "Mon profil", icon: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>) },
];

export default function CompteShell({ prenom, nom, email, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initiale = (prenom?.[0] || email?.[0] || "?").toUpperCase();

  const estActif = (href) => href === "/compte" ? pathname === "/compte" : pathname.startsWith(href);

  const NavLinks = ({ onClick }) => (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV.map((item) => {
        const actif = estActif(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onClick}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12,
              fontSize: 14.5, fontWeight: 600, textDecoration: "none", transition: "all .15s",
              background: actif ? "#f0661b" : "transparent",
              color: actif ? "#fff" : "#cdd1d6",
            }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarContent = ({ onClick }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", padding: "6px 8px 22px" }}>
        <span style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
      </Link>

      {/* Carte utilisateur */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
        <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "#f0661b", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{initiale}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 13.5, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[prenom, nom].filter(Boolean).join(" ") || "Mon compte"}</p>
          <p style={{ color: "#9aa0a8", fontSize: 12, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
        </div>
      </div>

      <NavLinks onClick={onClick} />

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, fontSize: 14.5, fontWeight: 600, background: "transparent", border: "none", color: "#cdd1d6", cursor: "pointer", transition: "color .15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#cdd1d6")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f4ef" }}>
      <style>{`
        .cpt-sidebar { display: none; }
        .cpt-topbar { display: flex; }
        @media (min-width: 1024px) {
          .cpt-sidebar { display: block; }
          .cpt-topbar { display: none; }
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="cpt-sidebar" style={{ width: 268, flexShrink: 0, background: "#212428", position: "sticky", top: 0, height: "100vh" }}>
        <SidebarContent />
      </aside>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* TopBar mobile */}
        <div className="cpt-topbar" style={{ alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#212428", position: "sticky", top: 0, zIndex: 40 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
          </Link>
          <button onClick={() => setOpen(true)} style={{ display: "grid", placeItems: "center", width: 40, height: 40, background: "transparent", border: "none", color: "#fff", cursor: "pointer" }} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>

        <main style={{ flex: 1, padding: "32px 40px 80px", minWidth: 0 }} className="cpt-main">
          <style>{`@media (max-width: 768px){ .cpt-main { padding: 22px 18px 80px !important; } }`}</style>
          {children}
        </main>
      </div>

      {/* Drawer mobile */}
      <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: open ? "auto" : "none" }}>
        <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity .3s" }} />
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "82%", maxWidth: 300, background: "#212428", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .3s" }}>
          <SidebarContent onClick={() => setOpen(false)} />
        </div>
      </div>
    </div>
  );
}