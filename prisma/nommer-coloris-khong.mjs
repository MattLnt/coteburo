// Donne à la chaise Khong un vrai choix de coloris, avec pastilles.
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
//   sont : BLEU et GRIS BLANC.
//
// LA FORME
//   Celle de Loops et de toutes les chaises OfficePro : UNE combinaison qui
//   porte la racine (KHG02, 275 €), et un axe de nature « finition » dont
//   chaque valeur ajoute son jeton — BLBL, GRBLA — et porte une couleur, donc
//   une pastille. Un axe tarifaire à deux boutons aurait affiché du texte.
//
//   Le script part de l'état d'origine (axe « reference » + une combinaison
//   par référence) ou de l'état intermédiaire (axe « coloris » tarifaire) et
//   aboutit au même résultat. L'axe « Finitions » à une valeur, qui disait
//   faux (GRIS BLANC sur une chaise bleue), part.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// Par fiche : la racine, puis chaque coloris avec son jeton et sa couleur.
const FICHES = {
  "Chaise - Khong": { racine: "KHG02", coloris: [
    { libelle: "Bleu", jeton: "BLBL", couleur: "#2f4f8f" },
    { libelle: "Gris blanc", jeton: "GRBLA", couleur: "#c9cbcd" },
  ] },
  "Chaise Papillon - Khong": { racine: "KHG03", coloris: [
    { libelle: "Bleu", jeton: "BL", couleur: "#2f4f8f" },
  ] },
};

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  for (const [nom, { racine, coloris }] of Object.entries(FICHES)) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom },
      select: { id: true, choix: { select: { id: true, cle: true, nom: true, nature: true, valeurs: { select: { id: true, libelle: true } } } },
        combinaisons: { select: { id: true, referenceBase: true, prixTarifHT: true, ecoContribution: true, pageCatalogue: true, valeurs: true } } } });
    console.log(`\n${nom}`);
    if (!v) { console.log("   introuvable"); continue; }

    const axe = v.choix.find((c) => c.cle === "coloris") || v.choix.find((c) => c.cle === "reference");
    const bidon = v.choix.filter((c) => c.nature === "finition" && c.cle !== "coloris" && c.valeurs.length === 1);
    const autres = v.choix.filter((c) => c !== axe && !bidon.includes(c));
    if (!axe) { console.log("   pas d'axe à convertir"); continue; }
    if (autres.length) { console.log(`   ✗ d'autres axes existent (${autres.map((c) => c.nom).join(", ")}) — on ne touche à rien`); continue; }
    // Toutes les références de la fiche doivent être racine + un jeton connu.
    const attendues = new Set(coloris.map((c) => racine + c.jeton));
    const inconnues = v.combinaisons.map((k) => k.referenceBase).filter((r) => !attendues.has(r) && r !== racine);
    if (inconnues.length) { console.log(`   ✗ références hors table : ${inconnues.join(", ")}`); continue; }
    const prix = [...new Set(v.combinaisons.map((k) => k.prixTarifHT))];
    if (prix.length !== 1) { console.log(`   ✗ plusieurs prix (${prix.join(", ")}) — un seul attendu`); continue; }

    console.log(`   combinaison unique ${racine} à ${prix[0]} € (au lieu de ${v.combinaisons.length})`);
    console.log(`   axe « Coloris » (finition, rang 0) : ${coloris.map((c) => `${c.libelle} [${c.jeton}] ${c.couleur}`).join(" · ")}`);
    for (const b of bidon) console.log(`   axe « ${b.nom} » à une valeur (${b.valeurs[0].libelle}) → retiré`);
    if (!APPLIQUER) continue;

    const modele = v.combinaisons[0];
    await prisma.$transaction([
      // L'axe : finition, rang 0, une valeur par coloris — les valeurs
      // existantes sont réécrites, les manquantes créées, le surplus retiré.
      prisma.choix.update({ where: { id: axe.id }, data: { cle: "coloris", nom: "Coloris", nature: "finition", rangReference: 0, obligatoire: true } }),
      prisma.valeurChoix.deleteMany({ where: { choixId: axe.id } }),
      prisma.valeurChoix.createMany({ data: coloris.map((c, i) => ({ choixId: axe.id, libelle: c.libelle, suffixeReference: c.jeton, couleur: c.couleur, ordre: i })) }),
      ...bidon.map((b) => prisma.choix.delete({ where: { id: b.id } })),
      // Les combinaisons : une seule, sur la racine, sans clé de coloris.
      prisma.combinaison.deleteMany({ where: { vitrineId: v.id, id: { not: modele.id } } }),
      prisma.combinaison.update({ where: { id: modele.id }, data: { referenceBase: racine, valeurs: {}, empreinte: empreinteDe({}) } }),
    ]);
    console.log("   écrit");
  }
  if (!APPLIQUER) console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
