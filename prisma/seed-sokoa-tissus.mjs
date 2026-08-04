// ─────────────────────────────────────────────────────────────────────────
//  Seed des palettes tissu Sokoa (B / B+ / C / D) dans la bibliothèque
//  de finitions, avec upload des vrais swatches sur Cloudinary.
//
//  UTILISATION
//  1. Décompresse sokoa_swatches.zip à la racine du projet → dossier
//     ./sokoa_swatches (contient les 144 images + manifest.json).
//  2. Rien à renseigner : les identifiants Cloudinary sont lus depuis ton .env
//     (les mêmes variables que ton app).
//  3. Lance depuis la racine du projet :  node prisma/seed-sokoa-tissus.mjs
//
//  Nécessite le paquet dotenv (npm i dotenv s'il manque).
//  Idempotent : relançable sans créer de doublons (il saute ce qui existe déjà).
// ─────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// ═══════════════ Lu automatiquement depuis ton .env ═══════════════
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const SWATCHES_DIR = "./sokoa_swatches"; // dossier décompressé (manifest.json + .jpeg)
// ══════════════════════════════════════════════════════════════════

const prisma = new PrismaClient();

const ORDRE_PALETTE = { "B": 0, "B+": 1, "C": 2, "D": 3 };
const NOM_PALETTE = { "B": "Tissu B", "B+": "Tissu B+", "C": "Tissu C", "D": "Tissu D" };

async function uploadCloudinary(filePath) {
  const data = fs.readFileSync(filePath);
  const blob = new Blob([data]);
  const fd = new FormData();
  fd.append("file", blob, path.basename(filePath));
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Cloudinary ${res.status}`);
  return json.secure_url;
}

async function trouverOuCreerPalette(categorie) {
  const nom = NOM_PALETTE[categorie];
  let palette = await prisma.paletteFinition.findFirst({ where: { nom } });
  if (!palette) {
    palette = await prisma.paletteFinition.create({
      data: { nom, marque: "Sokoa", ordre: ORDRE_PALETTE[categorie] ?? 0 },
    });
    console.log(`  + palette créée : ${nom}`);
  }
  return palette;
}

async function main() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.error("⛔ Variables Cloudinary introuvables. Vérifie ton .env (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET).");
    process.exit(1);
  }
  const manifestPath = path.join(SWATCHES_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`⛔ manifest.json introuvable dans ${SWATCHES_DIR}. Décompresse le zip et vérifie SWATCHES_DIR.`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`Manifest : ${manifest.length} swatches à traiter.\n`);

  // 1) palettes
  const palettes = {};
  for (const cat of ["B", "B+", "C", "D"]) palettes[cat] = await trouverOuCreerPalette(cat);

  // 2) finitions
  let cree = 0, saute = 0, erreurs = 0;
  const compteur = { "B": 0, "B+": 0, "C": 0, "D": 0 };

  for (const m of manifest) {
    const palette = palettes[m.categorie];
    const label = m.label || `${m.code} — ${m.nom}`;
    const ordre = compteur[m.categorie]++;

    // déjà présent ? (même nom dans la même palette, avec image) → on saute
    const existant = await prisma.finitionModele.findFirst({
      where: { nom: label, paletteId: palette.id },
    });
    if (existant && existant.imageUrl) { saute++; continue; }

    try {
      const filePath = path.join(SWATCHES_DIR, m.fichier);
      const url = await uploadCloudinary(filePath);
      if (existant) {
        await prisma.finitionModele.update({ where: { id: existant.id }, data: { imageUrl: url } });
      } else {
        await prisma.finitionModele.create({
          data: { nom: label, imageUrl: url, paletteId: palette.id, ordre },
        });
      }
      cree++;
      if (cree % 10 === 0) console.log(`  … ${cree} swatches uploadés`);
    } catch (e) {
      erreurs++;
      console.warn(`  ⚠ ${label} (${m.fichier}) : ${e.message}`);
    }
  }

  console.log(`\n✅ Terminé. Créés/mis à jour : ${cree} · déjà présents : ${saute} · erreurs : ${erreurs}`);
  console.log("Va dans Architecture → onglet Finitions : tu verras les 4 palettes Tissu B/B+/C/D.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());