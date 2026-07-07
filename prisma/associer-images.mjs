import { PrismaClient } from "@prisma/client";
import fs from "fs";
const prisma = new PrismaClient();

const inv = JSON.parse(fs.readFileSync("prisma/inventaire-images.json", "utf-8"));

// Mapping validé : gamme base → gammeDir de l'inventaire
const MAPPING = {
  "ALTO": "buronomic-Alto",
  "ALTO ASSISE": "buronomic-Alto-Solutions-assise",
  "ALTO BIBLIOTHEQUE": "buronomic-Alto-Bibliotheque",
  "ALTO RANGEMENT": "buronomic-Alto-Rangement",
  "ALTO REUNION": "buronomic-Alto-Reunion",
  "ASTRO DIRECTION": "buronomic-Astro-Direction",
  "ASTROLITE": "buronomic-Astrolite",
  "ASTROLITE HAUTE": "buronomic-Astrolite-Haute",
  "BEWALL CLOISONS": "buronomic-BeWall-Cloisons",
  "CLASSIF": "buronomic-Classif",
  "COMFORT": "buronomic-Comfort",
  "ENVOL ONE": "buronomic-Envol-One",
  "FIFTY-FIFTY": "buronomic-Fifty-Fifty",
  "QUIETUDE": "buronomic-Quietude",
  "RENCONTRE": "buronomic-Rencontre",
  "SOLUTION ABATTANTE": "buronomic-Solution-Tables-Abattantes",
  "SOLUTION PLIANTE": "buronomic-Solution-Tables-Pliantes",
  "STRICTO DIRECTION": "buronomic-Stricto-Direction",
};

const MAX_IMAGES = 5;

// Construit un index gammeDir → urls (en cherchant dans toutes les familles)
const urlsParGammeDir = {};
for (const d of Object.values(inv)) {
  if (!urlsParGammeDir[d.gammeDir]) urlsParGammeDir[d.gammeDir] = [];
  urlsParGammeDir[d.gammeDir].push(...d.urls);
}

let maj = 0, sansMatch = 0;
const gammesTraitees = new Set();

for (const [gamme, gammeDir] of Object.entries(MAPPING)) {
  const urls = (urlsParGammeDir[gammeDir] || []).slice(0, MAX_IMAGES);
  if (urls.length === 0) {
    console.log(`⚠️ Aucune image trouvée pour ${gamme} (${gammeDir})`);
    continue;
  }

  const produits = await prisma.produit.findMany({ where: { gamme }, select: { codeRacine: true } });
  for (const p of produits) {
    await prisma.produit.update({
      where: { codeRacine: p.codeRacine },
      data: { imageUrl: urls[0], images: urls },
    });
    maj++;
  }
  gammesTraitees.add(gamme);
  console.log(`✅ ${gamme} : ${produits.length} produits × ${urls.length} images`);
}

// Compte les produits laissés sans image
const total = await prisma.produit.count();
const avecImage = await prisma.produit.count({ where: { imageUrl: { not: null } } });

console.log(`\n═══════════════════════════════`);
console.log(`✅ ${maj} produits mis à jour avec images`);
console.log(`📊 ${avecImage}/${total} produits ont une image`);

await prisma.$disconnect();