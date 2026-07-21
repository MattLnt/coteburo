import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();

const DOSSIER_SOURCE = "C:\\Users\\akeys\\Documents\\COTEBURO\\Buronomic\\PHOTOS_CARTES";
const CLOUDINARY_FOLDER = "coteburo/buronomic/cartes";
const JOURNAL = "prisma/upload-journal-cartes.json";
const MAX_WIDTH = 1600;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// "astro/plan-droit_1.png" -> { gammeSlug: "astro", carteSlug: "plan-droit", n: 1 }
function parseChemin(cheminComplet) {
  const gammeSlug = path.basename(path.dirname(cheminComplet));
  const base = path.basename(cheminComplet).replace(/\.[^.]+$/, "");
  const idx = base.lastIndexOf("_");
  if (idx === -1) return null;
  const carteSlug = base.slice(0, idx);
  const n = parseInt(base.slice(idx + 1), 10);
  if (Number.isNaN(n)) return null;
  return { gammeSlug, carteSlug, n };
}

function listerImages(dir) {
  let images = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) images = images.concat(listerImages(full));
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) images.push(full);
  }
  return images;
}

// Compresse en PNG, transparence préservée (pour les screenshots pCon).
async function compresser(cheminFichier) {
  const buffer = await sharp(cheminFichier)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function main() {
  console.log("🔍 Scan du dossier...");
  if (!fs.existsSync(DOSSIER_SOURCE)) {
    console.log(`❌ Dossier introuvable : ${DOSSIER_SOURCE}`);
    console.log(`   Lance d'abord : node prisma/creer-dossiers-photos.mjs`);
    return;
  }
  const fichiers = listerImages(DOSSIER_SOURCE);
  console.log(`   ${fichiers.length} images trouvées.\n`);

  let journal = {};
  if (fs.existsSync(JOURNAL)) journal = JSON.parse(fs.readFileSync(JOURNAL, "utf-8"));

  const parCarte = {}; // clé "gamme::carte" -> [{n, url}]
  let uploadees = 0, ignorees = 0, erreurs = 0;

  for (const fichier of fichiers) {
    const parsed = parseChemin(fichier);
    if (!parsed) {
      console.log(`⚠️ Nom invalide, ignoré : ${fichier} (attendu: {gamme}/{carte}_{numero}.png)`);
      erreurs++;
      continue;
    }
    const { gammeSlug, carteSlug, n } = parsed;
    const cle = `${gammeSlug}::${carteSlug}`;
    const publicId = `${CLOUDINARY_FOLDER}/${gammeSlug}/${carteSlug}/${n}`;

    const mtime = fs.statSync(fichier).mtimeMs;
    const entree = journal[publicId];
    const inchange = entree && typeof entree === "object" && entree.mtime === mtime;

    let url = inchange ? entree.url : null;
    if (!url) {
      try {
        const dataUri = await compresser(fichier);
        const res = await cloudinary.uploader.upload(dataUri, { public_id: publicId, overwrite: true, resource_type: "image" });
        url = res.secure_url;
        journal[publicId] = { url, mtime };
        uploadees++;
      } catch (e) {
        console.error(`⚠️ Erreur upload ${fichier} : ${e.message}`);
        erreurs++;
        continue;
      }
    } else {
      ignorees++;
    }

    if (!parCarte[cle]) parCarte[cle] = [];
    parCarte[cle].push({ n, url });
  }

  fs.writeFileSync(JOURNAL, JSON.stringify(journal, null, 2));
  console.log(`\n✅ Uploadées : ${uploadees} · ⏭️ déjà en cache : ${ignorees} · ⚠️ erreurs : ${erreurs}`);

  console.log(`\n=== ASSOCIATION AUX CARTES ===`);
  let maj = 0, introuvables = 0;
  for (const [cle, imgs] of Object.entries(parCarte)) {
    const [gammeSlug, carteSlug] = cle.split("::");
    const urls = imgs.sort((a, b) => a.n - b.n).map((i) => i.url);

    const vitrine = await prisma.produitVitrine.findFirst({
      where: { slug: carteSlug, gamme: { slug: gammeSlug } },
    });
    if (!vitrine) {
      console.log(`⚠️ Carte introuvable : gamme="${gammeSlug}" carte="${carteSlug}"`);
      introuvables++;
      continue;
    }

    await prisma.produitVitrine.update({
      where: { id: vitrine.id },
      data: { imageUrl: urls[0], images: urls },
    });
    console.log(`✅ ${gammeSlug} / ${carteSlug} : ${urls.length} image(s)`);
    maj++;
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`Cartes mises à jour : ${maj}`);
  console.log(`Cartes introuvables : ${introuvables}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());