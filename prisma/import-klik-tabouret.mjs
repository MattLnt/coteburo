import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Klik";
const NOM_PRODUIT = "Tabouret";

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
      mk({pietement:"Métal",hauteur:"Haute",tapissage:"Coque PP",tissu:"Sans tissu"},280,"KLH0"),
      mk({pietement:"Métal",hauteur:"Basse",tapissage:"Coque PP",tissu:"Sans tissu"},275,"KLM0"),
      mk({pietement:"Métal",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"B"},334,"KLHB"),
      mk({pietement:"Métal",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"B+"},337,"KLHB"),
      mk({pietement:"Métal",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"C"},340,"KLHB"),
      mk({pietement:"Métal",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"D"},348,"KLHB"),
      mk({pietement:"Métal",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"B"},329,"KLMB"),
      mk({pietement:"Métal",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"B+"},332,"KLMB"),
      mk({pietement:"Métal",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"C"},335,"KLMB"),
      mk({pietement:"Métal",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"D"},343,"KLMB"),
      mk({pietement:"Bois",hauteur:"Haute",tapissage:"Coque PP",tissu:"Sans tissu"},509,"KBHO"),
      mk({pietement:"Bois",hauteur:"Basse",tapissage:"Coque PP",tissu:"Sans tissu"},499,"KBMO"),
      mk({pietement:"Bois",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"B"},563,"KBHB"),
      mk({pietement:"Bois",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"B+"},566,"KBHB"),
      mk({pietement:"Bois",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"C"},569,"KBHB"),
      mk({pietement:"Bois",hauteur:"Haute",tapissage:"Tapissée avant",tissu:"D"},577,"KBHB"),
      mk({pietement:"Bois",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"B"},553,"KBMB"),
      mk({pietement:"Bois",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"B+"},556,"KBMB"),
      mk({pietement:"Bois",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"C"},559,"KBMB"),
      mk({pietement:"Bois",hauteur:"Basse",tapissage:"Tapissée avant",tissu:"D"},567,"KBMB"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["Métal","Bois"] },
        { id: "hauteur", nom: "Hauteur", valeurs: ["Haute","Basse"] },
        { id: "tapissage", nom: "Tapissage", valeurs: ["Coque PP","Tapissée avant"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["Sans tissu","B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris coque PP", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (${COLORIS.length} coloris coque)`);
  console.log(`\n✓ Tabouret Klik traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
