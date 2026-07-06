import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const classement = {
  // Bibliothèques (bacs, cubes de rangement ALTO BIBLIOTHEQUE)
  DU04: "bibliotheques", DU05: "bibliotheques", DU06: "bibliotheques",
  EH07: "bibliotheques", EH08: "bibliotheques", EH09: "bibliotheques",
  // Armoires (châssis, rangements porte battante, tops rangement)
  AE01: "armoires", AE29: "armoires",
  DY27: "armoires", DY29: "armoires",
  BJ08: "armoires", BJ09: "armoires", BJ10: "armoires",
  BH71: "armoires", BH72: "armoires",
};

let n = 0;
for (const [code, sousCat] of Object.entries(classement)) {
  const exist = await prisma.produit.findUnique({ where: { codeRacine: code }, select: { codeRacine: true } });
  if (!exist) { console.log(`⚠ ${code} introuvable`); continue; }
  await prisma.produit.update({
    where: { codeRacine: code },
    data: { sousCategorie: sousCat },
  });
  n++;
}

console.log(`\n✅ ${n} produits complétés.`);

// Vérification : reste-t-il des produits sans sous-catégorie ?
const restants = await prisma.produit.count({
  where: { categorie: { not: null }, OR: [{ sousCategorie: null }, { sousCategorie: "" }] },
});
console.log(`Produits restants sans sous-catégorie : ${restants}`);

await prisma.$disconnect();