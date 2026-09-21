import { auth } from "@/auth";
import { racineMediatheque, souslaRacine, EST_IMAGE } from "@/lib/mediatheque";

// La vignette d'un fichier du disque, pour l'écran de tri.
//
// POURQUOI UNE ROUTE ET NON UNE ACTION
//   L'écran affiche jusqu'à huit cents vignettes d'un coup. Les renvoyer en
//   data-URI depuis une action serveur ferait une réponse de plusieurs
//   dizaines de mégaoctets, à recharger à chaque navigation. Par une route,
//   le navigateur les demande au fil du défilement et les garde en cache.
//
// CE QU'ELLE NE SERT PAS
//   Autre chose qu'une image sous la racine de la médiathèque. Le chemin
//   vient du navigateur : « ../../ » ramènerait n'importe quel fichier du
//   serveur, et souslaRacine le refuse.

export const dynamic = "force-dynamic";

let sharpCharge = null;
const chargerSharp = () => (sharpCharge ??= import("sharp").then((m) => m.default));

export async function GET(req) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new Response("Réservé à l'administration.", { status: 403 });
  }

  const base = racineMediatheque();
  if (!base) return new Response("Aucune médiathèque sur ce disque.", { status: 404 });

  const rel = new URL(req.url).searchParams.get("f") || "";
  if (!EST_IMAGE.test(rel)) return new Response("Pas une image.", { status: 400 });

  const chemin = souslaRacine(rel, base);
  if (!chemin) return new Response("Chemin hors médiathèque.", { status: 400 });

  const taille = Math.min(600, Math.max(80, parseInt(new URL(req.url).searchParams.get("t") || "220", 10) || 220));

  try {
    const sharp = await chargerSharp();
    const buffer = await sharp(chemin)
      .rotate()
      .resize(taille, taille, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        // Le fichier ne change pas sous son chemin : le navigateur peut le
        // garder. Une image déplacée change de chemin, donc d'adresse.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Illisible.", { status: 404 });
  }
}
