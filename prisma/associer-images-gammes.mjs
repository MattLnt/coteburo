import { PrismaClient } from "@prisma/client";
import fs from "fs";
const prisma = new PrismaClient();

const inv = JSON.parse(fs.readFileSync("prisma/inventaire-images.json", "utf-8"));

// gamme (nom exact base) → dossier image
const MAPPING = {
  "BEWALL CLOISONS": "buronomic-BeWall-Cloisons",
  "ASTROLITE HAUTE": "buronomic-Astrolite-Haute",
  "COHESION": "buronomic-Cohesion-Table-coworking",
  "COHESION HAUTE": "buronomic-Cohesion-Haute",
  "ASTROLITE": "buronomic-Astrolite",
  "ALTO RH": "buronomic-Alto-RH",
  "ENVOL ONE": "buronomic-Envol-One",
  "ASTRO": "buronomic-Astro",
  "PARTAGE": "buronomic-Partage",
  "BEWALL": "buronomic-Bewall-tissus",
  "BEWALL WOOD": "buronomic-Bewall-mela",
  "ERGONOMIE": "buronomic-Ergonomie-Bras-support-ecran",
  "ESSENTIEL": "buronomic-Essentiel",
  "RETRO": "buronomic-Retro",
  "ASTRO DIRECTION": "buronomic-Astro-Direction",
  "STRICTO DIRECTION": "buronomic-Stricto-Direction",
  "ALTO RANGEMENT": "buronomic-Alto-Rangement",
  "CLASSIF": "buronomic-Classif",
  "COMFORT": "buronomic-Comfort",
  "QUIETUDE": "buronomic-Quietude",
  "SOLUTION ABATTANTE": "buronomic-Solution-Tables-Abattantes",
  "PRESTIGE": "buronomic-Prestige",
  "ALTO REUNION": "buronomic-Alto-Reunion",
  "RENCONTRE": "buronomic-Rencontre",
  "FIFTY-FIFTY": "buronomic-Fifty-Fifty",
  "FIFTY-FULL": "buronomic-Fifty-Full",
  "GUEST": "buronomic-Tables-Guest",
};

const MAX = 6;

// index dossier → urls
const urlsParDossier = {};
for (const d of Object.values(inv)) {
  if (!urlsParDossier[d.gammeDir]) urlsParDossier[d.gammeDir] = [];
  urlsParDossier[d.gammeDir].push(...d.urls);
}

let maj = 0;
for (const [gammeNom, dossier] of Object.entries(MAPPING)) {
  const urls = (urlsParDossier[dossier] || []).slice(0, MAX);
  if (!urls.length) { console.log(`⚠️ Pas d'images pour ${gammeNom}`); continue; }

  const gamme = await prisma.gamme.findFirst({ where: { nom: gammeNom } });
  if (!gamme) { console.log(`⚠️ Gamme introuvable : ${gammeNom}`); continue; }

  await prisma.gamme.update({
    where: { id: gamme.id },
    data: { imageUrl: urls[0], images: urls },
  });
  console.log(`✅ ${gammeNom} : ${urls.length} images`);
  maj++;
}

console.log(`\n✅ ${maj} gammes avec images`);
await prisma.$disconnect();