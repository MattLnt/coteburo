"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";

export function DashboardShell({ navItems, societe, email, statut, role = "admin", children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="adm-shell" style={{ display: "flex", minHeight: "100vh", background: "#f7f4ef" }}>
      <style>{`
        @media (max-width: 1023px) {
          .adm-sidebar-wrap { display: none; }
          /* Réserve la hauteur de la bottom bar sous le contenu */
          .adm-main { padding: 20px 18px 104px !important; }
        }
      `}</style>

      {/* Sidebar : desktop uniquement. En dessous de 1024px, la navigation
          passe par la bottom bar contextuelle. */}
      <div className="adm-sidebar-wrap">
        <Sidebar items={navItems} societe={societe} email={email} collapsed={collapsed} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar societe={societe} email={email} statut={statut} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="adm-main" style={{ flex: 1, padding: "28px 36px 96px", minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Enfant direct du conteneur racine, comme sur MH Defense — la barre
          n'est imbriquée dans aucune colonne flex. */}
      <BottomBar />
    </div>
  );
}