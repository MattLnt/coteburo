import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Garde d'autorisation des actions serveur de l'administration.
//
// Une action serveur ne passe NI par le middleware de la route qui l'affiche,
// ni par le layout : elle est appelée par son identifiant, et ce qui la
// protège doit donc se trouver dans l'action elle-même. Sans cette garde, un
// simple compte client — l'inscription est ouverte — pouvait appeler les 104
// actions de l'admin : supprimer des produits, changer la marge globale, lire
// et modifier les commandes de tous les clients. Vérifié en conditions
// réelles avant correction.
//
// On lève une exception plutôt que de rediriger : une action appelée hors de
// l'interface n'a pas de page où retourner, et une exception ne peut pas être
// prise pour un succès.
export async function exigerAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Accès refusé : cette action est réservée à l'administration.");
  }
  return session.user;
}

export async function requireUser(role) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/admin/login");
  }
  if (role && user.role !== role) {
    redirect("/admin/login");
  }

  return user;
}