"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function DashboardShell({ navItems, societe, email, statut, role = "admin", children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f4ef" }}>
      <Sidebar items={navItems} societe={societe} email={email} collapsed={collapsed} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar societe={societe} email={email} statut={statut} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main style={{ flex: 1, padding: "28px 36px 96px", minWidth: 0 }} className="adm-main">
          <style>{`@media (max-width: 768px){ .adm-main { padding: 20px 18px 96px !important; } }`}</style>
          {children}
        </main>
      </div>
    </div>
  );
}