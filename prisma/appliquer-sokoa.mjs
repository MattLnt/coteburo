import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────
// Charge le .env NOUS-MÊMES (indépendant de dotenv/dotenvx, qui n'injectait rien).
// Lit .env puis .env.local à la racine du projet, sans écraser une var déjà définie.
// ─────────────────────────────────────────────────────────────
function chargerEnv(fichier) {
  if (!existsSync(fichier)) return 0;
  let n = 0;
  for (const ligne of readFileSync(fichier, "utf8").split(/\r?\n/)) {
    const l = ligne.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i === -1) continue;
    const cle = l.slice(0, i).trim();
    let val = l.slice(i + 1).trim();
    // enlève d'éventuels guillemets
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (cle && !(cle in process.env)) { process.env[cle] = val; n++; }
  }
  return n;
}
chargerEnv(".env");
chargerEnv(".env.local");

const prisma = new PrismaClient();
const norm = (s) => (s ?? "").trim().toLowerCase();
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("❌ Clés Cloudinary introuvables après lecture du .env :");
  console.error("   cloud_name :", CLOUD_NAME ? "OK (" + CLOUD_NAME + ")" : "MANQUANT (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ou CLOUDINARY_CLOUD_NAME)");
  console.error("   api_key    :", API_KEY ? "OK" : "MANQUANT (CLOUDINARY_API_KEY)");
  console.error("   api_secret :", API_SECRET ? "OK" : "MANQUANT (CLOUDINARY_API_SECRET)");
  console.error("   → Lance bien la commande depuis la racine du projet (là où est le .env).");
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET, secure: true });

const IMAGES_ROOT = "prisma/sokoa-images";
const DESCR_FILE = "sokoa-descriptions.json";
const dossierGamme = (g) => path.join(IMAGES_ROOT, g.replace(/ /g, "_"));

function toHtmlIntro(txt) {
  const t = String(txt ?? "").trim();
  if (!t) return "";
  if (t.startsWith("<")) return t;
  return t.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
}

function techToSection(txt) {
  const t = String(txt ?? "").trim();
  if (!t) return null;
  const items = t.split(/\s*·\s*/).map((x) => x.trim()).filter(Boolean);
  const contenu = items.length > 1
    ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
    : `<p>${esc(t)}</p>`;
  return { id: uid(), titre: "Caractéristiques techniques", contenu };
}

const cacheUrls = new Map();
async function urlsGamme(gammeNom) {
  if (cacheUrls.has(gammeNom)) return cacheUrls.get(gammeNom);
  const dir = dossierGamme(gammeNom);
  if (!existsSync(dir)) { console.warn(`  ⚠ dossier images absent: ${dir}`); cacheUrls.set(gammeNom, []); return []; }
  const fichiers = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const urls = [];
  for (const f of fichiers) {
    const publicId = `${gammeNom.replace(/ /g, "_")}_${path.parse(f).name}`;
    const res = await cloudinary.uploader.upload(path.join(dir, f), {
      folder: `coteburo/sokoa/${gammeNom.replace(/ /g, "_")}`,
      public_id: publicId, overwrite: false, unique_filename: false, resource_type: "image",
    });
    urls.push(res.secure_url);
  }
  cacheUrls.set(gammeNom, urls);
  console.log(`  ↑ ${gammeNom} : ${urls.length} image(s) sur Cloudinary`);
  return urls;
}

async function main() {
  if (!existsSync(DESCR_FILE)) { console.error(`Fichier ${DESCR_FILE} introuvable à la racine.`); process.exit(1); }
  const data = JSON.parse(readFileSync(DESCR_FILE, "utf8"));

  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const findGamme = (nom) => gammes.find((g) => norm(g.nom) === norm(nom));

  let ok = 0; const manquants = [];
  for (const row of data) {
    const g = findGamme(row.gamme);
    if (!g) { manquants.push(`gamme "${row.gamme}"`); continue; }
    const v = await prisma.produitVitrine.findFirst({
      where: { gammeId: g.id, nom: { equals: row.produit, mode: "insensitive" } },
      select: { id: true },
    });
    if (!v) { manquants.push(`produit "${row.produit}" (${row.gamme})`); continue; }

    const urls = await urlsGamme(row.gamme);
    const section = techToSection(row.descriptionTech);

    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: {
        descriptif: toHtmlIntro(row.descriptif) || null,
        sectionsDevis: section ? [section] : [],
        ...(urls.length ? { imageUrl: urls[0], images: urls } : {}),
      },
    });
    console.log(`  ✓ ${row.gamme} / ${row.produit}`);
    ok++;
  }

  console.log(`\n════════════════════════════════`);
  console.log(`Produits traités : ${ok} / ${data.length}`);
  if (manquants.length) { console.log(`⚠ Introuvables :`); manquants.forEach((m) => console.log("   - " + m)); }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
