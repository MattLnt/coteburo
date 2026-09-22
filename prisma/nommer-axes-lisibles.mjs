// Nomme les axes cachés dans « Modèle » quand le libellé les dit déjà.
//
//   node prisma/nommer-axes-lisibles.mjs
//   node prisma/nommer-axes-lisibles.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// DEUX FAMILLES, DEUX SCRIPTS
//   Soixante-dix-neuf fiches posent encore une question « Modèle » dont les
//   réponses recopient le titre. Elles se séparent en deux :
//
//     A. l'axe est écrit en clair dans le libellé
//          « Goulotte métal double — plan L120 / L140 / L160 / L180 »
//        C'est une largeur. Le tarif n'a rien à nous apprendre : il suffit de
//        nommer la question et de couper ce qui se répète. C'est CE script.
//
//     B. l'axe est un code de référence
//          « Lounge dos haut avec têtière (DOB0/3) … (DOB0/7) »
//        Là il faut la page de tarif pour savoir ce que 3 et 7 désignent.
//        C'est prisma/nommer-axes-caches.mjs, une gamme à la fois.
//
// COMMENT CE SCRIPT COUPE
//   Il prend le plus long préfixe et le plus long suffixe COMMUNS à toutes les
//   réponses, puis recule jusqu'à une frontière de mot — sans quoi « plan L120 »
//   et « plan L140 » donneraient « 20 » et « 40 » au lieu de « L120 » et
//   « L140 ». Ce qui reste au milieu est la réponse.
//
//   Il refuse dès que deux réponses se ramènent au même mot, ou qu'une réponse
//   devient vide sans que la table ne l'ait prévu. Mieux vaut laisser une
//   fiche en l'état que lui donner deux boutons identiques — c'est le défaut
//   qu'on répare.
//
// CE QUE LA TABLE APPORTE
//   Le nom de la question, et lui seul. Aucune machine ne devine que
//   « L120 / L140 » est une largeur de plan et que « à fixer / à poser » est un
//   mode de pose. Une fiche absente de la table est laissée telle quelle et
//   signalée : le script ne baptise jamais une question au hasard.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

// `unite` : ce qu'on ajoute à une réponse purement numérique, « L120 » → « 120 cm ».
// `libelles` : une réponse réécrite à la main, quand la coupe automatique
//              produirait quelque chose d'illisible.
const TABLE = [
  // ── Largeurs de plan ────────────────────────────────────────────────
  { fiche: "Goulotte métal double - Alto", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Goulotte métal simple - Alto", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Goulotte métal double - Électrification", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Goulotte métal universelle - Électrification", cle: "largeur", nom: "Largeur du plateau",
    libelles: { "L120 & L140": "120 ou 140 cm", "L160": "160 cm", "L180": "180 cm" } },
  { fiche: "Séparateur frontal - Alto", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Voile de fond suspendu - Alto", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Voile de fond suspendu mélaminé - Courtoisie", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Voile de fond suspendu - Envol Manager", cle: "largeur", nom: "Largeur du plan", unite: "cm" },
  { fiche: "Voile de fond suspendu - Eureka", cle: "largeur", nom: "Largeur de la table", unite: "cm" },
  { fiche: "Séparateur voile de fond tissu - Bewall", cle: "largeur", nom: "Largeur", unite: "cm" },
  { fiche: "Bac de rangement supérieur - Alto", cle: "largeur", nom: "Largeur de la station", unite: "cm" },
  { fiche: "Bac de rangement - Alto", cle: "largeur", nom: "Largeur", unite: "cm" },
  { fiche: "Châssis télescopique pour dossiers suspendus - Quiétude", cle: "largeur", nom: "Largeur du rangement", unite: "cm" },
  { fiche: "Cloison mobile inclinée - Bewall", cle: "largeur", nom: "Largeur",
    libelles: { "-136": "136 cm", "-160": "160 cm" } },

  // ── Aménagement intérieur ───────────────────────────────────────────
  { fiche: "Rangement à portes battantes avec top - Quiétude", cle: "tablettes", nom: "Tablettes" },
  { fiche: "Rangement à portes battantes sans top - Quiétude", cle: "tablettes", nom: "Tablettes" },
  { fiche: "Rangement à porte battante - Alto", cle: "niches", nom: "Niches" },
  { fiche: "Meuble de service mobile - Astro Direction", cle: "amenagement", nom: "Aménagement" },
  { fiche: "Caisson latéral hauteur bureau - Comfort", cle: "amenagement", nom: "Aménagement" },
  { fiche: "Caisson hauteur bureau - Comfort", cle: "amenagement", nom: "Aménagement" },
  { fiche: "Caisson de retour hauteur bureau - Comfort", cle: "amenagement", nom: "Aménagement" },

  // ── Piétements et structures ────────────────────────────────────────
  { fiche: "Chauffeuse tissu non feu - Arco", cle: "pietement", nom: "Piétement" },
  { fiche: "Chauffeuse Chic polyuréthane - Arco", cle: "pietement", nom: "Piétement" },
  { fiche: "Fauteuil - Loops", cle: "pietement", nom: "Piétement" },
  { fiche: "Pouf - Arco", cle: "structure", nom: "Coloris de la structure" },
  { fiche: "Appui-tête coulissant - Lando", cle: "structure", nom: "Coloris de la structure" },
  { fiche: "Fauteuil - Lando", cle: "structure", nom: "Coloris de la structure" },
  { fiche: "Fauteuil Concept - Tecsy", cle: "structure", nom: "Structure et maille" },
  { fiche: "Fauteuil synchrone - Scott", cle: "structure", nom: "Structure et appui-tête" },
  { fiche: "Chaise Tecseat Meeting - Tecseat", cle: "coque", nom: "Coloris de la coque" },
  { fiche: "Chaise Tecseat Learning - Tecseat", cle: "coque", nom: "Coloris de la coque" },
  { fiche: "Table basse - Giro", cle: "plateau", nom: "Plateau" },
  { fiche: "Coussin d'assise - Comfort", cle: "caisson", nom: "Caisson" },

  // ── Pose, orientation, poste ────────────────────────────────────────
  { fiche: "Séparateur latéral tissu - Bewall", cle: "pose", nom: "Pose" },
  { fiche: "Kit de pinces pour écran Bewall - Bewall", cle: "poste", nom: "Type de poste" },
  { fiche: "Bureau de direction avec meuble retour - Stricto Direction", cle: "retour", nom: "Côté du retour" },
  { fiche: "Station de travail mobile - Alto", cle: "electrification", nom: "Électrification",
    libelles: { "mobile": "Sans électrification", "mobile + elec": "Avec électrification" } },
  { fiche: "Clé passe et réinitialisation de serrure - Eko", cle: "serrure", nom: "Type de serrure",
    libelles: { "code public": "Serrure à code, mode public", "clé": "Serrure à clé",
      "code prive": "Serrure à code, mode privé" } },
  { fiche: "Accroche-câbles universel - Électrification", cle: "anneaux", nom: "Nombre d'anneaux",
    libelles: { "6 anneaux": "6 anneaux", "4 anneaux": "4 anneaux" } },
  { fiche: "Armoire à porte coulissante - Quiétude", cle: "tablettes", nom: "Tablettes" },

  // ── Fifty-Full : les comptoirs d'accueil ────────────────────────────
  // Ces libellés portent DEUX axes à la fois — la largeur et le côté, ou la
  // largeur et la hauteur du retour. On les rend lisibles sans les scinder :
  // une question claire vaut mieux que cinq blocs identiques, et le découpage
  // en deux axes demanderait de relire les pages 322 à 326.
  { fiche: "Comptoir d'accueil avec accueil PMR central - Fifty Full", cle: "parement", nom: "Largeur du parement", unite: "cm" },
  { fiche: "Comptoir d'accueil avec accueil bas central - Fifty Full", cle: "parement", nom: "Largeur du parement", unite: "cm" },
  { fiche: "Comptoir d'accueil avec accueil PMR latéral - Fifty Full", cle: "modele", nom: "Largeur et côté PMR" },
  { fiche: "Comptoir d'accueil en U avec accueil bas - Fifty Full", cle: "modele", nom: "Dimensions" },
  { fiche: "Comptoir d'accueil en U avec accueil haut - Fifty Full", cle: "modele", nom: "Dimensions" },
  // Cette fiche porte DÉJÀ un axe « largeur » : réutiliser la clé fondrait
  // deux combinaisons en une. Le garde-fou l'avait refusée ; la clé change.
  { fiche: "Comptoir d'accueil droit - Fifty Full", cle: "parement", nom: "Largeur du parement", unite: "cm" },
  { fiche: "Comptoir d'accueil avec angle 90° et accueil bas - Fifty Full", cle: "modele", nom: "Dimensions et côté du retour" },
  { fiche: "Comptoir d'accueil avec angle 90° et accueil haut - Fifty Full", cle: "modele", nom: "Dimensions et côté du retour" },
  { fiche: "Combinaison rangements et colonne - Quiétude", cle: "largeur", nom: "Largeur des rangements",
    libelles: { "80": "80 cm", "100": "100 cm" } },
];

const estFrontiere = (c) => c == null || /[\s—–\-+(/]/.test(c);

/** Le plus long préfixe commun, reculé jusqu'à une frontière de mot. */
function prefixeCommun(libs) {
  let i = 0;
  while (i < libs[0].length && libs.every((l) => l[i] === libs[0][i])) i++;
  while (i > 0 && !estFrontiere(libs[0][i - 1])) i--;
  return i;
}

/** Le plus long suffixe commun, avancé jusqu'à une frontière de mot. */
function suffixeCommun(libs, debut) {
  const reste = libs.map((l) => l.slice(debut));
  let j = 0;
  while (j < reste[0].length
    && reste.every((r) => r.length - 1 - j >= 0 && r[r.length - 1 - j] === reste[0][reste[0].length - 1 - j])) j++;
  // On ne mange jamais tout : il faut qu'il reste quelque chose partout.
  while (j > 0 && reste.some((r) => r.length - j <= 0)) j--;
  while (j > 0 && !estFrontiere(reste[0][reste[0].length - j])) j--;
  return j;
}

function decouper(libs) {
  const p = prefixeCommun(libs);
  const s = suffixeCommun(libs, p);
  return libs.map((l) => l.slice(p, l.length - s).trim().replace(/^[—–\-+/]\s*/, "").trim());
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    where: { publie: true, accessoireSeul: false,
      choix: { some: { nom: { in: ["Modèle", "Modele", "Référence", "Reference"] } } } },
    select: {
      id: true, nom: true,
      choix: { select: { id: true, cle: true, nom: true, ordre: true, nature: true, rangReference: true,
        valeurs: { orderBy: { ordre: "asc" }, select: { id: true, libelle: true, suffixeReference: true, couleur: true } } } },
      combinaisons: { select: { id: true, valeurs: true } },
    },
  });

  const plans = [];
  const refuses = [];
  const horsTable = [];

  for (const v of vitrines) {
    const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
    if (!modele) continue;
    const libs = modele.valeurs.map((w) => w.libelle);
    if (libs.length < 2) continue;

    // Famille B : les réponses finissent par un code. Pas pour ce script.
    if (libs.every((l) => /\([A-Z0-9/\-]{3,}\)$/.test(l.trim()))) continue;

    let i = 0;
    while (i < libs[0].length && libs.every((l) => l[i] === libs[0][i])) i++;
    if (i < 25) continue;                     // les réponses ne se recopient pas

    const t = TABLE.find((e) => e.fiche === v.nom);
    if (!t) { horsTable.push(v.nom); continue; }

    // La clé doit être LIBRE sur cette fiche. Choix porte un index unique
    // (vitrineId, cle) : réutiliser une clé prise fait échouer l'écriture au
    // milieu du travail, après que les combinaisons ont déjà été réécrites.
    // C'est arrivé une fois, sur « Comptoir d'accueil avec accueil PMR
    // central », qui portait déjà un axe « largeur » de 300 et 380 cm.
    if (t.cle !== modele.cle && v.choix.some((c) => c.cle === t.cle)) {
      refuses.push(`${v.nom} — la clé « ${t.cle} » est déjà prise par « ${v.choix.find((c) => c.cle === t.cle).nom} »`);
      continue;
    }

    const bruts = decouper(libs);
    const mots = bruts.map((b) => {
      if (t.libelles && t.libelles[b] != null) return t.libelles[b];
      if (t.unite && /^L?\d+$/.test(b)) return `${b.replace(/^L/, "")} ${t.unite}`;
      return b;
    });

    if (mots.some((m) => !m)) { refuses.push(`${v.nom} — une réponse deviendrait vide`); continue; }
    if (new Set(mots).size !== mots.length) { refuses.push(`${v.nom} — deux réponses se ramèneraient au même mot`); continue; }

    // Les combinaisons citent l'ancien libellé : on le remplace partout.
    const parAncien = new Map(libs.map((l, k) => [l, mots[k]]));
    const combos = [];
    let orphelin = null;
    for (const k of v.combinaisons) {
      const ancien = k.valeurs?.[modele.cle];
      if (ancien == null) { combos.push({ id: k.id, valeurs: k.valeurs, empreinte: empreinteDe(k.valeurs) }); continue; }
      const neuf = parAncien.get(ancien);
      if (neuf == null) { orphelin = ancien; break; }
      const { [modele.cle]: _vieux, ...reste } = k.valeurs;
      const valeurs = { ...reste, [t.cle]: neuf };
      combos.push({ id: k.id, valeurs, empreinte: empreinteDe(valeurs) });
    }
    if (orphelin) { refuses.push(`${v.nom} — la combinaison cite « ${orphelin} », absente des réponses`); continue; }
    if (new Set(combos.map((c) => c.empreinte)).size !== combos.length) {
      refuses.push(`${v.nom} — deux combinaisons se confondraient`); continue;
    }

    plans.push({ v, modele, t, mots, valeurs: modele.valeurs, combos });
  }

  titre(`${plans.length} FICHES À CORRIGER`);
  for (const p of plans) {
    console.log(`\n   ${p.v.nom}`);
    console.log(`      « ${p.modele.nom} » → « ${p.t.nom} »`);
    console.log(`      ${p.mots.join("  ·  ")}`);
  }

  if (horsTable.length) {
    titre(`${horsTable.length} FICHES ABSENTES DE LA TABLE — laissées telles quelles`);
    console.log("");
    for (const n of horsTable) console.log(`   ${n}`);
  }
  if (refuses.length) {
    titre(`${refuses.length} FICHES REFUSÉES`);
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.combos.length, 0)} combinaisons réécrites`);

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  for (const p of plans) {
    // Le choix D'ABORD. C'est la seule opération qui puisse échouer sur une
    // contrainte d'unicité ; la faire en tête laisse les combinaisons intactes
    // si elle casse, au lieu de les abandonner à mi-chemin.
    //
    // On garde le choix et ses valeurs — donc ses jetons de référence et ses
    // couleurs — et on ne réécrit que les mots. Supprimer puis recréer
    // perdrait un suffixeReference que rien ne saurait retrouver.
    await prisma.choix.update({
      where: { id: p.modele.id }, data: { cle: p.t.cle, nom: p.t.nom },
    });
    for (const [k, valeur] of p.valeurs.entries()) {
      if (valeur.libelle === p.mots[k]) continue;
      await prisma.valeurChoix.update({ where: { id: valeur.id }, data: { libelle: p.mots[k] } });
    }
    for (const c of p.combos) {
      await prisma.combinaison.update({ where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte } });
    }
  }
  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
