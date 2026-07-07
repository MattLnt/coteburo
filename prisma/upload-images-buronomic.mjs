import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Config ───
const DOSSIER_SOURCE = "C:\\Users\\akeys\\Documents\\COTEBURO\\Buronomic\\PHOTOS_BURONOMIC_HD\\BURONOMIC_PHOTOS_HD";
const CLOUDINARY_FOLDER = "coteburo/buronomic";
const JOURNAL = "prisma/upload-journal.json";
const INVENTAIRE = "prisma/inventaire-images.json";
const MAX_WIDTH = 1600;   // largeur max en px
const QUALITE = 82;       // qualité JPEG

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function nettoie(str) {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function listerImages(dir, base = dir) {
  let images = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      images = images.concat(listerImages(full, base));
    } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
      const rel = path.relative(base, full);
      images.push({ full, rel });
    }
  }
  return images;
}

// Compresse une image en mémoire et renvoie un buffer + data URI
async function compresser(cheminFichier) {
  const buffer = await sharp(cheminFichier)
    .rotate() // respecte l'orientation EXIF
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITE, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function main() {
  console.log("🔍 Scan du dossier...");
  const images = listerImages(DOSSIER_SOURCE);
  console.log(`   ${images.length} images trouvées.\n`);

  let journal = {};
  if (fs.existsSync(JOURNAL)) {
    journal = JSON.parse(fs.readFileSync(JOURNAL, "utf-8"));
    console.log(`   ${Object.keys(journal).length} déjà uploadées (reprise).\n`);
  }

  const inventaire = {};
  let n = 0, skip = 0, err = 0;

  for (const img of images) {
    const parts = img.rel.split(path.sep);
    const famille = parts[0] || "DIVERS";
    const gammeDir = parts.length > 2 ? parts[1] : "_racine";

    const cleInv = `${famille}/${gammeDir}`;
    if (!inventaire[cleInv]) inventaire[cleInv] = { famille, gammeDir, count: 0, urls: [] };

    const publicId = `${CLOUDINARY_FOLDER}/${nettoie(famille)}/${nettoie(gammeDir)}/${nettoie(path.basename(img.rel))}`;

    if (journal[publicId]) {
      inventaire[cleInv].count++;
      inventaire[cleInv].urls.push(journal[publicId]);
      skip++;
      continue;
    }

    try {
      const dataUri = await compresser(img.full);
      const res = await cloudinary.uploader.upload(dataUri, {
        public_id: publicId,
        overwrite: false,
        resource_type: "image",
      });
      journal[publicId] = res.secure_url;
      inventaire[cleInv].count++;
      inventaire[cleInv].urls.push(res.secure_url);
      n++;
      if (n % 20 === 0) {
        fs.writeFileSync(JOURNAL, JSON.stringify(journal, null, 2));
        console.log(`   ✅ ${n} uploadées...`);
      }
    } catch (e) {
      console.error(`   ⚠️ Erreur sur ${img.rel}: ${e.message}`);
      err++;
    }
  }

  fs.writeFileSync(JOURNAL, JSON.stringify(journal, null, 2));
  fs.writeFileSync(INVENTAIRE, JSON.stringify(inventaire, null, 2));

  console.log(`\n═══════════════════════════════`);
  console.log(`✅ Uploadées : ${n}`);
  console.log(`⏭️  Déjà présentes : ${skip}`);
  console.log(`⚠️  Erreurs : ${err}`);
  console.log(`📁 Gammes-dossiers : ${Object.keys(inventaire).length}`);
}

main().catch(console.error);