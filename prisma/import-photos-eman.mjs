import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Le projet utilise un upload preset non signé : pas de clé API ni de
// secret côté serveur, l'envoi se fait sur l'endpoint public avec le
// nom du cloud et le preset. C'est la même voie que l'admin.
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const DOSSIER = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Sokoa\\EMAN_BD";
const CLOUD_DOSSIER = "coteburo/sokoa/eman";

// Les fichiers Sokoa portent la référence du siège : Eman_NT87K0.jpg.
//
//   NT / NH  dossier tapissé, coque noire / blanche
//   NR / NL  dossier résille
//   NN / NB  dossier toile tendue
//   K        version Direction (absent = collaboratifs)
//
// La première photo devient l'image principale, les suivantes la galerie.

const PRODUITS = [
  {
    nom: "Fauteuil dossier tapissé - Eman Direction",
    principale: "Eman_NT87K0",
    galerie: ["Eman_NT17K0", "Eman_NH87K0", "Eman_NH86K0", "Eman_NT16K0",
              "SOKOA_EMAN_DET_RESPALDO TAPIZADO NEGRO", "SOKOA_EMAN_DET_RESPALDO TAPIZADO BLANCO",
              "Eman_Dir_Amb_Office Direction", "Eman Dir_Amb_Meeting", "Eman dir_bodegon "],
  },
  {
    nom: "Fauteuil dossier résille - Eman Direction",
    principale: "Eman_NR17K",
    galerie: ["Eman_NR16K", "Eman_NL87K", "Eman_NL86K",
              "SOKOA_EMAN_DET_RESPALDO MALLA NEGRO", "SOKOA_EMAN_DET_RESPALDO MALLA BLANCO",
              "Eman Dir_Amb_Bodegon 02", "Eman Dir_Amb_Office"],
  },
  {
    nom: "Fauteuil dossier toile tendue - Eman Direction",
    principale: "Eman_NN170",
    galerie: ["Eman_NB170", "Eman_NB860E_Zoom",
              "EmanToile_Amb bureau", "Eman Toile_Amb coworking"],
  },
  {
    nom: "Fauteuil dossier tapissé - Eman",
    principale: "Eman_NT870",
    galerie: ["Eman_NT860", "Eman_NT170", "Eman_NT160",
              "Eman_NH870", "Eman_NH860", "Eman_NH170", "Eman_NH160",
              "SOKOA_EMAN_DET_RESPALDO TAPIZADO NEGRO", "SOKOA_EMAN_DET_RESPALDO TAPIZADO BLANCO",
              "Eman_Amb_Bodegon", "SOKOA_EMAN_AMBI_01-2024"],
  },
  {
    nom: "Fauteuil dossier résille - Eman",
    principale: "Eman_NR870",
    galerie: ["Eman_NR860", "Eman_NR170", "Eman_NR160",
              "Eman_NL870", "Eman_NL860", "Eman_NL170", "Eman_NL160",
              "SOKOA_EMAN_DET_RESPALDO MALLA NEGRO", "SOKOA_EMAN_DET_RESPALDO MALLA BLANCO",
              "SOKOA_EMAN_AMBI_02-2024", "SOKOA_EMAN_AMBI_03-2024"],
  },
  {
    nom: "Fauteuil dossier toile tendue - Eman",
    principale: "Eman_NN170",
    galerie: ["Eman_NN160", "Eman_NB170", "Eman_NB160", "Eman_NB860E", "Eman_NB860E_Zoom",
              "Eman Toile_Amb coworking2", "Eman Toile_Amb coworking3"],
  },
  {
    nom: "Paire d'accotoirs 4D manchettes PU",
    principale: "SOKOA_EMAN_DET_BRAZO4D SOPORTE ALUM",
    galerie: [],
  },
  {
    nom: "Paire d'accotoirs 4D manchettes PU standard",
    principale: "SOKOA_EMAN_DET_BRAZO_4D_01",
    galerie: ["SOKOA_EMAN_DET_BRAZO_4D_02.ti"],
  },
  {
    nom: "Renfort lombaire réglable Eman",
    principale: "SOKOA_EMAN_DET_LUMBAR_01",
    galerie: ["SOKOA_EMAN_DET_LUMBAR_02"],
  },
];

const IMAGE_GAMME = { gamme: "Eman", fichier: "SOKOA_EMAN_FAMILIA" };

const IMAGES = [".jpg", ".jpeg", ".png", ".webp"];

async function main() {
  if (!CLOUD || !PRESET) {
    console.log("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ou _UPLOAD_PRESET absent du .env — abandon.");
    return;
  }
  console.log(`Cloud : ${CLOUD} · preset : ${PRESET}\n`);

  const entrees = await readdir(DOSSIER, { withFileTypes: true });
  const fichiers = entrees
    .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
    .map((e) => e.name);

  const parBase = new Map();
  for (const f of fichiers) parBase.set(f.slice(0, f.lastIndexOf(".")), f);

  console.log(`${fichiers.length} image(s) dans le dossier.\n`);

  // Un fichier peut servir à plusieurs fiches : on ne l'envoie qu'une fois.
  const urls = new Map();

  async function uploader(base) {
    if (urls.has(base)) return urls.get(base);

    const fichier = parBase.get(base);
    if (!fichier) {
      console.log(`   ⚠ fichier introuvable : ${base}`);
      urls.set(base, null);
      return null;
    }

    try {
      const contenu = await readFile(join(DOSSIER, fichier));
      const form = new FormData();
      form.append("file", new Blob([contenu]), fichier);
      form.append("upload_preset", PRESET);
      form.append("folder", CLOUD_DOSSIER);

      const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
        method: "POST",
        body: form,
      });

      const data = await rep.json();
      if (!rep.ok || !data.secure_url) {
        console.log(`   ✗ ${fichier} : ${data.error?.message || rep.statusText}`);
        urls.set(base, null);
        return null;
      }

      urls.set(base, data.secure_url);
      return data.secure_url;
    } catch (e) {
      console.log(`   ✗ ${fichier} : ${e.message}`);
      urls.set(base, null);
      return null;
    }
  }

  let produitsOk = 0;

  for (const def of PRODUITS) {
    const vitrine = await prisma.produitVitrine.findFirst({
      where: { nom: { startsWith: def.nom } },
      select: { id: true, nom: true },
    });

    if (!vitrine) {
      console.log(`✗ ${def.nom} — produit introuvable en base\n`);
      continue;
    }

    console.log(`▸ ${vitrine.nom}`);

    const principale = await uploader(def.principale);
    const galerie = [];
    for (const base of def.galerie) {
      const u = await uploader(base);
      if (u) galerie.push(u);
    }

    // imageUrl porte la vignette, images[] la galerie.
    // La principale ouvre la galerie, pour rester cohérent.
    const toutes = principale ? [principale, ...galerie] : galerie;

    await prisma.produitVitrine.update({
      where: { id: vitrine.id },
      data: { imageUrl: principale || null, images: toutes },
    });

    console.log(`   ${toutes.length} image(s) rattachée(s)\n`);
    produitsOk++;
  }

  const gamme = await prisma.gamme.findFirst({
    where: { nom: IMAGE_GAMME.gamme },
    select: { id: true, nom: true },
  });
  if (gamme) {
    const u = await uploader(IMAGE_GAMME.fichier);
    if (u) {
      await prisma.gamme.update({ where: { id: gamme.id }, data: { imageUrl: u } });
      console.log(`▸ Gamme ${gamme.nom} — image rattachée\n`);
    }
  }

  const envoyees = [...urls.values()].filter(Boolean).length;
  console.log(`═══ ${produitsOk} produit(s) · ${envoyees} image(s) sur Cloudinary ═══`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());