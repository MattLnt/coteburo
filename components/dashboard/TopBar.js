"use client";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Icon } from "./Icon";

export function TopBar({ societe, email, statut, role, collapsed, onToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      style={{
        height: 70, flexShrink: 0, background: "#fff", borderBottom: "1px solid #ece8e0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", position: "sticky", top: 0, zIndex: 40,
      }}
    >
      <style>{`
        .tb-site-link {
          display: flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px;
          border: 1px solid #ece8e0; background: #faf8f4; color: #5c616a;
          font-size: 13px; font-weight: 600; text-decoration: none;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .tb-site-link:hover {
          background: #fce6d6; border-color: #f0661b; color: #d9551a;
        }
      `}</style>

      {/* Gauche : toggle + titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={onToggle}
          aria-label="Reduire le menu"
          style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #ece8e0", background: "#f7f4ef", display: "grid", placeItems: "center", cursor: "pointer", color: "#5c616a" }}
        >
          <Icon name="menu" size={18} />
        </button>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#23262a", margin: 0, lineHeight: 1.1 }}>
            {societe}
          </p>
          <p style={{ fontSize: 12, color: "#9aa0a8", margin: 0 }}>Espace administration</p>
        </div>
      </div>

      {/* Droite : voir le site + statut + menu compte */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a href="/" target="_blank" rel="noopener noreferrer" className="tb-site-link">
          <Icon name="eye" size={16} />
          <span>Voir le site</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M7 17L17 7M7 7H17V17" />
          </svg>
        </a>

        <span style={{ width: 1, height: 22, background: "#ece8e0" }} />

        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#d9551a", background: "#fce6d6", padding: "5px 12px", borderRadius: 999 }}>
          {statut === "admin" ? "Administrateur" : statut}
        </span>

        <div ref={ref} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", cursor: "pointer", padding: 4, borderRadius: 999 }}
          >
            <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15 }}>
              {(email || "?")[0]?.toUpperCase()}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa0a8" strokeWidth="2" style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 220, background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, boxShadow: "0 16px 40px rgba(33,36,40,0.12)", overflow: "hidden", zIndex: 60 }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #f2efe9" }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
                <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "2px 0 0" }}>Administrateur</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#23262a" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f4ef")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="logout" size={18} color="#d9551a" />
                Se deconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}