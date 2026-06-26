import { requireUser } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ADMIN_NAV } from "@/components/dashboard/navConfig";

export default async function AdminLayout({ children }) {
  const user = await requireUser("ADMIN");

  return (
    <DashboardShell navItems={ADMIN_NAV} societe="Administration" email={user?.email} statut="admin" role="admin">
      {children}
    </DashboardShell>
  );
}