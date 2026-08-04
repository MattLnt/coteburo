import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Rhune";
const NOM_PRODUIT = "Fauteuil";

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
      mk({tablette:"Sans tablette",tissu:"B"},1500,"RUX1/10"),
      mk({tablette:"Sans tablette",tissu:"B+"},1520,"RUX1/10"),
      mk({tablette:"Sans tablette",tissu:"C"},1540,"RUX1/10"),
      mk({tablette:"Sans tablette",tissu:"D"},1590,"RUX1/10"),
      mk({tablette:"Tablette à droite",tissu:"B"},1568,"RUXB/1B"),
      mk({tablette:"Tablette à droite",tissu:"B+"},1588,"RUXB/1B"),
      mk({tablette:"Tablette à droite",tissu:"C"},1608,"RUXB/1B"),
      mk({tablette:"Tablette à droite",tissu:"D"},1658,"RUXB/1B"),
      mk({tablette:"Tablette à gauche",tissu:"B"},1568,"RUXC/1B"),
      mk({tablette:"Tablette à gauche",tissu:"B+"},1588,"RUXC/1B"),
      mk({tablette:"Tablette à gauche",tissu:"C"},1608,"RUXC/1B"),
      mk({tablette:"Tablette à gauche",tissu:"D"},1658,"RUXC/1B"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "tablette", nom: "Tablette", valeurs: ["Sans tablette","Tablette à droite","Tablette à gauche"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons`);
  console.log(`\n✓ Fauteuil Rhune traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
