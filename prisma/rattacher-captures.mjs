import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rattache à la main les captures que le rapprochement automatique ne
// retrouve pas.
//
// Le script d'import associe un fichier à un produit quand son nom
// commence par l'une des références du produit. Ça échoue dans quatre cas :
//
//   Le configurateur et le catalogue papier ne numérotent pas pareil —
//   la table rectangle Alto Réunion est « DZ98 » au catalogue et « DT86 »
//   dans pCon.
//
//   Le configurateur fait un seul produit là où la base en fait deux —
//   les armoires Classif ont « unis » et « décors » en options, quand la
//   base a une fiche unicolore et une fiche bicolore.
//
//   Le produit n'a aucune référence — les cabines Essentielle et les
//   modules Modul'Up sont vendus sur devis, leurs captures portent un
//   libellé au lieu d'un code.
//
//   Deux produits partagent une référence — la console B-box existe chez
//   Astro Direction et chez Quiétude sous le même « ED98 ».
//
// On déclare donc la correspondance à la main, produit par produit. Le
// dossier est un chemin exact sur le disque, pas un nom de gamme : deux
// dossiers voisins comme « Alto » et « Alto-Réunion » se confondraient.

const APPLIQUER = process.argv.includes("--appliquer");

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Buronomic";

// Pour chaque produit : le nom exact en base, le dossier tel qu'il
// s'écrit sur le disque, le préfixe des fichiers, et facultativement un
// fragment que le nom doit contenir pour départager deux fiches issues
// du même modèle 3D.
const RATTACHEMENTS = [
  // Les cabines Essentielle sont identifiées par leur taille dans le
  // configurateur — « cat/S/default » — et n'ont aucune référence
  // catalogue. Le nom de fichier reprend le titre complet de la fiche.
  {
    produit: "Cabine acoustique S - Essentielle",
    dossier: "Essentielle",
    prefixe: "S_CABINE-ACOUSTIQUE-S-POUR-1-PERSONNE",
  },
  {
    produit: "Cabine acoustique S Bureau - Essentielle",
    dossier: "Essentielle",
    prefixe: "S_CABINE-ACOUSTIQUE-S-AVEC-BUREAU",
  },
  {
    produit: "Cabine acoustique M - Essentielle",
    dossier: "Essentielle",
    prefixe: "M_CABINE-ACOUSTIQUE-M",
  },
  {
    produit: "Cabine acoustique L - Essentielle",
    dossier: "Essentielle",
    prefixe: "L_CABINE-ACOUSTIQUE-L",
  },
  {
    produit: "Cabine acoustique XL - Essentielle",
    dossier: "Essentielle",
    prefixe: "XL_CABINE-ACOUSTIQUE-XL",
  },
];

const IMAGES = [".png", ".jpg", ".jpeg", ".webp"];

const normalise = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const urls = new Map();

async function uploader(dossier, fichier) {
  const cle = `${dossier}/${fichier}`;
  if (urls.has(cle)) return urls.get(cle);

  try {
    const contenu = await readFile(join(RACINE, dossier, "_captures", fichier));
    const form = new FormData();
    form.append("file", new Blob([contenu]), fichier);
    form.append("upload_preset", PRESET);
    form.append("folder", `coteburo/buronomic/${normalise(dossier).replace(/\s+/g, "-")}`);

    const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: "POST",
      body: form,
    });
    const data = await rep.json();

    if (!rep.ok || !data.secure_url) {
      console.log(`      ✗ ${fichier} : ${data.error?.message || rep.statusText}`);
      urls.set(cle, null);
      return null;
    }
    urls.set(cle, data.secure_url);
    return data.secure_url;
  } catch (e) {
    console.log(`      ✗ ${fichier} : ${e.message}`);
    urls.set(cle, null);
    return null;
  }
}

async function main() {
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes du .env."); return; }

  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  let traites = 0, total = 0;

  for (const r of RATTACHEMENTS) {
    const vitrine = await prisma.produitVitrine.findFirst({
      where: { nom: r.produit },
      select: { id: true, nom: true, imageUrl: true, images: true },
    });

    if (!vitrine) {
      console.log(`✗ ${r.produit} — introuvable en base\n`);
      continue;
    }

    let fichiers = [];
    try {
      const entrees = await readdir(join(RACINE, r.dossier, "_captures"), { withFileTypes: true });
      fichiers = entrees
        .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
        .map((e) => e.name)
        .filter((f) => {
          const nom = basename(f, extname(f)).toUpperCase();
          if (!nom.startsWith(r.prefixe.toUpperCase())) return false;
          // Un produit peut n'avoir droit qu'à une partie des captures :
          // les armoires Classif se partagent « unis » et « décors ».
          return r.contient ? nom.includes(r.contient.toUpperCase()) : true;
        })
        .sort();
    } catch (e) {
      console.log(`✗ ${r.produit} — ${join(r.dossier, "_captures")} illisible\n`);
      continue;
    }

    if (!fichiers.length) {
      const filtre = r.contient ? ` et contenant « ${r.contient} »` : "";
      console.log(`✗ ${r.produit} — aucun fichier commençant par « ${r.prefixe} »${filtre}\n`);
      continue;
    }

    // La vue par défaut, sans suffixe, fait la meilleure vignette.
    const parDefaut = fichiers.filter(
      (f) => basename(f, extname(f)).toUpperCase() === r.prefixe.toUpperCase()
    );
    const ordonnees = [...parDefaut, ...fichiers.filter((f) => !parDefaut.includes(f))];

    console.log(`▸ ${vitrine.nom}`);
    console.log(`   ${ordonnees.length} image(s) : ${ordonnees.slice(0, 3).join(", ")}${ordonnees.length > 3 ? "…" : ""}`);

    if (vitrine.imageUrl) {
      console.log(`   ⚠ le produit a déjà une vignette — elle sera remplacée`);
    }

    if (!APPLIQUER) { traites++; total += ordonnees.length; console.log(""); continue; }

    const liens = [];
    for (const f of ordonnees) {
      const u = await uploader(r.dossier, f);
      if (u) liens.push(u);
    }

    if (liens.length) {
      await prisma.produitVitrine.update({
        where: { id: vitrine.id },
        data: { imageUrl: liens[0], images: liens },
      });
      traites++;
      total += liens.length;
      console.log(`   ✓ rattaché\n`);
    }
  }

  console.log(`═══ ${traites} produit(s) · ${total} image(s) ═══`);

  if (!APPLIQUER) console.log("\nnode prisma\\rattacher-captures.mjs --appliquer");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());