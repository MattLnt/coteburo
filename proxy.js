import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// On instancie NextAuth à partir de la configuration SANS base : le middleware
// ne fait que relire un JWT déjà émis. Importer auth.js à la place lui
// faisait embarquer le client Prisma et ses moteurs de requête — 80 Mo pour
// une vérification de jeton.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");

  // Être connecté ne suffit pas : l'inscription est ouverte à tous, et un
  // compte client n'a rien à faire dans l'administration. C'est le rôle qui
  // décide.
  const estAdmin = req.auth?.user?.role === "ADMIN";

  // Sur une route admin (hors login) sans être administrateur → login
  if (isAdminRoute && !isLoginPage && !estAdmin) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }

  // Déjà administrateur et sur la page de login → tableau de bord.
  //
  // La condition porte sur le rôle et non sur la seule connexion : un client
  // connecté était renvoyé ici vers /admin, que le layout renvoyait vers
  // /admin/login, en boucle jusqu'à ce que le navigateur abandonne.
  if (isLoginPage && estAdmin) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
