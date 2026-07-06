import { auth } from "@/auth";
import ProfilForm from "./ProfilForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon profil · Côté BURO" };

export default async function ProfilPage() {
  const session = await auth();
  const nomComplet = session.user.name || "";
  const [prenom, ...reste] = nomComplet.split(" ");

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Espace client</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">Mon profil</h1>
        <p className="text-ink-soft mt-2">Gérez vos informations personnelles et votre mot de passe.</p>
      </div>

      <ProfilForm prenom={prenom || ""} nom={reste.join(" ")} email={session.user.email} />
    </div>
  );
}