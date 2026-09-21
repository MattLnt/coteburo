import { existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { homedir } from "node:os";

// Où vivent les fichiers de la médiathèque, et comment n'en jamais sortir.
//
// POURQUOI UNE RÉSOLUTION ET PAS UNE VARIABLE
//   MEDIATHEQUE_LOCALE est renseignée, mais avec le chemin d'un autre poste :
//   les écrans qui s'y fient restaient muets sans rien dire, et l'on
//   concluait que la médiathèque « ne marchait pas ». On essaie donc la
//   variable, puis les emplacements habituels, et l'on dit lequel a répondu.
//
//   En production, aucun ne répond — le serveur n'a pas ces fichiers — et
//   c'est le comportement voulu : les écrans concernés s'effacent.

const CANDIDATS = () => [
  process.env.MEDIATHEQUE_LOCALE,
  resolve(homedir(), "Desktop", "Matt", "COTEBURO-MEDIAS"),
  resolve(homedir(), "Bureau", "Matt", "COTEBURO-MEDIAS"),
  resolve(homedir(), "Desktop", "COTEBURO-MEDIAS"),
].filter(Boolean).map((p) => String(p).trim()).filter(Boolean);

/** La racine de la médiathèque, ou null si le disque n'en a aucune. */
export function racineMediatheque() {
  for (const c of CANDIDATS()) {
    try { if (existsSync(c)) return resolve(c); } catch { /* chemin illisible */ }
  }
  return null;
}

/**
 * Un chemin reçu du navigateur, résolu sous la racine — ou null.
 *
 * Tout ce qui vient du navigateur est suspect : « ../../ » ramènerait
 * n'importe quel fichier du serveur. On vérifie que le chemin résolu reste
 * bien à l'intérieur, et non qu'il en a l'air.
 */
export function souslaRacine(relatif, base = racineMediatheque()) {
  if (!base) return null;
  const cible = resolve(base, relatif || "");
  const dedans = relative(resolve(base), cible);
  if (dedans.startsWith("..") || (dedans !== "" && resolve(base, dedans) !== cible)) return null;
  return cible;
}

export const CATALOGUE = "CATALOGUE-2026";
export const DEPOTS = ["photo", "ambiance", "schema"];
export const EST_IMAGE = /\.(jpe?g|png|webp|avif|tiff?)$/i;

// Les mêmes règles de nommage que prisma/televerser-medias, pour viser les
// mêmes dossiers. Une fiche dont le nom dépasse est tronquée et suffixée
// d'une empreinte, sans quoi deux produits au nom voisin se confondraient.
const INTERDITS = /[<>:"/\\|?*]|[\p{Cc}]/gu;

function empreinte(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).slice(0, 4);
}

export function nomSain(s, max) {
  const p = String(s ?? "").replace(INTERDITS, "-")
    .replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
  return p.length <= max ? (p || "sans-nom") : `${p.slice(0, max - 5).trim()}~${empreinte(p)}`;
}

/** Le dossier d'une fiche, relatif à la racine. */
export const dossierFiche = (marqueSlug, gammeNom, ficheNom) =>
  [CATALOGUE, marqueSlug, nomSain(gammeNom, 30), nomSain(ficheNom, 58)].join("/");

/** Le dossier de dépôt d'une gamme, relatif à la racine. */
export const dossierDepot = (marqueSlug, gammeNom) =>
  [CATALOGUE, marqueSlug, nomSain(gammeNom, 30), "_A-TRIER"].join("/");
