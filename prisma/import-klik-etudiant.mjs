import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Klik";
const NOM_PRODUIT = "Siège étudiant";

const COLORIS = [
  { nom: "Anthracite", couleur: "#4a4d52", ordre: 0 },
  { nom: "Taupe", couleur: "#8b7d6b", ordre: 1 },
  { nom: "Corail", couleur: "#e8746a", ordre: 2 },
  { nom: "Vert", couleur: "#6b8e5a", ordre: 3 },
  { nom: "Jaune", couleur: "#e3c14f", ordre: 4 },
  { nom: "Blanc", couleur: "#f2f0ec", ordre: 5 },
  { nom: "Bleu", couleur: "#3f6fa3", ordre: 6 },
  { nom: "Gris roche (recyclé)", couleur: "#9a978f", ordre: 7 },
  { nom: "Lave (recyclé)", couleur: "#6b6560", ordre: 8 }
];

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
      mk({version:"Compact",tapissage:"Coque PP",tissu:"Sans tissu"},548,"KLRT/G"),
      mk({version:"Compact",tapissage:"Tapissée avant",tissu:"B"},628,"KLST/G"),
      mk({version:"Compact",tapissage:"Tapissée avant",tissu:"B+"},631,"KLST/G"),
      mk({version:"Compact",tapissage:"Tapissée avant",tissu:"C"},635,"KLST/G"),
      mk({version:"Compact",tapissage:"Tapissée avant",tissu:"D"},642,"KLST/G"),
      mk({version:"Compact",tapissage:"Tapissée avant + arrière",tissu:"B"},668,"KLTT/G"),
      mk({version:"Compact",tapissage:"Tapissée avant + arrière",tissu:"B+"},675,"KLTT/G"),
      mk({version:"Compact",tapissage:"Tapissée avant + arrière",tissu:"C"},682,"KLTT/G"),
      mk({version:"Compact",tapissage:"Tapissée avant + arrière",tissu:"D"},696,"KLTT/G"),
      mk({version:"Basique",tapissage:"Coque PP",tissu:"Sans tissu"},476,"KLJT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant",tissu:"B"},556,"KLKT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant",tissu:"B+"},559,"KLKT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant",tissu:"C"},563,"KLKT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant",tissu:"D"},570,"KLKT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant + arrière",tissu:"B"},596,"KLLT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant + arrière",tissu:"B+"},603,"KLLT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant + arrière",tissu:"C"},610,"KLLT/1"),
      mk({version:"Basique",tapissage:"Tapissée avant + arrière",tissu:"D"},624,"KLLT/1"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "version", nom: "Version", valeurs: ["Compact","Basique"] },
        { id: "tapissage", nom: "Tapissage", valeurs: ["Coque PP","Tapissée avant","Tapissée avant + arrière"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["Sans tissu","B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris coque PP", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris coque)`);
  console.log(`\n✓ Siège étudiant Klik traité — gamme Klik complète (Chaise, Tabouret, Chaise giratoire, Siège étudiant).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
