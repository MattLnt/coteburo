import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deux corrections après l'import des photos Eman.
//
// 1. Le fauteuil tapissé Direction n'a pas de vignette : le fichier
//    Eman_NT87K0 n'existe pas dans le dossier Sokoa. On prend la première
//    image de sa galerie à la place.
//
// 2. Les deux paires d'accotoirs ont reçu les mêmes photos. Le nom
//    « Paire d'accotoirs 4D manchettes PU » est le préfixe de
//    « ... PU standard », donc startsWith a matché les deux. On sépare :
//    la version Direction à fût aluminium garde sa photo dédiée.

async function main() {
  // ── Vignette manquante ──
  const tapisseDir = await prisma.produitVitrine.findFirst({
    where: { nom: { startsWith: "Fauteuil dossier tapissé - Eman Direction" } },
    select: { id: true, nom: true, imageUrl: true, images: true },
  });

  if (tapisseDir && !tapisseDir.imageUrl && tapisseDir.images.length) {
    await prisma.produitVitrine.update({
      where: { id: tapisseDir.id },
      data: { imageUrl: tapisseDir.images[0] },
    });
    console.log(`✓ ${tapisseDir.nom}`);
    console.log(`   vignette prise dans la galerie\n`);
  }

  // ── Accotoirs mélangés ──
  // On récupère les URL déposées sur la version standard pour les
  // redistribuer correctement entre les deux produits.
  const standard = await prisma.produitVitrine.findFirst({
    where: { nom: { startsWith: "Paire d'accotoirs 4D manchettes PU standard" } },
    select: { id: true, nom: true, images: true },
  });

  const direction = await prisma.produitVitrine.findFirst({
    where: {
      nom: { startsWith: "Paire d'accotoirs 4D manchettes PU" },
      NOT: { nom: { contains: "standard" } },
    },
    select: { id: true, nom: true },
  });

  if (!standard || !direction) {
    console.log("Un des deux produits accotoirs est introuvable.");
    return;
  }

  // Le fichier « SOPORTE ALUM » est celui de la version Direction :
  // le nom espagnol précise le support aluminium poli.
  const urlDirection = standard.images.find((u) => u.includes("SOPORTE") || u.includes("ALUM"));
  const urlsStandard = standard.images.filter((u) => u !== urlDirection);

  if (urlDirection) {
    await prisma.produitVitrine.update({
      where: { id: direction.id },
      data: { imageUrl: urlDirection, images: [urlDirection] },
    });
    console.log(`✓ ${direction.nom}`);
    console.log(`   photo à fût aluminium poli rattachée\n`);
  } else {
    console.log(`⚠ ${direction.nom} — photo SOPORTE ALUM introuvable parmi les images\n`);
  }

  if (urlsStandard.length) {
    await prisma.produitVitrine.update({
      where: { id: standard.id },
      data: { imageUrl: urlsStandard[0], images: urlsStandard },
    });
    console.log(`✓ ${standard.nom}`);
    console.log(`   ${urlsStandard.length} image(s) conservée(s)\n`);
  }

  // ── Contrôle ──
  const sansVignette = await prisma.produitVitrine.findMany({
    where: {
      gamme: { nom: { in: ["Eman", "Eman Direction", "Accessoires Sokoa"] } },
      imageUrl: null,
      images: { isEmpty: false },
    },
    select: { nom: true },
  });

  if (sansVignette.length) {
    console.log(`⚠ ${sansVignette.length} produit(s) avec galerie mais sans vignette :`);
    sansVignette.forEach((p) => console.log(`   ${p.nom}`));
  } else {
    console.log("Tous les produits avec galerie ont leur vignette.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());