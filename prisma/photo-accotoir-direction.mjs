import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Le preset non signé attribue des identifiants aléatoires : impossible
// de savoir quelle image correspond à quel fichier une fois en ligne.
// On réuploade donc la photo manquante et on la pose directement.
//
// Les deux accotoirs se distinguent par le fût : aluminium poli sur la
// version Direction à 97 €, standard sur celle à 75 €. Le fichier
// espagnol « SOPORTE ALUM » désigne bien le support aluminium.

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const DOSSIER = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Sokoa\\EMAN_BD";
const FICHIER = "SOKOA_EMAN_DET_BRAZO4D SOPORTE ALUM.jpg";

async function main() {
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes."); return; }

  const produit = await prisma.produitVitrine.findFirst({
    where: {
      nom: { startsWith: "Paire d'accotoirs 4D manchettes PU" },
      NOT: { nom: { contains: "standard" } },
    },
    select: { id: true, nom: true },
  });

  if (!produit) { console.log("Produit introuvable."); return; }

  const contenu = await readFile(join(DOSSIER, FICHIER));
  const form = new FormData();
  form.append("file", new Blob([contenu]), FICHIER);
  form.append("upload_preset", PRESET);
  form.append("folder", "coteburo/sokoa/eman");

  const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await rep.json();

  if (!rep.ok || !data.secure_url) {
    console.log(`Échec : ${data.error?.message || rep.statusText}`);
    return;
  }

  await prisma.produitVitrine.update({
    where: { id: produit.id },
    data: { imageUrl: data.secure_url, images: [data.secure_url] },
  });

  console.log(`✓ ${produit.nom}`);
  console.log(`   ${data.secure_url}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());