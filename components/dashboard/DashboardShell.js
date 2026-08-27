"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";

export function DashboardShell({ navItems, societe, email, statut, role = "admin", children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", background: "#f7f4ef" }}>
        {/* Sidebar : desktop uniquement. En dessous de 1024px, la navigation
            passe par la bottom bar contextuelle. */}
        <div className="adm-sidebar-wrap">
          <Sidebar items={navItems} societe={societe} email={email} collapsed={collapsed} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar societe={societe} email={email} statut={statut} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          <main style={{ flex: 1, padding: "28px 36px 96px", minWidth: 0 }} className="adm-main">
            <style>{`
              @media (max-width: 1023px) {
                .adm-sidebar-wrap { display: none; }
                /* Marge basse pour que le contenu ne passe pas sous la bottom bar */
                .adm-main { padding: 20px 18px 104px !important; }
              }
            `}</style>
            {children}
          </main>
        </div>
      </div>

      {/* Hors du conteneur flex : un parent en display:flex peut empêcher
          position:fixed de se caler sur le viewport sur certains navigateurs mobiles. */}
      <BottomBar />
    </>
  );
}