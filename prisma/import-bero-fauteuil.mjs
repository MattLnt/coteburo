import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Bero";
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
      mk({pietement:"5 branches à roulettes",base:"Noir",tissu:"B"},869,"ER05/31"),
      mk({pietement:"5 branches à roulettes",base:"Noir",tissu:"B+"},879,"ER05/31"),
      mk({pietement:"5 branches à roulettes",base:"Noir",tissu:"C"},891,"ER05/31"),
      mk({pietement:"5 branches à roulettes",base:"Noir",tissu:"D"},945,"ER05/31"),
      mk({pietement:"5 branches à roulettes",base:"Blanc",tissu:"B"},881,"ER05/71"),
      mk({pietement:"5 branches à roulettes",base:"Blanc",tissu:"B+"},891,"ER05/71"),
      mk({pietement:"5 branches à roulettes",base:"Blanc",tissu:"C"},903,"ER05/71"),
      mk({pietement:"5 branches à roulettes",base:"Blanc",tissu:"D"},957,"ER05/71"),
      mk({pietement:"Pyramidale à patins",base:"Noir",tissu:"B"},849,"ER05/11"),
      mk({pietement:"Pyramidale à patins",base:"Noir",tissu:"B+"},859,"ER05/11"),
      mk({pietement:"Pyramidale à patins",base:"Noir",tissu:"C"},871,"ER05/11"),
      mk({pietement:"Pyramidale à patins",base:"Noir",tissu:"D"},925,"ER05/11"),
      mk({pietement:"Pyramidale à patins",base:"Blanc",tissu:"B"},861,"ER05/B1"),
      mk({pietement:"Pyramidale à patins",base:"Blanc",tissu:"B+"},871,"ER05/B1"),
      mk({pietement:"Pyramidale à patins",base:"Blanc",tissu:"C"},883,"ER05/B1"),
      mk({pietement:"Pyramidale à patins",base:"Blanc",tissu:"D"},937,"ER05/B1"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["5 branches à roulettes","Pyramidale à patins"] },
        { id: "base", nom: "Coloris base", valeurs: ["Noir","Blanc"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons`);
  console.log(`\n✓ Fauteuil Bero traité — gamme Bero complète (Chaise + Fauteuil).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
