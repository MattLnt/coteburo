// Poser des images sur une fiche : envoi, ligne Visuel, rangement sur disque.
//
// C'est le cœur de l'écran de tri (app/(admin)/admin/visuels/actions.js),
// sorti de là pour que le script prisma/proposer-visuels.mjs fasse
// EXACTEMENT la même chose — même identifiant Cloudinary, même rôle, même
// dossier d'arrivée. Deux chemins d'écriture pour un même geste, c'est deux
// façons de diverger.
//
// CE QU'ELLE GARANTIT
//   - Un fichier n'est déplacé qu'APRÈS un envoi réussi. Un échec laisse le
//     dépôt intact, sans quoi on perd la trace de ce qui reste à faire.
//   - Rien n'est supprimé. Le disque est la seule copie de certaines images.
//   - Une image déjà connue de la fiche (même adresse) n'est pas dupliquée.
//   - Les clés Cloudinary sont lues dans l'environnement, jamais imprimées.
//
// CE QU'ELLE NE FAIT PAS
//   Vérifier qui appelle. L'authentification reste dans l'action serveur ;
//   un script en ligne de commande n'en a pas.
import { mkdir, rename, readFile, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { souslaRacine, dossierFiche } from "./mediatheque.js";

// sharp est un module natif : en production son chargement échoue, et cette
// lib est tirée par un écran de l'admin. On ne le charge qu'au moment de s'en
// servir — c'est-à-dire jamais là où la médiathèque n'existe pas.
let sharpCharge = null;
const chargerSharp = () => (sharpCharge ??= import("sharp").then((m) => m.default));

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// L'envoi non signé de Cloudinary plafonne à dix mégaoctets. Une photo plus
// lourde est réduite à l'envoi ; le fichier d'origine n'est pas touché.
const PLAFOND = 10 * 1024 * 1024;
const LARGEUR_MAX = 2600;

const slug = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** L'identifiant Cloudinary, déduit du chemin — pour qu'un second envoi écrase. */
export const publicIdDe = (rel) => `coteburo/${rel.split(/[/\\]/).map(slug).join("/")}`
  .replace(/\.[a-z0-9]+$/i, "");

export const cloudinaryPret = () => Boolean(CLOUD && PRESET);

async function preparer(chemin) {
  const brut = await readFile(chemin);
  if (brut.length <= PLAFOND) return brut;
  const sharp = await chargerSharp();
  return sharp(brut)
    .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

/** Envoie un fichier local à Cloudinary et rend son adresse. */
export async function envoyerImage(chemin, id) {
  if (!cloudinaryPret()) throw new Error("Cloudinary n'est pas configuré dans l'environnement.");
  const buffer = await preparer(chemin);
  const form = new FormData();
  form.append("file", new Blob([buffer]), basename(chemin));
  form.append("upload_preset", PRESET);
  form.append("public_id", id);
  const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: "POST", body: form });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data.secure_url) {
    throw new Error(data?.error?.message || `HTTP ${rep.status}`);
  }
  return data.secure_url;
}

/** Un nom libre dans le dossier : on n'écrase jamais un fichier déjà rangé. */
async function nomLibre(dossier, nom) {
  let cible = join(dossier, nom);
  const ext = extname(nom);
  for (let i = 2; ; i += 1) {
    try { await stat(cible); } catch { return cible; }
    cible = join(dossier, `${basename(nom, ext)}-${i}${ext}`);
  }
}

/**
 * Pose des images du dépôt sur une fiche.
 *
 * @param prisma   le client Prisma de l'appelant
 * @param base     la racine de la médiathèque
 * @param vitrine  { id, nom, gamme: { nom, marque: { slug } }, visuels: [{ url }] }
 * @param rels     chemins relatifs à la racine, tels que l'écran ou le script
 *                 les a relevés — jamais plus de soixante à la fois
 * @param simuler  true : ne rien envoyer, ne rien déplacer, dire ce qu'on ferait
 * @returns { faits: string[], echecs: { rel, raison }[] }
 */
export async function attribuerAUneFiche({ prisma, base, vitrine, rels, simuler = false }) {
  const relFiche = dossierFiche(vitrine.gamme.marque.slug, vitrine.gamme.nom, vitrine.nom);
  const dossier = souslaRacine(relFiche, base);
  if (!dossier) throw new Error("Dossier de fiche hors médiathèque.");
  if (!simuler) await mkdir(dossier, { recursive: true });

  const connues = new Set(vitrine.visuels.map((x) => x.url));
  let ordre = vitrine.visuels.length;
  const faits = [];
  const echecs = [];

  for (const rel of rels.slice(0, 60)) {
    const source = souslaRacine(rel, base);
    if (!source) { echecs.push({ rel, raison: "hors médiathèque" }); continue; }

    // Une mise en situation part en fin de galerie : le préfixe « amb » est
    // ce que lit prisma/televerser-medias, on le pose ici une fois.
    const estAmbiance = /[/\\]ambiance[/\\]/.test(rel) || /^amb/i.test(basename(rel));
    const estSchema = /[/\\]schema[/\\]/.test(rel);
    let nomCible = basename(rel);
    if (estAmbiance && !/^amb/i.test(nomCible)) nomCible = `amb-${nomCible}`;

    if (simuler) { faits.push(rel); continue; }

    try {
      const url = await envoyerImage(source, publicIdDe(`${relFiche}/${nomCible}`));
      if (!connues.has(url)) {
        connues.add(url);
        // La première image d'une fiche nue fait la vignette — jamais une
        // ambiance ni un schéma.
        const rang = ordre;
        ordre += 1;
        const role = rang === 0 && !estAmbiance && !estSchema ? "vignette"
          : estAmbiance ? "ambiance" : estSchema ? "schema" : "galerie";
        await prisma.visuel.create({ data: { vitrineId: vitrine.id, url, ordre: rang, role } });
      }
      // Rangé seulement maintenant : un échec d'envoi laisse le dépôt intact.
      await rename(source, await nomLibre(dossier, nomCible));
      faits.push(rel);
    } catch (e) {
      echecs.push({ rel, raison: e.message });
    }
  }

  // La vignette de l'ancien modèle reste alimentée : lib/catalogue s'en sert
  // encore pour les listes et pour les accessoires.
  if (faits.length && !simuler) {
    const tous = await prisma.visuel.findMany({
      where: { vitrineId: vitrine.id }, orderBy: { ordre: "asc" }, select: { url: true },
    });
    await prisma.produitVitrine.update({
      where: { id: vitrine.id },
      data: { imageUrl: tous[0]?.url || null, images: tous.slice(1).map((x) => x.url) },
    });
  }

  return { faits, echecs };
}
