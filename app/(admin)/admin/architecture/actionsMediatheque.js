"use server";

// Médiathèque locale : parcourir un dossier du disque depuis l'admin, et en
// envoyer des images sur Cloudinary sans passer par l'explorateur de fichiers.
//
// Les visuels fournisseurs arrivent par dossiers de plusieurs centaines de
// fichiers — 1913 images pour OfficePro. Les retrouver un par un dans une
// fenêtre « Ouvrir » est intenable ; il faut les voir.
//
// Le dossier racine est donné par MEDIATHEQUE_LOCALE. Sans cette variable, la
// fonction reste muette et l'onglet Photos n'affiche rien de plus : le disque
// du serveur de production n'a évidemment pas ces fichiers.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve, relative, extname, basename, sep } from "node:path";
import sharp from "sharp";
import { auth } from "@/auth";

const IMAGES = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"];
const VIGNETTE = 180;
const MAX_COTE = 2500;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const racine = () => (process.env.MEDIATHEQUE_LOCALE || "").trim() || null;

// Tout chemin reçu du navigateur est relatif à la racine, et ne doit pas en
// sortir : « ../../ » ramènerait n'importe quel fichier du serveur.
function resoudre(relatif) {
  const base = racine();
  if (!base) return null;
  const cible = resolve(base, relatif || "");
  const dedans = relative(resolve(base), cible);
  if (dedans.startsWith("..") || (dedans !== "" && resolve(base, dedans) !== cible)) return null;
  return cible;
}

async function admin() {
  const session = await auth();
  return !!session?.user;
}

export async function mediathequeActive() {
  return !!racine();
}

export async function listerDossier(relatif = "") {
  if (!(await admin())) return { ok: false, error: "Accès refusé." };
  const base = racine();
  if (!base) return { ok: false, error: "MEDIATHEQUE_LOCALE n'est pas défini." };
  const cible = resoudre(relatif);
  if (!cible) return { ok: false, error: "Chemin hors de la médiathèque." };

  let entrees;
  try {
    entrees = await readdir(cible, { withFileTypes: true });
  } catch (e) {
    return { ok: false, error: `Dossier illisible : ${e.message}` };
  }

  const dossiers = [];
  const images = [];
  for (const e of entrees) {
    if (e.name.startsWith(".") || e.name === "Thumbs.db") continue;
    const rel = join(relatif || "", e.name).split(sep).join("/");
    if (e.isDirectory()) {
      dossiers.push({ nom: e.name, rel });
    } else if (IMAGES.includes(extname(e.name).toLowerCase())) {
      let taille = 0;
      try { taille = (await stat(join(cible, e.name))).size; } catch {}
      images.push({ nom: e.name, rel, taille });
    }
  }

  dossiers.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  images.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { numeric: true }));

  // Fil d'Ariane, pour remonter d'un cran sans retaper le chemin.
  const morceaux = (relatif || "").split("/").filter(Boolean);
  const chemin = morceaux.map((m, i) => ({ nom: m, rel: morceaux.slice(0, i + 1).join("/") }));

  return { ok: true, chemin, dossiers, images };
}

// Dossier probable des visuels d'une gamme, à coller dans la fenêtre « Ouvrir »
// de Windows — plus court que de descendre l'arborescence à la souris.
//
// Les noms de dossier ne collent jamais tout à fait : « arco dossier »,
// « CHEYENNE 2025 », « PROSEAT 2026 », « COIGNY ECO ET COLOR ». On compare donc
// sur les lettres et chiffres seuls, et on retient le dossier le mieux fourni
// en images parmi ceux qui correspondent.
export async function cheminSuggere(gammeNom) {
  if (!(await admin())) return null;
  const base = racine();
  if (!base || !gammeNom) return null;

  const cle = (s) => (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
  const cible = cle(gammeNom);
  if (!cible) return null;

  const candidats = [];
  async function parcourir(dir, rel, prof) {
    if (prof > 3) return;
    let entrees = [];
    try { entrees = await readdir(dir, { withFileTypes: true }); } catch { return; }

    const dossiers = entrees.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const images = entrees.filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase())).length;

    const k = cle(basename(dir));
    // Exact, puis « commence par », puis « contient » : « SCOTT » doit passer
    // avant « SCOTT LUGE », et « TECSY » ne doit pas rafler « TECSY CONCEPT ».
    const score = k === cible ? 3 : k.startsWith(cible) ? 2 : k.includes(cible) ? 1 : 0;
    if (score && rel) candidats.push({ rel, score, images, profondeur: prof });

    for (const d of dossiers) await parcourir(join(dir, d.name), rel ? `${rel}/${d.name}` : d.name, prof + 1);
  }
  await parcourir(base, "", 0);

  if (!candidats.length) return null;
  candidats.sort((a, b) => b.score - a.score || b.images - a.images || a.profondeur - b.profondeur);
  const gagnant = candidats[0];

  // Chemin Windows : c'est ce qui se colle dans la barre d'adresse.
  const chemin = resolve(base, gagnant.rel).split("/").join("\\");
  return {
    chemin,
    rel: gagnant.rel,
    images: gagnant.images,
    // Les autres pistes, quand la gamme est éclatée en plusieurs dossiers.
    autres: candidats.slice(1, 4).map((c) => ({ rel: c.rel, images: c.images })),
  };
}

// Aperçu : on ne renvoie jamais le fichier d'origine, qui peut peser 20 Mo.
export async function vignetteLocale(relatif) {
  if (!(await admin())) return null;
  const cible = resoudre(relatif);
  if (!cible) return null;
  try {
    const buffer = await sharp(cible)
      .rotate()
      .resize(VIGNETTE, VIGNETTE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 68 })
      .toBuffer();
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// Envoi sur Cloudinary depuis le serveur : les octets sont déjà là, les faire
// transiter par le navigateur ne servirait à rien.
//
// L'identifiant reprend le chemin dans la médiathèque : deux envois du même
// fichier écrasent au lieu de créer un doublon, et le nom reste lisible.
export async function importerImagesLocales(relatifs = []) {
  if (!(await admin())) return { ok: false, error: "Accès refusé." };
  if (!CLOUD || !PRESET) return { ok: false, error: "Clés Cloudinary absentes." };

  const urls = [];
  const echecs = [];

  for (const rel of relatifs.slice(0, 40)) {
    const cible = resoudre(rel);
    if (!cible) { echecs.push({ rel, raison: "chemin hors médiathèque" }); continue; }
    try {
      // Tout passe par sharp : le TIFF que Cloudinary refuse en ressort en JPEG,
      // et l'orientation EXIF est appliquée une fois pour toutes.
      //
      // La dimension est plafonnée : les TIFF du catalogue OfficePro pèsent
      // jusqu'à 380 Mo et donnaient encore 20 Mo en JPEG, quand l'envoi non
      // signé s'arrête à 10. 2500 px suffisent largement à une fiche produit.
      const buffer = await sharp(cible)
        .rotate()
        .resize(MAX_COTE, MAX_COTE, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();

      if (buffer.length > 10 * 1024 * 1024) throw new Error("image encore trop lourde après conversion");

      const publicId = "coteburo/mediatheque/" + rel
        .replace(/\.[a-z0-9]+$/i, "")
        .split("/")
        .map((s) => s.trim().replace(/\s+/g, "-").replace(/[?&#%\\]/g, ""))
        .join("/");

      const form = new FormData();
      form.append("file", new Blob([buffer], { type: "image/jpeg" }), basename(cible));
      form.append("upload_preset", PRESET);
      form.append("public_id", publicId);

      const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
      const data = await rep.json().catch(() => ({}));
      if (!rep.ok || !data.secure_url) throw new Error(data?.error?.message || `HTTP ${rep.status}`);
      urls.push(data.secure_url);
    } catch (e) {
      echecs.push({ rel, raison: e.message });
    }
  }

  return { ok: true, urls, echecs };
}
