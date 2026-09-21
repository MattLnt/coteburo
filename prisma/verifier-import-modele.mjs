// Le plan de l'import, confronté aux fiches déjà migrées.
//
//   node prisma/verifier-import-modele.mjs
//
// N'ÉCRIT RIEN.
//
// CE QU'IL DEMANDE
//   L'import écrit désormais le modèle à choix par lib/ecrireModeleAChoix.
//   Les cinq cent cinquante-cinq fiches du catalogue portent, côte à côte,
//   l'ancien JSON dont l'import serait parti et le nouveau modèle que la
//   migration a produit. On rejoue donc le plan sur l'ancien et on compare
//   au nouveau : si l'import est juste, il retrouve les mêmes questions, les
//   mêmes valeurs et les mêmes variantes.
//
//   Une différence n'est pas forcément une faute — la migration savait des
//   choses que l'import ignore, notamment le découpage des références en
//   suffixes et le rattachement aux nuanciers. On compte donc séparément ce
//   qui doit coïncider au caractère près (les combinaisons, qui portent les
//   prix) et ce qui peut légitimement différer.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { planModeleAChoix } from "../lib/planModeleAChoix.js";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true,
      axesDeclinaisons: true, declinaisons: true,
      groupesFinition: {
        orderBy: { ordre: "asc" },
        select: { nom: true, ordre: true, finitions: { orderBy: { ordre: "asc" }, select: { nom: true, couleur: true, imageUrl: true } } },
      },
      choix: {
        orderBy: { ordre: "asc" },
        select: { cle: true, nom: true, nature: true, rangReference: true, valeurs: { select: { libelle: true } } },
      },
      combinaisons: { select: { empreinte: true, prixTarifHT: true, referenceBase: true } },
    },
  });

  let exactes = 0;
  const ecarts = [];
  let totalPrevues = 0;
  let totalPortees = 0;
  let prixJustes = 0;
  let refsJustes = 0;
  let refsParSuffixes = 0;

  for (const v of vitrines) {
    const plan = planModeleAChoix({
      axesDeclinaisons: v.axesDeclinaisons,
      declinaisons: v.declinaisons,
      groupesFinition: v.groupesFinition,
    });

    const portees = new Map(v.combinaisons.map((k) => [k.empreinte, k]));
    totalPrevues += plan.combinaisons.length;
    totalPortees += portees.size;

    // Sur ces fiches, la migration a découpé la référence en une base et des
    // suffixes portés par les choix. L'import ne sait pas faire ce découpage —
    // il faudrait interpréter le codage du fournisseur — et range donc la
    // référence entière dans la base. La fiche reste commandable : la
    // référence assemblée est la même, il n'y a simplement rien à y ajouter.
    const assembleeParSuffixes = v.choix.some((c) => c.rangReference != null);

    const manquantes = plan.combinaisons.filter((k) => !portees.has(k.empreinte));
    for (const k of plan.combinaisons) {
      const reelle = portees.get(k.empreinte);
      if (!reelle) continue;
      if ((k.prixTarifHT ?? null) === (reelle.prixTarifHT ?? null)) prixJustes += 1;
      if ((k.referenceBase ?? null) === (reelle.referenceBase ?? null)) refsJustes += 1;
      else if (assembleeParSuffixes) refsParSuffixes += 1;
    }

    const tarifairesPlan = plan.choix.filter((c) => c.nature === "tarifaire").length;
    const tarifairesReels = v.choix.filter((c) => c.nature === "tarifaire").length;

    if (!manquantes.length && plan.combinaisons.length === portees.size
      && tarifairesPlan === tarifairesReels) {
      exactes += 1;
    } else {
      ecarts.push({
        nom: v.nom,
        prevues: plan.combinaisons.length,
        portees: portees.size,
        manquantes: manquantes.length,
        tarifairesPlan, tarifairesReels,
        questionsPlan: plan.choix.filter((c) => c.nature === "tarifaire").map((c) => c.nom),
        questionsReelles: v.choix.filter((c) => c.nature === "tarifaire").map((c) => c.nom),
      });
    }
  }

  titre("LE PLAN DE L'IMPORT, CONFRONTÉ AU CATALOGUE MIGRÉ");
  const pc = (n, d) => (d ? (Math.floor((n / d) * 1000) / 10).toFixed(1) : "0,0").replace(".", ",");
  console.log(`
   fiches examinées ................. ${vitrines.length}
   fiches retrouvées à l'identique .. ${exactes}  (${pc(exactes, vitrines.length)} %)

   variantes prévues par le plan .... ${totalPrevues}
   variantes portées par la base .... ${totalPortees}
   prix identiques .................. ${prixJustes}  (${pc(prixJustes, totalPrevues)} %)
   références identiques ............ ${refsJustes}  (${pc(refsJustes, totalPrevues)} %)
   références découpées par la
     migration en base + suffixes ... ${refsParSuffixes}  (l'import les garde entières)
   références inexpliquées .......... ${totalPrevues - refsJustes - refsParSuffixes}`);

  if (ecarts.length) {
    titre(`ÉCARTS — ${ecarts.length} fiche(s)`);
    console.log("");
    for (const e of ecarts.slice(0, 15)) {
      console.log(`   ${e.nom}`);
      console.log(`      variantes : plan ${e.prevues} · base ${e.portees} · absentes de la base ${e.manquantes}`);
      if (e.tarifairesPlan !== e.tarifairesReels) {
        console.log(`      questions : plan [${e.questionsPlan.join(", ")}]`);
        console.log(`                  base [${e.questionsReelles.join(", ")}]`);
      }
    }
    if (ecarts.length > 15) console.log(`   … et ${ecarts.length - 15} autres`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
