// Remonte les vues nommées en tête de la galerie.
//
// pCon produit toujours une vue de base sans suffixe (« EG98SSC1.png ») en
// plus des décors (« EG98SSC1_Argile.png »). Triée par nom de fichier, elle
// arrivait première : la fiche s'ouvrait donc sur une photo sans pastille,
// alors que les vignettes, elles, montraient des coloris différents.
//
// On ne touche pas à imageUrl : la vignette du catalogue reste la vue de
// base, qui est la photo canonique du produit.
//
//   node prisma/reordonner-images.mjs            (simulation)
//   node prisma/reordonner-images.mjs --appliquer
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const MOTS_AMBIANCE = ["amb_", "amb-", "ambiance", "_amb", "bodegon"];
const estAmbiance = (url) => {
  const nom = decodeURIComponent(url || "").toLowerCase();
  return MOTS_AMBIANCE.some((m) => nom.includes(m));
};

// Même lecture que components/GalerieProduit.js : une image « porte un
// libellé » exactement quand la galerie saurait en tirer une pastille.
const aUnLibelle = (url) => {
  if (!url || estAmbiance(url)) return false;
  const fichier = decodeURIComponent(url.split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
  return fichier.split("_").slice(1).some((t) => t.trim());
};

async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    select: { id: true, nom: true, images: true },
  });

  const aFaire = [];
  for (const v of vitrines) {
    const nommees = v.images.filter(aUnLibelle);
    // Sans aucune vue nommée, il n'y a rien à remonter ; déjà en tête, rien
    // à faire non plus.
    if (!nommees.length || aUnLibelle(v.images[0])) continue;
    // Partition stable : l'ordre alphabétique des décors est conservé, et
    // la vue de base comme les ambiances passent derrière.
    aFaire.push({ v, ordre: [...nommees, ...v.images.filter((u) => !aUnLibelle(u))] });
  }

  console.log(`${vitrines.length} vitrines examinées · ${aFaire.length} à réordonner`);
  for (const { v, ordre } of aFaire.slice(0, 5)) {
    const nom = (u) => decodeURIComponent(u.split("/").pop() || "");
    console.log(`   ${v.nom}\n      avant : ${nom(v.images[0])}\n      après : ${nom(ordre[0])}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer.");
    return;
  }

  for (const { v, ordre } of aFaire) {
    await prisma.produitVitrine.update({ where: { id: v.id }, data: { images: ordre } });
  }
  console.log(`\n${aFaire.length} fiches réordonnées.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
