import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const prisma = new PrismaClient();

// Lecture du fichier de classement
const raw = await readFile(new URL("./classement_produits.json", import.meta.url), "utf-8");
const mapping = JSON.parse(raw);

const codes = Object.keys(mapping);
console.log(`Classement à appliquer : ${codes.length} produits\n`);

let classes = 0;
let publies = 0;
let depublies = 0;
let introuvables = 0;

for (const code of codes) {
  const { categorie, sousCategorie, publie } = mapping[code];

  // Vérifie que le produit existe
  const existe = await prisma.produit.findUnique({ where: { codeRacine: code }, select: { codeRacine: true } });
  if (!existe) {
    introuvables++;
    continue;
  }

  await prisma.produit.update({
    where: { codeRacine: code },
    data: {
      categorie: categorie,
      sousCategorie: sousCategorie,
      publie: publie,
    },
  });

  if (categorie) classes++;
  if (publie) publies++;
  else depublies++;
}

console.log("=== Résultat ===");
console.log(`Produits mis à jour     : ${classes + depublies}`);
console.log(`Classés (avec catégorie): ${classes}`);
console.log(`Publiés                 : ${publies}`);
console.log(`Non publiés             : ${depublies}`);
if (introuvables > 0) console.log(`Introuvables en base    : ${introuvables}`);

await prisma.$disconnect();