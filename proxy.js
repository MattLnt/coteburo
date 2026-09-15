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
    // Une action serveur poste sur l'URL de la page qui l'affiche. La
    // rediriger envoie ce POST sur /admin/login, dont le bundle ne contient
    // aucune des 112 actions de l'application : Next répond alors 404 avec
    // l'en-tête x-nextjs-action-not-found. C'était le 404 observé en
    // production sur n'importe quel enregistrement de l'admin — un 404 qui
    // ressemblait à une route manquante alors qu'il disait « session
    // perdue ». On répond donc explicitement, sans rediriger.
    if (req.headers.has("next-action")) {
      return new NextResponse("Session expirée : reconnectez-vous à l'administration.", {
        status: 401,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return redirigerVers("/admin/login", req);
  }

  // Déjà administrateur et sur la page de login → tableau de bord.
  //
  // La condition porte sur le rôle et non sur la seule connexion : un client
  // connecté était renvoyé ici vers /admin, que le layout renvoyait vers
  // /admin/login, en boucle jusqu'à ce que le navigateur abandonne.
  if (isLoginPage && estAdmin) {
    return redirigerVers("/admin", req);
  }

  return NextResponse.next();
});

// Rediriger en restant sur l'hôte réellement appelé.
//
// req.nextUrl n'est pas forcément l'URL demandée : quand AUTH_URL ou
// NEXTAUTH_URL existe dans l'environnement, next-auth réécrit l'origine de la
// requête avec cette valeur avant de nous la passer (reqWithEnvURL, dans
// next-auth/lib/env.js). En production cette origine valait https://coteburo.fr
// alors que le site est servi sur https://www.coteburo.fr, si bien que toute
// redirection construite sur req.nextUrl changeait d'hôte. Les cookies
// d'Auth.js n'ont pas d'attribut Domain — ils sont liés à un hôte précis — et
// ne survivaient pas au saut. On reconstruit donc la cible à partir de
// l'en-tête d'hôte de la requête entrante, quelle que soit la configuration.
function redirigerVers(chemin, req) {
  const url = new URL(chemin, req.nextUrl);
  const hote = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (hote) url.host = hote;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
