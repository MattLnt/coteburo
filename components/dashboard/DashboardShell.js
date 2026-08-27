"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";

export function DashboardShell({ navItems, societe, email, statut, role = "admin", children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ minHeight: "100%" }}>
      <style>{`
        @media (min-width: 1024px) {
          .adm-mobile-wrapper { display: none !important; }
        }
        @media (max-width: 1023px) {
          .adm-desktop-wrapper { display: none !important; }
        }
      `}</style>

      {/* ===== LAYOUT DESKTOP ===== */}
      <div className="adm-desktop-wrapper" style={{ display: "flex", minHeight: "100vh", background: "#f7f4ef" }}>
        <Sidebar items={navItems} societe={societe} email={email} collapsed={collapsed} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar societe={societe} email={email} statut={statut} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          <main style={{ flex: 1, padding: "28px 36px 60px", minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>

      {/* ===== LAYOUT MOBILE =====
          Structure calquée sur Skillio : le contenu défile dans son PROPRE
          conteneur (overflow-y: auto), pas dans la page. La barre d'adresse du
          navigateur ne se rétracte donc jamais, et la nav fixe reste visible. */}
      <div className="adm-mobile-wrapper" style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f7f4ef" }}>
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "20px 18px", paddingBottom: "90px" }}>
          {children}
        </div>
        <BottomBar />
      </div>
    </div>
  );
}