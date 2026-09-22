// Retire l'axe « Modèle » quand un autre axe dit déjà la même chose.
//
//   node prisma/fondre-axes-doubles.mjs
//   node prisma/fondre-axes-doubles.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Onze fiches posent DEUX questions pour un seul choix :
//
//     Modèle   Goulotte métal double — plan L120 | L140 | L160 | L180
//     Largeur  75 cm                  | 95 cm    | 115 cm | 135 cm
//
//   Ce n'est pas un hasard : « Modèle » dit la largeur du PLAN auquel
//   l'accessoire se fixe, « Largeur » dit la largeur de l'ACCESSOIRE. Une
//   goulotte de 115 cm est celle d'un plan de 160. Le client répond donc deux
//   fois à la même question, et la première lui montre quatre boutons dont
//   seul le dernier mot change.
//
//   On garde celui qui parle — « Largeur », dont les valeurs sont déjà des
//   mots — et on retire « Modèle ».
//
// CE QU'ON NE DEVINE PAS
//   Le script REFUSE dès que la correspondance n'est pas une bijection. Si
//   deux modèles partagent une largeur, ou si un modèle en couvre deux, alors
//   les deux axes ne disent pas la même chose et retirer l'un perdrait de
//   l'information. Rien n'est supprimé sur une intuition : la preuve se fait
//   sur les combinaisons de la fiche, une par une.
//
// CE QUE LA SUPPRESSION EMPORTE
//   Le choix « Modèle », ses valeurs, et la clé correspondante dans chaque
//   combinaison. Les prix, les références et les autres axes ne bougent pas.
//   Ce que le client perd — savoir pour quel plan l'accessoire est prévu — a
//   sa place dans le descriptif de la fiche, pas dans une seconde question.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

// La fiche, et l'axe qui dit déjà ce que « Modèle » répète.
const FICHES = [
  ["Goulotte métal double - Alto", "largeur"],
  ["Goulotte métal simple - Alto", "largeur"],
  ["Goulotte métal double - Électrification", "largeur"],
  ["Goulotte métal universelle - Électrification", "largeur"],
  ["Séparateur frontal - Alto", "largeur"],
  ["Voile de fond suspendu - Alto", "largeur"],
  ["Voile de fond suspendu mélaminé - Courtoisie", "largeur"],
  ["Voile de fond suspendu - Envol Manager", "largeur"],
  ["Bac de rangement supérieur - Alto", "largeur"],
  ["Bac de rangement - Alto", "largeur"],
  ["Combinaison rangements et colonne - Quiétude", "largeur"],
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const plans = [];
  const refuses = [];

  for (const [nom, cleGardee] of FICHES) {
    const v = await prisma.produitVitrine.findFirst({
      where: { nom },
      select: { id: true, nom: true,
        choix: { select: { id: true, cle: true, nom: true,
          valeurs: { orderBy: { ordre: "asc" }, select: { libelle: true } } } },
        combinaisons: { select: { id: true, valeurs: true, prixTarifHT: true } } },
    });
    if (!v) { refuses.push(`${nom} — introuvable`); continue; }

    const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
    const gardee = v.choix.find((c) => c.cle === cleGardee);
    if (!modele) { refuses.push(`${nom} — pas de question « Modèle »`); continue; }
    if (!gardee) { refuses.push(`${nom} — pas d'axe « ${cleGardee} »`); continue; }

    // La preuve : sur les combinaisons, chaque modèle doit désigner UNE
    // largeur et chaque largeur UN modèle.
    const versLargeur = new Map();
    const versModele = new Map();
    let boiteux = null;
    for (const k of v.combinaisons) {
      const m = k.valeurs?.[modele.cle];
      const l = k.valeurs?.[cleGardee];
      if (m == null || l == null) { boiteux = `une combinaison ne porte pas les deux clés : ${JSON.stringify(k.valeurs)}`; break; }
      if (versLargeur.has(m) && versLargeur.get(m) !== l) { boiteux = `« ${m} » mène à « ${versLargeur.get(m)} » ET « ${l} »`; break; }
      if (versModele.has(l) && versModele.get(l) !== m) { boiteux = `« ${l} » vient de « ${versModele.get(l)} » ET « ${m} »`; break; }
      versLargeur.set(m, l);
      versModele.set(l, m);
    }
    if (boiteux) { refuses.push(`${nom} — ${boiteux}`); continue; }

    // Toutes les valeurs de « Modèle » doivent être employées : une valeur
    // orpheline signifierait qu'on perd une variante en la retirant.
    const inutilisees = modele.valeurs.map((w) => w.libelle).filter((m) => !versLargeur.has(m));
    if (inutilisees.length) { refuses.push(`${nom} — « ${inutilisees.join(" », « ")} » n'apparaît dans aucune combinaison`); continue; }

    const combos = v.combinaisons.map((k) => {
      const { [modele.cle]: _retire, ...reste } = k.valeurs;
      return { id: k.id, valeurs: reste, empreinte: empreinteDe(reste) };
    });
    if (new Set(combos.map((c) => c.empreinte)).size !== combos.length) {
      refuses.push(`${nom} — deux combinaisons se confondraient sans « Modèle »`); continue;
    }

    plans.push({ v, modele, gardee, paires: [...versLargeur], combos });
  }

  titre(`${plans.length} FICHES — « Modèle » DOUBLE UN AXE EXISTANT`);
  for (const p of plans) {
    console.log(`\n   ${p.v.nom}`);
    console.log(`      on retire « ${p.modele.nom} », on garde « ${p.gardee.nom} »`);
    for (const [m, l] of p.paires) console.log(`         ${l.padEnd(12)} ←  ${m}`);
  }

  if (refuses.length) {
    titre(`${refuses.length} FICHES REFUSÉES — rien n'y sera touché`);
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} axes retirés · ${plans.reduce((n, p) => n + p.combos.length, 0)} combinaisons allégées`);

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  for (const p of plans) {
    for (const c of p.combos) {
      await prisma.combinaison.update({ where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte } });
    }
    await prisma.choix.delete({ where: { id: p.modele.id } });
  }
  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
