import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CompteShell from "@/components/compte/CompteShell";

export default async function CompteLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  // Un administrateur n'a pas d'espace client : ses commandes, ses favoris et
  // son profil n'existent pas. Le laisser entrer ici affichait un espace vide
  // au nom du compte d'administration, et le faisait passer pour un client.
  if (session.user.role === "ADMIN") redirect("/admin");

  const nomComplet = session.user.name || "";
  const [prenom, ...reste] = nomComplet.split(" ");

  return (
    <CompteShell prenom={prenom || ""} nom={reste.join(" ")} email={session.user.email}>
      {children}
    </CompteShell>
  );
}