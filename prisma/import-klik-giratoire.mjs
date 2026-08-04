import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Klik";
const NOM_PRODUIT = "Chaise giratoire";

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
      mk({version:"Standard — base noire",tapissage:"Coque PP",tissu:"Sans tissu"},314,"KLJ0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant",tissu:"B"},394,"KLK0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant",tissu:"B+"},397,"KLK0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant",tissu:"C"},401,"KLK0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant",tissu:"D"},408,"KLK0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant + arrière",tissu:"B"},434,"KLL0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant + arrière",tissu:"B+"},441,"KLL0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant + arrière",tissu:"C"},448,"KLL0/3"),
      mk({version:"Standard — base noire",tapissage:"Tapissée avant + arrière",tissu:"D"},462,"KLL0/3"),
      mk({version:"Standard — base blanche",tapissage:"Coque PP",tissu:"Sans tissu"},324,"KLJ0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant",tissu:"B"},404,"KLK0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant",tissu:"B+"},407,"KLK0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant",tissu:"C"},411,"KLK0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant",tissu:"D"},418,"KLK0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant + arrière",tissu:"B"},444,"KLL0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant + arrière",tissu:"B+"},451,"KLL0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant + arrière",tissu:"C"},458,"KLL0/7"),
      mk({version:"Standard — base blanche",tapissage:"Tapissée avant + arrière",tissu:"D"},472,"KLL0/7"),
      mk({version:"Haute — lift assis-debout",tapissage:"Coque PP",tissu:"Sans tissu"},218,"KLJH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant",tissu:"B"},298,"KLKH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant",tissu:"B+"},301,"KLKH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant",tissu:"C"},305,"KLKH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant",tissu:"D"},312,"KLKH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant + arrière",tissu:"B"},338,"KLLH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant + arrière",tissu:"B+"},345,"KLLH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant + arrière",tissu:"C"},352,"KLLH/2"),
      mk({version:"Haute — lift assis-debout",tapissage:"Tapissée avant + arrière",tissu:"D"},366,"KLLH/2"),
      mk({version:"Haute — lift haut",tapissage:"Coque PP",tissu:"Sans tissu"},218,"KLJH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant",tissu:"B"},298,"KLKH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant",tissu:"B+"},301,"KLKH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant",tissu:"C"},305,"KLKH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant",tissu:"D"},312,"KLKH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant + arrière",tissu:"B"},338,"KLLH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant + arrière",tissu:"B+"},345,"KLLH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant + arrière",tissu:"C"},352,"KLLH/0"),
      mk({version:"Haute — lift haut",tapissage:"Tapissée avant + arrière",tissu:"D"},366,"KLLH/0"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "version", nom: "Version", valeurs: ["Standard — base noire","Standard — base blanche","Haute — lift assis-debout","Haute — lift haut"] },
        { id: "tapissage", nom: "Tapissage", valeurs: ["Coque PP","Tapissée avant","Tapissée avant + arrière"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["Sans tissu","B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris coque PP", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris coque)`);
  console.log(`\n✓ Chaise giratoire Klik traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
