import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Ildo";
const NOM_PRODUIT = "Fauteuil lounge";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!v) {
    console.error(`⚠ Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }

  const decl = [
      mk({modele:"Dos haut, têtière + accotoirs",base:"Pyramidale noire",tissu:"C"},1275,"DOA1/3"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Pyramidale noire",tissu:"Select"},1375,"DOA1/3"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Pyramidale blanche",tissu:"C"},1275,"DOA1/7"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Pyramidale blanche",tissu:"Select"},1375,"DOA1/7"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Plate noire",tissu:"C"},1415,"DOA1/N"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Plate noire",tissu:"Select"},1515,"DOA1/N"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Plate alu poli",tissu:"C"},1415,"DOA1/P"),
      mk({modele:"Dos haut, têtière + accotoirs",base:"Plate alu poli",tissu:"Select"},1515,"DOA1/P"),
      mk({modele:"Dos haut, têtière",base:"Pyramidale noire",tissu:"C"},1146,"DOB0/3"),
      mk({modele:"Dos haut, têtière",base:"Pyramidale noire",tissu:"Select"},1236,"DOB0/3"),
      mk({modele:"Dos haut, têtière",base:"Pyramidale blanche",tissu:"C"},1146,"DOB0/7"),
      mk({modele:"Dos haut, têtière",base:"Pyramidale blanche",tissu:"Select"},1236,"DOB0/7"),
      mk({modele:"Dos haut, têtière",base:"Plate noire",tissu:"C"},1286,"DOB0/N"),
      mk({modele:"Dos haut, têtière",base:"Plate noire",tissu:"Select"},1376,"DOB0/N"),
      mk({modele:"Dos haut, têtière",base:"Plate alu poli",tissu:"C"},1286,"DOB0/P"),
      mk({modele:"Dos haut, têtière",base:"Plate alu poli",tissu:"Select"},1376,"DOB0/P"),
      mk({modele:"Dos moyen, accotoirs",base:"Pyramidale noire",tissu:"C"},1125,"DOC1/3"),
      mk({modele:"Dos moyen, accotoirs",base:"Pyramidale noire",tissu:"Select"},1218,"DOC1/3"),
      mk({modele:"Dos moyen, accotoirs",base:"Pyramidale blanche",tissu:"C"},1125,"DOC1/7"),
      mk({modele:"Dos moyen, accotoirs",base:"Pyramidale blanche",tissu:"Select"},1218,"DOC1/7"),
      mk({modele:"Dos moyen, accotoirs",base:"Plate noire",tissu:"C"},1265,"DOC1/N"),
      mk({modele:"Dos moyen, accotoirs",base:"Plate noire",tissu:"Select"},1358,"DOC1/N"),
      mk({modele:"Dos moyen, accotoirs",base:"Plate alu poli",tissu:"C"},1265,"DOC1/P"),
      mk({modele:"Dos moyen, accotoirs",base:"Plate alu poli",tissu:"Select"},1358,"DOC1/P"),
      mk({modele:"Dos bas",base:"Pyramidale noire",tissu:"C"},931,"DOD0/3"),
      mk({modele:"Dos bas",base:"Pyramidale noire",tissu:"Select"},1001,"DOD0/3"),
      mk({modele:"Dos bas",base:"Pyramidale blanche",tissu:"C"},931,"DOD0/7"),
      mk({modele:"Dos bas",base:"Pyramidale blanche",tissu:"Select"},1001,"DOD0/7"),
      mk({modele:"Dos bas",base:"Plate noire",tissu:"C"},1071,"DOD0/N"),
      mk({modele:"Dos bas",base:"Plate noire",tissu:"Select"},1141,"DOD0/N"),
      mk({modele:"Dos bas",base:"Plate alu poli",tissu:"C"},1071,"DOD0/P"),
      mk({modele:"Dos bas",base:"Plate alu poli",tissu:"Select"},1141,"DOD0/P"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "modele", nom: "Modèle", valeurs: ["Dos haut, têtière + accotoirs","Dos haut, têtière","Dos moyen, accotoirs","Dos bas"] },
        { id: "base", nom: "Base giratoire", valeurs: ["Pyramidale noire","Pyramidale blanche","Plate noire","Plate alu poli"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["C","Select"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons`);
  console.log(`\n✓ Ildo traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
