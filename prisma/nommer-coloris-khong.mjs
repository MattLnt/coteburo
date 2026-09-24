// Donne un nom au choix de la chaise Khong.
//
//   node prisma/nommer-coloris-khong.mjs
//   node prisma/nommer-coloris-khong.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   « Chaise - Khong » posait une question « Référence » dont les réponses
//   étaient KHG02BLBL et KHG02GRBLA : rien qu'un client puisse lire. Le tarif
//   OfficePro (page 4 du PDF, colonne « coloris dominant ») dit ce qu'elles
//   sont : BLEU et GRIS BLANC. La question devient « Coloris ».
//
//   Les deux fiches portaient aussi un axe « Finitions » à une seule valeur —
//   « GRIS BLANC » sur la chaise, alors que sa première référence est bleue.
//   Un axe à une valeur n'est jamais posé, et celui-là dit faux : il part.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// référence → libellé lisible, tel que le tarif l'imprime
const COLORIS = {
  "Chaise - Khong": { KHG02BLBL: "Bleu", KHG02GRBLA: "Gris blanc" },
  "Chaise Papillon - Khong": { KHG03BL: "Bleu" },
};

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  for (const [nom, table] of Object.entries(COLORIS)) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom },
      select: { id: true, choix: { select: { id: true, cle: true, nom: true, nature: true, valeurs: { select: { id: true, libelle: true } } } },
        combinaisons: { select: { id: true, valeurs: true, referenceBase: true } } } });
    if (!v) { console.log(`\n${nom} : introuvable`); continue; }
    const axe = v.choix.find((c) => c.cle === "reference");
    const finitions = v.choix.find((c) => c.nature === "finition" && c.valeurs.length === 1);
    console.log(`\n${nom}`);
    if (!axe) { console.log("   pas d'axe « reference » — rien à faire"); continue; }
    if (v.choix.some((c) => c.cle === "coloris")) { console.log("   la clé « coloris » existe déjà — on ne touche à rien"); continue; }
    const manquantes = axe.valeurs.filter((x) => !table[x.libelle]);
    if (manquantes.length) { console.log(`   ✗ valeurs sans traduction : ${manquantes.map((x) => x.libelle).join(", ")}`); continue; }
    for (const x of axe.valeurs) console.log(`   ${x.libelle.padEnd(12)} → ${table[x.libelle]}`);
    if (finitions) console.log(`   axe « ${finitions.nom} » à une valeur (${finitions.valeurs[0].libelle}) → retiré`);
    if (!APPLIQUER) continue;

    await prisma.choix.update({ where: { id: axe.id }, data: { cle: "coloris", nom: "Coloris" } });
    for (const x of axe.valeurs) await prisma.valeurChoix.update({ where: { id: x.id }, data: { libelle: table[x.libelle] } });
    for (const k of v.combinaisons) {
      const { reference, ...reste } = k.valeurs || {};
      const valeurs = { ...reste, coloris: table[reference ?? k.referenceBase] };
      await prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } });
    }
    if (finitions) await prisma.choix.delete({ where: { id: finitions.id } });
    console.log("   écrit");
  }
  if (!APPLIQUER) console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
