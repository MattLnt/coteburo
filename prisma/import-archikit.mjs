import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Archikit";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  {
    const v = trouver("Rayonnage niveaux ajourés");
    if (!v) manquants.push("Rayonnage niveaux ajourés");
    else {
      await prisma.produitVitrine.update({ where: { id: v.id }, data: {
        axesDeclinaisons: [
          { id: "element", nom: "Élément", valeurs: ["Départ","Suite"] },
          { id: "hauteur", nom: "Hauteur", valeurs: ["2000 mm","2500 mm","3000 mm"] },
          { id: "longueur", nom: "Longueur", valeurs: ["1000 mm","700 mm"] },
          { id: "profondeur", nom: "Profondeur", valeurs: ["300 mm","400 mm","500 mm","600 mm","700 mm"] },
        ],
        declinaisons: [
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"300 mm"},185,"ZAK 103 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"400 mm"},198,"ZAK 104 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"500 mm"},235,"ZAK 105 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"600 mm"},249,"ZAK 106 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"700 mm"},347,"ZAK 107 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"300 mm"},162,"ZAK 073 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"400 mm"},175,"ZAK 074 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"500 mm"},200,"ZAK 075 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"600 mm"},214,"ZAK 076 DAG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"700 mm"},292,"ZAK 077 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"300 mm"},200,"ZAK 25 103 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"400 mm"},214,"ZAK 25 104 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"500 mm"},250,"ZAK 25 105 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"600 mm"},264,"ZAK 25 106 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"700 mm"},362,"ZAK 25 107 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"300 mm"},177,"ZAK 25 073 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"400 mm"},190,"ZAK 25 074 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"500 mm"},215,"ZAK 25 075 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"600 mm"},229,"ZAK 25 076 DAG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"700 mm"},307,"ZAK 25 077 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"300 mm"},215,"ZAK 30 103 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"400 mm"},229,"ZAK 30 104 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"500 mm"},265,"ZAK 30 105 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"600 mm"},279,"ZAK 30 106 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"700 mm"},377,"ZAK 30 107 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"300 mm"},192,"ZAK 30 073 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"400 mm"},205,"ZAK 30 074 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"500 mm"},230,"ZAK 30 075 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"600 mm"},244,"ZAK 30 076 DAG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"700 mm"},322,"ZAK 30 077 DAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"300 mm"},133,"ZAK 103 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"400 mm"},147,"ZAK 104 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"500 mm"},183,"ZAK 105 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"600 mm"},197,"ZAK 106 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"700 mm"},274,"ZAK 107 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"300 mm"},110,"ZAK 073 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"400 mm"},123,"ZAK 074 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"500 mm"},148,"ZAK 075 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"600 mm"},162,"ZAK 076 SAG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"700 mm"},223,"ZAK 077 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"300 mm"},141,"ZAK 25 103 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"400 mm"},154,"ZAK 25 104 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"500 mm"},191,"ZAK 25 105 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"600 mm"},205,"ZAK 25 106 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"700 mm"},281,"ZAK 25 107 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"300 mm"},118,"ZAK 25 073 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"400 mm"},131,"ZAK 25 074 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"500 mm"},156,"ZAK 25 075 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"600 mm"},170,"ZAK 25 076 SAG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"700 mm"},232,"ZAK 25 077 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"300 mm"},149,"ZAK 30 103 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"400 mm"},162,"ZAK 30 104 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"500 mm"},198,"ZAK 30 105 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"600 mm"},212,"ZAK 30 106 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"700 mm"},290,"ZAK 30 107 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"300 mm"},125,"ZAK 30 073 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"400 mm"},138,"ZAK 30 074 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"500 mm"},164,"ZAK 30 075 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"600 mm"},177,"ZAK 30 076 SAG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"700 mm"},240,"ZAK 30 077 SAG"),
        ],
      } });
      await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
      console.log(`  ✓ ${gamme.nom} / Rayonnage niveaux ajourés — ${ (await prisma.produitVitrine.findUnique({where:{id:v.id},select:{declinaisons:true}})).declinaisons.length } combinaisons`);
    }
  }
  {
    const v = trouver("Rayonnage niveaux pleins");
    if (!v) manquants.push("Rayonnage niveaux pleins");
    else {
      await prisma.produitVitrine.update({ where: { id: v.id }, data: {
        axesDeclinaisons: [
          { id: "element", nom: "Élément", valeurs: ["Départ","Suite"] },
          { id: "hauteur", nom: "Hauteur", valeurs: ["2000 mm","2500 mm","3000 mm"] },
          { id: "longueur", nom: "Longueur", valeurs: ["1000 mm","700 mm"] },
          { id: "profondeur", nom: "Profondeur", valeurs: ["300 mm","400 mm","500 mm","600 mm","700 mm"] },
        ],
        declinaisons: [
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"300 mm"},169,"ZAK 103 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"400 mm"},207,"ZAK 104 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"500 mm"},227,"ZAK 105 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"600 mm"},247,"ZAK 106 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"700 mm"},348,"ZAK 107 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"300 mm"},153,"ZAK 073 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"400 mm"},183,"ZAK 074 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"500 mm"},199,"ZAK 075 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"600 mm"},214,"ZAK 076 DPG"),
      mk({element:"Départ",hauteur:"2000 mm",longueur:"700 mm",profondeur:"700 mm"},299,"ZAK 077 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"300 mm"},184,"ZAK 25 103 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"400 mm"},222,"ZAK 25 104 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"500 mm"},243,"ZAK 25 105 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"600 mm"},263,"ZAK 25 106 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"700 mm"},363,"ZAK 25 107 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"300 mm"},168,"ZAK 25 073 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"400 mm"},198,"ZAK 25 074 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"500 mm"},214,"ZAK 25 075 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"600 mm"},230,"ZAK 25 076 DPG"),
      mk({element:"Départ",hauteur:"2500 mm",longueur:"700 mm",profondeur:"700 mm"},314,"ZAK 25 077 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"300 mm"},199,"ZAK 30 103 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"400 mm"},237,"ZAK 30 104 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"500 mm"},258,"ZAK 30 105 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"600 mm"},278,"ZAK 30 106 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"700 mm"},378,"ZAK 30 107 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"300 mm"},183,"ZAK 30 073 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"400 mm"},213,"ZAK 30 074 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"500 mm"},229,"ZAK 30 075 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"600 mm"},245,"ZAK 30 076 DPG"),
      mk({element:"Départ",hauteur:"3000 mm",longueur:"700 mm",profondeur:"700 mm"},329,"ZAK 30 077 DPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"300 mm"},117,"ZAK 103 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"400 mm"},155,"ZAK 104 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"500 mm"},176,"ZAK 105 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"600 mm"},196,"ZAK 106 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"1000 mm",profondeur:"700 mm"},276,"ZAK 107 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"300 mm"},101,"ZAK 073 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"400 mm"},131,"ZAK 074 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"500 mm"},147,"ZAK 075 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"600 mm"},163,"ZAK 076 SPG"),
      mk({element:"Suite",hauteur:"2000 mm",longueur:"700 mm",profondeur:"700 mm"},232,"ZAK 077 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"300 mm"},125,"ZAK 25 103 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"400 mm"},163,"ZAK 25 104 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"500 mm"},183,"ZAK 25 105 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"600 mm"},203,"ZAK 25 106 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"1000 mm",profondeur:"700 mm"},284,"ZAK 25 107 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"300 mm"},109,"ZAK 25 073 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"400 mm"},139,"ZAK 25 074 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"500 mm"},155,"ZAK 25 075 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"600 mm"},170,"ZAK 25 076 SPG"),
      mk({element:"Suite",hauteur:"2500 mm",longueur:"700 mm",profondeur:"700 mm"},239,"ZAK 25 077 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"300 mm"},133,"ZAK 30 103 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"400 mm"},170,"ZAK 30 104 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"500 mm"},191,"ZAK 30 105 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"600 mm"},211,"ZAK 30 106 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"1000 mm",profondeur:"700 mm"},291,"ZAK 30 107 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"300 mm"},116,"ZAK 30 073 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"400 mm"},146,"ZAK 30 074 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"500 mm"},162,"ZAK 30 075 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"600 mm"},178,"ZAK 30 076 SPG"),
      mk({element:"Suite",hauteur:"3000 mm",longueur:"700 mm",profondeur:"700 mm"},247,"ZAK 30 077 SPG"),
        ],
      } });
      await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
      console.log(`  ✓ ${gamme.nom} / Rayonnage niveaux pleins — ${ (await prisma.produitVitrine.findUnique({where:{id:v.id},select:{declinaisons:true}})).declinaisons.length } combinaisons`);
    }
  }
  {
    const v = trouver("Niveau supplémentaire");
    if (!v) manquants.push("Niveau supplémentaire");
    else {
      await prisma.produitVitrine.update({ where: { id: v.id }, data: {
        axesDeclinaisons: [
          { id: "niveau", nom: "Type de niveau", valeurs: ["Ajouré","Plein"] },
          { id: "longueur", nom: "Longueur", valeurs: ["1000 mm","700 mm"] },
          { id: "profondeur", nom: "Profondeur", valeurs: ["300 mm","400 mm","500 mm","600 mm","700 mm"] },
        ],
        declinaisons: [
      mk({niveau:"Ajouré",longueur:"1000 mm",profondeur:"300 mm"},21,"ZAK 1N 103 AG"),
      mk({niveau:"Ajouré",longueur:"1000 mm",profondeur:"400 mm"},23,"ZAK 1N 104 AG"),
      mk({niveau:"Ajouré",longueur:"1000 mm",profondeur:"500 mm"},30,"ZAK 1N 105 AG"),
      mk({niveau:"Ajouré",longueur:"1000 mm",profondeur:"600 mm"},33,"ZAK 1N 106 AG"),
      mk({niveau:"Ajouré",longueur:"1000 mm",profondeur:"700 mm"},40,"ZAK 1N 107 AG"),
      mk({niveau:"Ajouré",longueur:"700 mm",profondeur:"300 mm"},16,"ZAK 1N 073 AG"),
      mk({niveau:"Ajouré",longueur:"700 mm",profondeur:"400 mm"},18,"ZAK 1N 074 AG"),
      mk({niveau:"Ajouré",longueur:"700 mm",profondeur:"500 mm"},24,"ZAK 1N 075 AG"),
      mk({niveau:"Ajouré",longueur:"700 mm",profondeur:"600 mm"},26,"ZAK 1N 076 AG"),
      mk({niveau:"Ajouré",longueur:"700 mm",profondeur:"700 mm"},31,"ZAK 1N 077 AG"),
      mk({niveau:"Plein",longueur:"1000 mm",profondeur:"300 mm"},17,"ZAK 1N 103 PG"),
      mk({niveau:"Plein",longueur:"1000 mm",profondeur:"400 mm"},25,"ZAK 1N 104 PG"),
      mk({niveau:"Plein",longueur:"1000 mm",profondeur:"500 mm"},29,"ZAK 1N 105 PG"),
      mk({niveau:"Plein",longueur:"1000 mm",profondeur:"600 mm"},33,"ZAK 1N 106 PG"),
      mk({niveau:"Plein",longueur:"1000 mm",profondeur:"700 mm"},41,"ZAK 1N 107 PG"),
      mk({niveau:"Plein",longueur:"700 mm",profondeur:"300 mm"},14,"ZAK 1N 073 PG"),
      mk({niveau:"Plein",longueur:"700 mm",profondeur:"400 mm"},20,"ZAK 1N 074 PG"),
      mk({niveau:"Plein",longueur:"700 mm",profondeur:"500 mm"},23,"ZAK 1N 075 PG"),
      mk({niveau:"Plein",longueur:"700 mm",profondeur:"600 mm"},26,"ZAK 1N 076 PG"),
      mk({niveau:"Plein",longueur:"700 mm",profondeur:"700 mm"},33,"ZAK 1N 077 PG"),
        ],
      } });
      await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
      console.log(`  ✓ ${gamme.nom} / Niveau supplémentaire — ${ (await prisma.produitVitrine.findUnique({where:{id:v.id},select:{declinaisons:true}})).declinaisons.length } combinaisons`);
    }
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ Archikit traitée (Rayonnage ajouré + Rayonnage plein + Niveau supplémentaire).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
