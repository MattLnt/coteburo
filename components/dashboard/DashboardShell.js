"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import styles from "./DashboardShell.module.css";

export function DashboardShell({ navItems, societe, email, statut, role = "admin", children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.shell}>
      {/* Sidebar : desktop uniquement. En dessous de 1024px, la navigation
          passe par la bottom bar contextuelle. */}
      <div className={styles.sideWrap}>
        <Sidebar items={navItems} societe={societe} email={email} collapsed={collapsed} />
      </div>

      <div className={styles.colonne}>
        <TopBar societe={societe} email={email} statut={statut} role={role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className={styles.main}>
          {children}
        </main>
      </div>

      {/* Enfant direct du conteneur racine, comme sur MH Defense. */}
      <BottomBar />
    </div>
  );
}