import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CompteShell from "@/components/compte/CompteShell";

export default async function CompteLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const nomComplet = session.user.name || "";
  const [prenom, ...reste] = nomComplet.split(" ");

  return (
    <CompteShell prenom={prenom || ""} nom={reste.join(" ")} email={session.user.email}>
      {children}
    </CompteShell>
  );
}