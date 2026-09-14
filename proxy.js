import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// On instancie NextAuth à partir de la configuration SANS base : le middleware
// ne fait que relire un JWT déjà émis. Importer auth.js à la place lui
// faisait embarquer le client Prisma et ses moteurs de requête — 80 Mo pour
// une vérification de jeton.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");

  // Sur une route admin (hors login) sans être connecté → redirige vers le login
  if (isAdminRoute && !isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }

  // Déjà connecté et sur la page de login → redirige vers le dashboard
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
