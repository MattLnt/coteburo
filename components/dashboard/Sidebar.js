"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

export function Sidebar({ items, societe, email, collapsed }) {
  const pathname = usePathname();
  const width = collapsed ? 76 : 260;

  // Une page produit vit techniquement sous /admin/architecture/[id]/carte/[vitrineId] —
  // mais dans le menu, elle doit allumer "Produits", jamais "Gammes".
  const surPageProduit = pathname.includes("/carte/");

  return (
    <aside
      style={{
        width, flexShrink: 0, background: "#212428", color: "#cdd1d6",
        display: "flex", flexDirection: "column", position: "sticky", top: 0,
        height: "100vh", transition: "width 0.22s ease", overflow: "hidden",
      }}
      className="bm-sidebar"
    >
      <style>{`
        @media (max-width: 768px){ .bm-sidebar { display: none !important; } }

        /* Scrollbar premium : invisible par défaut, visible finement au survol, sans flèches */
        .bm-nav {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .bm-nav:hover {
          scrollbar-color: rgba(255,255,255,0.18) transparent;
        }
        .bm-nav::-webkit-scrollbar {
          width: 6px;
        }
        .bm-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .bm-nav::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 10px;
        }
        .bm-nav:hover::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.18);
        }
        .bm-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.32);
        }
        .bm-nav::-webkit-scrollbar-button {
          display: none;
          height: 0;
          width: 0;
        }
      `}</style>

      {/* Logo */}
      <div style={{ height: 70, display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "0 0 0 26px" : "0 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <span style={{ width: 11, height: 11, borderRadius: 3, background: "#f0661b", transform: "rotate(45deg)", flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "#fff", whiteSpace: "nowrap" }}>
            Côté<span style={{ color: "#f0661b" }}>BURO</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="bm-nav" style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
        {items.map((group) => (
          <div key={group.section} style={{ marginBottom: 18 }}>
            {!collapsed && (
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7178", padding: "0 12px", margin: "0 0 8px" }}>
                {group.section}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map((item) => {
                let active;
                if (surPageProduit) {
                  active = item.href === "/admin/produits";
                } else {
                  active = pathname === item.href || (item.href !== "/admin" && item.href !== "/" && pathname.startsWith(item.href));
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: collapsed ? "11px 0" : "10px 12px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      borderRadius: 10, textDecoration: "none",
                      fontSize: 14, fontWeight: active ? 600 : 500,
                      color: active ? "#fff" : "#9aa0a8",
                      background: active ? "#f0661b" : "transparent",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9aa0a8"; } }}
                  >
                    <span style={{ flexShrink: 0, display: "flex" }}><Icon name={item.icon} size={19} /></span>
                    {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pied : compte */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: collapsed ? "14px 0" : "14px 16px", flexShrink: 0 }}>
        {collapsed ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(240,102,27,0.18)", color: "#f0661b", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>
              {(email || "?")[0]?.toUpperCase()}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(240,102,27,0.18)", color: "#f0661b", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {(email || "?")[0]?.toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{societe}</p>
              <p style={{ fontSize: 11.5, color: "#6b7178", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}