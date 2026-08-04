import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Rhune";
const NOM_PRODUIT = "Canapé";

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
      mk({modele:"2 places",tissu:"B"},2263,"RUY1/10"),
      mk({modele:"2 places",tissu:"B+"},2298,"RUY1/10"),
      mk({modele:"2 places",tissu:"C"},2333,"RUY1/10"),
      mk({modele:"2 places",tissu:"D"},2403,"RUY1/10"),
      mk({modele:"2 places — tablette à droite",tissu:"B"},2426,"RUYB/1B"),
      mk({modele:"2 places — tablette à droite",tissu:"B+"},2461,"RUYB/1B"),
      mk({modele:"2 places — tablette à droite",tissu:"C"},2496,"RUYB/1B"),
      mk({modele:"2 places — tablette à droite",tissu:"D"},2566,"RUYB/1B"),
      mk({modele:"3 places",tissu:"B"},3089,"RUZ1/10"),
      mk({modele:"3 places",tissu:"B+"},3136,"RUZ1/10"),
      mk({modele:"3 places",tissu:"C"},3184,"RUZ1/10"),
      mk({modele:"3 places",tissu:"D"},3279,"RUZ1/10"),
      mk({modele:"3 places — tablette à droite",tissu:"B"},3253,"RUZB/1B"),
      mk({modele:"3 places — tablette à droite",tissu:"B+"},3300,"RUZB/1B"),
      mk({modele:"3 places — tablette à droite",tissu:"C"},3348,"RUZB/1B"),
      mk({modele:"3 places — tablette à droite",tissu:"D"},3443,"RUZB/1B"),
      mk({modele:"3 places — tablette droite + prise 250V/USB",tissu:"B"},3503,"RUZB/11"),
      mk({modele:"3 places — tablette droite + prise 250V/USB",tissu:"B+"},3550,"RUZB/11"),
      mk({modele:"3 places — tablette droite + prise 250V/USB",tissu:"C"},3598,"RUZB/11"),
      mk({modele:"3 places — tablette droite + prise 250V/USB",tissu:"D"},3693,"RUZB/11"),
      mk({modele:"3 places — tablette gauche + prise 250V/USB",tissu:"B"},3503,"RUZC/11"),
      mk({modele:"3 places — tablette gauche + prise 250V/USB",tissu:"B+"},3550,"RUZC/11"),
      mk({modele:"3 places — tablette gauche + prise 250V/USB",tissu:"C"},3598,"RUZC/11"),
      mk({modele:"3 places — tablette gauche + prise 250V/USB",tissu:"D"},3693,"RUZC/11"),
      mk({modele:"3 places — pouf au centre",tissu:"B"},2926,"RUZM/10"),
      mk({modele:"3 places — pouf au centre",tissu:"B+"},2968,"RUZM/10"),
      mk({modele:"3 places — pouf au centre",tissu:"C"},3011,"RUZM/10"),
      mk({modele:"3 places — pouf au centre",tissu:"D"},3096,"RUZM/10"),
      mk({modele:"Tête-à-tête 3 places",tissu:"B"},2926,"RUZT/10"),
      mk({modele:"Tête-à-tête 3 places",tissu:"B+"},2968,"RUZT/10"),
      mk({modele:"Tête-à-tête 3 places",tissu:"C"},3011,"RUZT/10"),
      mk({modele:"Tête-à-tête 3 places",tissu:"D"},3096,"RUZT/10"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "modele", nom: "Modèle", valeurs: ["2 places","2 places — tablette à droite","3 places","3 places — tablette à droite","3 places — tablette droite + prise 250V/USB","3 places — tablette gauche + prise 250V/USB","3 places — pouf au centre","Tête-à-tête 3 places"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons`);
  console.log(`\n✓ Canapé Rhune traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
