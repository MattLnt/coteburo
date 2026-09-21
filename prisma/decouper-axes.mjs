// Rend aux fiches des axes de choix pas-à-pas, au lieu d'un axe « modele »
// qui empaquette toute la désignation du tarif.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/decouper-axes.mjs
//   node prisma/decouper-axes.mjs --apercu="Bureau plan droit - Astrolite"
//   node prisma/decouper-axes.mjs --vocabulaire
//   node prisma/decouper-axes.mjs --appliquer
//
// LA RÉGRESSION
//   L'ancienne base faisait choisir le client par étapes : Largeur, puis
//   Profondeur, puis Coloris, chaque réponse affinant la suivante. Ses axes
//   étaient nommés à la main — « Largeur », « Profondeur », « Dimensions »,
//   « Passage des câbles », « Élément », « Piétement », « Coloris »,
//   « Catégorie de revêtement » — deux cent trente-neuf fiches, une à cinq
//   axes chacune.
//
//   L'import 2026 lit le tarif, qui ne connaît qu'une désignation par ligne.
//   Il en a fait un axe unique, « modele », dont chaque valeur est la phrase
//   entière : « PLAN DROIT L120 x P80 - OBTURATEURS / PIED ARCHE A1 - SECT.
//   50x50 ». Vingt-six boutons illisibles au lieu de trois questions.
//
// CE QUE LE TARIF PERMET DE RECONSTITUER
//   Chez Buronomic la désignation est très régulière et se découpe :
//     - les cotes, en tête     L120 x P80  →  Largeur 120 cm, Profondeur 80 cm
//     - les options, entre tirets, sur un vocabulaire fermé relevé sur le
//       corpus : obturateurs, échancrure, TAC → « Passage des câbles » ;
//       départ / suivant → « Élément » ; poignées ; serrure
//     - le piétement, après la barre oblique, avec sa section
//     - ce qui reste devient « Modèle », et disparaît s'il ne varie pas.
//
//   Chez Sokoa le mal est ailleurs : les valeurs de « modele » sont LA MÊME
//   phrase répétée, seul le code entre parenthèses change — « (AOB0/11) »,
//   « (AOB0/G2) ». Le client voit cinq boutons identiques. Ce qui varie est
//   le suffixe de référence, c'est-à-dire le coloris de coque.
//
//   Mais un bouton « G2 » ne vaut pas mieux qu'une phrase répétée : le code
//   ne dit rien à un client tant que Sokoa n'a pas donné la correspondance
//   entre ces suffixes et les teintes. Les nuanciers en base portent des
//   codes d'une autre famille — « B 066 », « CUL », « 80M » — qui ne s'y
//   rattachent pas. Le découpage Sokoa est donc mesuré mais pas appliqué ;
//   --sokoa-codes force la main une fois la table obtenue.
//
//   Chez OfficePro la désignation est de la prose libre, sans gabarit —
//   « CHAUFFEUSE TISSU NON FEU ARCO PIEDS BOIS ». Rien à découper : on n'y
//   touche pas.
//
// LE GARDE-FOU
//   Un découpage n'est bon que s'il reste injectif : deux désignations d'une
//   même fiche ne doivent jamais retomber sur le même jeu de facettes, sinon
//   la déclinaison devient inchoisissable et le prix indécidable. Toute fiche
//   qui échoue à ce test est laissée telle quelle et listée dans le rapport.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const VOCABULAIRE = process.argv.includes("--vocabulaire");
const SOKOA = process.argv.includes("--sokoa-codes");
const APERCU = (process.argv.find((a) => a.startsWith("--apercu=")) || "").slice(9) || null;

const titre = (t) => console.log(`\n${"═".repeat(70)}\n${t}\n${"═".repeat(70)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/\s+/g, " ").trim();

// ── Vocabulaires fermés, relevés sur le corpus ────────────────────────────
// Un mot n'entre dans une facette que s'il y figure : tout le reste retombe
// dans le résidu « Modèle », visible, plutôt que d'être rangé à tort.
const PASSAGE = new Set(["OBTURATEURS", "OBTURATEUR", "SANS OBTURATEURS",
  "SANS OBTURATEUR", "ECHANCRURE", "ECHANCRURES", "SANS ECHANCRURE",
  "TAC", "SANS TAC", "TOP ACCESS", "COULISSANT + GOULOTTE",
  "PLATEAUX COULISSANTS", "PLATEAU COULISSANT", "SANS PASSAGE DE CABLES"]);
const ELEMENT = new Set(["DEPART", "SUIVANT", "FINAL", "DEPART + GOULOTTE",
  "SUIVANT + GOULOTTE", "FINAL + GOULOTTE"]);
const DEBUT_PIETEMENT = /^(PIED|PIEDS|ARCHE|TRIPODE|PATIN|PATINS|LUGE|TULIPE|POUTRE|STRUCTURE METAL|4 PIEDS|ROULETTES)\b/;
const POIGNEES = /^(SANS )?POIGNEES?\b/;
const SERRURE = /^SERRURE\b/;

// L'ordre des questions posées au client : ce qu'il sait d'avance d'abord —
// la taille — puis la forme, puis les détails. La finition reste en dernier,
// c'est le choix qu'on fait une fois le meuble arrêté.
const ORDRE_AXES = ["modele", "largeur", "profondeur", "hauteur", "diametre",
  "element", "passage", "pietement", "poignees", "serrure", "coloris",
  "finition", "reference"];
const NOM_AXE = {
  modele: "Modèle", largeur: "Largeur", profondeur: "Profondeur",
  hauteur: "Hauteur", diametre: "Diamètre", element: "Élément",
  passage: "Passage des câbles", pietement: "Piétement",
  poignees: "Poignées", serrure: "Serrure", coloris: "Coloris",
};

// ── Mise en forme ─────────────────────────────────────────────────────────
// Le tarif écrit en capitales. On rend une casse lisible sans abîmer les
// codes : A1, TAC, PMR, VDF, SECT., 50x50, H75 restent tels quels.
// Un jeton reste en capitales s'il porte un chiffre — « A1 », « 50x50 »,
// « H75 » — ou s'il figure parmi les sigles du catalogue. « SANS » n'en est
// pas un : sans cette liste explicite, il ressortait « SANS obturateurs ».
const SIGLES = new Set(["TAC", "PMR", "VDF", "PP", "B-BOX", "SECT.", "LED", "LEDS", "USB"]);
const EST_CODE = (m) => SIGLES.has(m.toUpperCase()) || /[0-9Ø°]/.test(m);

// Le tarif écrit sans accents — « TABLE CARREE », « SEPARATEUR MELAMINE ».
// Plutôt que d'accentuer à l'oreille, on puise dans un lexique construit sur
// les noms de fiches et de gammes du catalogue, qui, eux, sont écrits
// correctement. Un mot absent du lexique reste tel quel.
let LEXIQUE = {};
function accents(corpus) {
  const tas = {};
  for (const phrase of corpus) {
    for (const mot of String(phrase || "").split(/[^A-Za-zÀ-ÿ'-]+/)) {
      if (mot.length < 3) continue;
      const k = nu(mot);
      tas[k] = tas[k] || new Set();
      tas[k].add(mot.toLowerCase());
    }
  }
  // Une entrée n'est retenue que si le catalogue ne connaît qu'une seule
  // graphie du mot. « Fixe » et « fixé » y coexistent : sans ce garde-fou,
  // le lexique rendait « MULTIPOSTE FIXE » en « Multiposte fixé ».
  LEXIQUE = {};
  for (const [k, formes] of Object.entries(tas)) {
    if (formes.size !== 1) continue;
    const seule = [...formes][0];
    if (nu(seule) !== seule.toUpperCase()) LEXIQUE[k] = seule;
  }
}

function joli(s) {
  const mots = String(s).trim().split(/\s+/);
  return mots.map((m, i) => {
    if (EST_CODE(m)) return m;
    // Le lexique ignore les mots de deux lettres ; la préposition isolée est
    // le seul cas qui compte ici — « armoire a rideau ».
    const bas = m.toUpperCase() === "A" ? "à" : LEXIQUE[nu(m)] || m.toLowerCase();
    return i === 0 ? bas.charAt(0).toUpperCase() + bas.slice(1) : bas;
  }).join(" ").replace(/\s+-\s+/g, " — ");
}
// Les vocabulaires fermés s'affichent avec l'orthographe de la maison, celle
// que l'ancienne base employait. Le tarif, lui, écrit tout en capitales et
// sans accents : « ECHANCRURE », « SANS OBTURATEURS ».
const LIBELLE = {
  OBTURATEURS: "Obturateurs",
  OBTURATEUR: "Obturateur",
  "SANS OBTURATEURS": "Sans obturateur",
  "SANS OBTURATEUR": "Sans obturateur",
  ECHANCRURE: "Échancrure",
  ECHANCRURES: "Échancrures",
  "SANS ECHANCRURE": "Sans échancrure",
  TAC: "Top Access",
  "SANS TAC": "Sans Top Access",
  "TOP ACCESS": "Top Access",
  "COULISSANT + GOULOTTE": "Coulissant + goulotte",
  "PLATEAUX COULISSANTS": "Plateaux coulissants",
  "PLATEAU COULISSANT": "Plateau coulissant",
  "SANS PASSAGE DE CABLES": "Sans passage de câbles",
  DEPART: "Départ",
  SUIVANT: "Suivant",
  FINAL: "Final",
  "DEPART + GOULOTTE": "Départ + goulotte",
  "SUIVANT + GOULOTTE": "Suivant + goulotte",
  "FINAL + GOULOTTE": "Final + goulotte",
};
const libelle = (part) => LIBELLE[nu(part)] || joli(part);
const cote = (v) => `${v.replace(".", ",")} cm`;

// ── Découpage Buronomic ───────────────────────────────────────────────────
/**
 * Sépare sur la barre oblique, mais seulement quand elle porte une espace :
 * « P80/110 » et « H63/128 » sont des cotes, pas des séparateurs.
 */
const segmenter = (d) => d.split(/\s+\/\s*|\s*\/\s+/).map((s) => s.trim()).filter(Boolean);

function decouperBuronomic(designation) {
  const f = {};
  const residu = [];
  const segments = segmenter(designation);

  segments.forEach((segment, iSeg) => {
    const parts = segment.split(" - ").map((s) => s.trim()).filter(Boolean);

    // Un segment qui s'ouvre sur un pied EST le piétement, section comprise :
    // « PIED ARCHE A1 - SECT. 50x50 » ne se coupe pas en deux.
    if (iSeg > 0 && DEBUT_PIETEMENT.test(nu(parts[0]))) {
      f.pietement = joli(parts.join(" - "));
      return;
    }

    parts.forEach((part, iPart) => {
      const k = nu(part);
      // La tête du premier segment porte le type et les cotes.
      if (iSeg === 0 && iPart === 0) {
        // Les cotes ne se lisent que jusqu'au premier « + » : dans
        // « ... P80 + TOP L42 », le L42 est celui du top, pas du meuble.
        const corps = part.split(" + ")[0];
        let reste = corps;
        const prendre = (lettre, cle) => {
          const m = reste.match(new RegExp(`\\b${lettre}\\s?(\\d+(?:[.,]\\d+)?(?:/\\d+(?:[.,]\\d+)?)?)\\b`, "i"));
          if (!m) return;
          f[cle] = cote(m[1]);
          reste = reste.replace(m[0], " ");
        };
        prendre("L", "largeur");
        prendre("P", "profondeur");
        prendre("H", "hauteur");
        prendre("D", "diametre");
        prendre("Ø", "diametre");
        // Le « x » qui séparait les cotes n'a plus rien à séparer une fois
        // celles-ci retirées : « TABLE CARREE L120 x P120 » laissait
        // « Table carrée x ».
        const tete = (reste + part.slice(corps.length))
          .replace(/\s+[xX]\s+/g, " ").replace(/\s+[xX]\s*$/g, " ")
          .replace(/\s+/g, " ").trim();
        if (tete) residu.push(tete);
        return;
      }
      if (PASSAGE.has(k)) { f.passage = libelle(part); return; }
      if (ELEMENT.has(k)) { f.element = libelle(part); return; }
      if (POIGNEES.test(k)) { f.poignees = joli(part); return; }
      if (SERRURE.test(k)) { f.serrure = joli(part); return; }
      if (DEBUT_PIETEMENT.test(k)) { f.pietement = joli(part); return; }
      residu.push(part);
    });
  });

  if (residu.length) f.modele = joli(residu.join(" - "));
  return f;
}

// ── Découpage Sokoa ───────────────────────────────────────────────────────
// La phrase est la même d'une valeur à l'autre ; seul le code final varie.
// On ne garde que le suffixe de référence, qui est le coloris de coque.
function decouperSokoa(designation) {
  const m = designation.match(/\(([^()]*)\)\s*$/);
  if (!m) return null;
  const code = m[1].trim();
  const suffixe = code.includes("/") ? code.slice(code.indexOf("/") + 1) : code;
  if (!suffixe) return null;
  return { coloris: suffixe };
}

// ── Application à une fiche ───────────────────────────────────────────────
const cle = (f) => ORDRE_AXES.map((k) => f[k] ?? "").join(" ");

function planifier(vitrine, marque) {
  const axes = Array.isArray(vitrine.axesDeclinaisons) ? vitrine.axesDeclinaisons : [];
  const axeModele = axes.find((a) => a.id === "modele");
  if (!axeModele) return null;
  const valeurs = axeModele.valeurs || [];
  if (valeurs.length < 2) return null;

  const decouper = marque === "buronomic" ? decouperBuronomic
    : marque === "sokoa" ? decouperSokoa : null;
  if (!decouper) return null;

  // Découper chaque désignation, puis vérifier que le résultat reste injectif.
  const facettes = new Map();
  for (const v of valeurs) {
    const f = decouper(v);
    if (!f) return { vitrine, refus: "une désignation ne se découpe pas" };
    facettes.set(v, f);
  }
  const vues = new Map();
  for (const [v, f] of facettes) {
    const k = cle(f);
    if (vues.has(k)) {
      return { vitrine, refus: `« ${vues.get(k)} » et « ${v} » donnent les mêmes facettes` };
    }
    vues.set(k, v);
  }

  // Quelles facettes varient vraiment ? Une facette constante ne fait pas
  // une question : elle encombrerait la fiche d'un bouton unique.
  const variantes = new Set();
  const presentes = new Set();
  for (const k of ORDRE_AXES) {
    const vals = new Set([...facettes.values()].map((f) => f[k]));
    if (vals.size > 1) variantes.add(k);
    if (vals.size >= 1 && [...vals].some((x) => x != null)) presentes.add(k);
  }
  if (!variantes.size) return { vitrine, refus: "aucune facette ne varie" };

  // Les axes neufs, dans l'ordre des questions, puis les anciens conservés.
  const nouveaux = ORDRE_AXES.filter((k) => variantes.has(k) && NOM_AXE[k]).map((k) => ({
    id: k,
    nom: NOM_AXE[k],
    valeurs: [...new Set(valeurs.map((v) => facettes.get(v)[k]).filter((x) => x != null))],
  }));
  const conserves = axes.filter((a) => a.id !== "modele");
  const axesFinaux = [...nouveaux, ...conserves];

  // Les déclinaisons portent les mêmes facettes, à la place de « modele ».
  // Leur identifiant ne bouge pas : il est cité par les devis et les paniers.
  const declinaisons = (vitrine.declinaisons || []).map((d) => {
    const f = facettes.get(d.valeurs?.modele);
    if (!f) return d;
    const { modele, ...reste } = d.valeurs || {};
    for (const k of variantes) if (f[k] != null) reste[k] = f[k];
    return { ...d, valeurs: reste };
  });
  const orphelines = declinaisons.filter((d) => !facettes.has(
    (vitrine.declinaisons.find((x) => x.id === d.id) || {}).valeurs?.modele)).length;
  if (orphelines) return { vitrine, refus: `${orphelines} déclinaisons sans désignation connue` };

  return { vitrine, axes: axesFinaux, declinaisons, facettes, variantes, nouveaux };
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, axesDeclinaisons: true, declinaisons: true,
      gamme: { select: { marque: { select: { slug: true } } } },
    },
  });

  const gammes = await prisma.gamme.findMany({ select: { nom: true } });
  accents([...vitrines.map((v) => v.nom), ...gammes.map((g) => g.nom)]);

  const plans = [];
  const sokoaEnAttente = [];
  const refus = [];
  const horsSujet = { officepro: 0, sansModele: 0, unSeulModele: 0 };
  for (const v of vitrines) {
    const marque = v.gamme?.marque?.slug;
    if (marque === "officepro") { horsSujet.officepro += 1; continue; }
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    const am = axes.find((a) => a.id === "modele");
    if (!am) { horsSujet.sansModele += 1; continue; }
    if ((am.valeurs || []).length < 2) { horsSujet.unSeulModele += 1; continue; }
    const p = planifier(v, marque);
    if (!p) continue;
    if (p.refus) refus.push(p);
    // Chez Sokoa le découpage tient techniquement, mais il ne produit qu'un
    // code de coque — « 11 », « G2 », « V5 » — qui ne dit rien à un client.
    // On le mesure sans l'appliquer, tant que Sokoa n'a pas fourni la table
    // de correspondance entre ces codes et les teintes.
    else if (marque === "sokoa" && !SOKOA) sokoaEnAttente.push(p);
    else plans.push({ ...p, marque });
  }

  if (VOCABULAIRE) {
    titre("CE QUI RESTE DANS LE RÉSIDU « MODÈLE »");
    const tas = {};
    for (const p of plans.filter((x) => x.marque === "buronomic")) {
      for (const f of p.facettes.values()) if (f.modele) tas[f.modele] = (tas[f.modele] || 0) + 1;
    }
    const L = Object.entries(tas).sort((a, b) => b[1] - a[1]);
    console.log(`\n   ${L.length} résidus distincts\n`);
    console.log(L.slice(0, 40).map(([n, c]) => `   ${String(c).padStart(4)}  ${n}`).join("\n"));
  }

  titre("CE QUI SERAIT FAIT");
  for (const m of ["buronomic", "sokoa"]) {
    const L = plans.filter((p) => p.marque === m);
    if (!L.length) continue;
    const dist = {};
    for (const p of L) dist[p.nouveaux.length] = (dist[p.nouveaux.length] || 0) + 1;
    const noms = {};
    for (const p of L) for (const a of p.nouveaux) noms[a.nom] = (noms[a.nom] || 0) + 1;
    console.log(`\n   ${m} — ${L.length} fiches découpées`);
    console.log(`      axes neufs par fiche : ${Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, c]) => `${k} → ${c}`).join("  ")}`);
    console.log(`      noms : ${Object.entries(noms).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} (${c})`).join(" · ")}`);
  }
  if (sokoaEnAttente.length) {
    const codes = new Set();
    for (const p of sokoaEnAttente) for (const f of p.facettes.values()) codes.add(f.coloris);
    console.log(`\n   sokoa — ${sokoaEnAttente.length} fiches découpables, EN ATTENTE`);
    console.log(`      l'axe ne rendrait qu'un code de coque, illisible pour un client`);
    console.log(`      ${codes.size} codes distincts : ${[...codes].sort().slice(0, 20).join(" · ")}${codes.size > 20 ? " …" : ""}`);
    console.log(`      il faut la table de correspondance Sokoa, puis --sokoa-codes`);
  }

  console.log(`\n   laissées telles quelles :`);
  console.log(`      OfficePro, prose libre                    ${String(horsSujet.officepro).padStart(4)}`);
  console.log(`      sans axe « modele »                       ${String(horsSujet.sansModele).padStart(4)}`);
  console.log(`      un seul modèle, rien à découper           ${String(horsSujet.unSeulModele).padStart(4)}`);
  console.log(`      découpage refusé par le garde-fou         ${String(refus.length).padStart(4)}`);

  if (refus.length) {
    titre("FICHES REFUSÉES — LE DÉCOUPAGE N'Y EST PAS SÛR");
    console.log("");
    for (const r of refus.slice(0, 25)) {
      console.log(`   ${r.vitrine.nom}`);
      console.log(`      ${r.refus}`);
    }
    if (refus.length > 25) console.log(`   … et ${refus.length - 25} autres`);
  }

  if (APERCU) {
    const p = plans.find((x) => x.vitrine.nom === APERCU);
    titre(`APERÇU — ${APERCU}`);
    if (!p) {
      const r = refus.find((x) => x.vitrine.nom === APERCU);
      console.log(r ? `\n   refusée : ${r.refus}` : "\n   fiche hors du périmètre");
    } else {
      const ancien = (p.vitrine.axesDeclinaisons || []).find((a) => a.id === "modele");
      console.log(`\n   AVANT — 1 axe « Modèle », ${(ancien.valeurs || []).length} valeurs :`);
      for (const v of (ancien.valeurs || []).slice(0, 3)) console.log(`      ${v}`);
      console.log(`      …`);
      console.log(`\n   APRÈS — ${p.axes.length} axes :`);
      for (const a of p.axes) {
        const vals = a.valeurs || [];
        console.log(`      ${a.nom.padEnd(20)} ${vals.slice(0, 8).join(" · ")}${vals.length > 8 ? ` … (${vals.length})` : ""}`);
      }
      console.log(`\n   Une déclinaison :`);
      console.log(`      ${JSON.stringify(p.declinaisons[0].valeurs)}`);
    }
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const p of plans) {
    await prisma.produitVitrine.update({
      where: { id: p.vitrine.id },
      data: { axesDeclinaisons: p.axes, declinaisons: p.declinaisons },
    });
    n += 1;
    if (n % 25 === 0) console.log(`   ${n} / ${plans.length} fiches`);
  }
  console.log(`   ${n} fiches découpées`);

  titre("CONTRÔLE");
  const apres = await prisma.produitVitrine.findMany({
    select: { nom: true, axesDeclinaisons: true, declinaisons: true },
  });
  const dist = {};
  let incoherentes = 0;
  for (const v of apres) {
    const A = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    dist[A.length] = (dist[A.length] || 0) + 1;
    // Toute valeur portée par une déclinaison doit exister sur son axe.
    for (const d of v.declinaisons || []) {
      for (const [k, val] of Object.entries(d.valeurs || {})) {
        const a = A.find((x) => x.id === k);
        if (a && !(a.valeurs || []).includes(val)) { incoherentes += 1; break; }
      }
    }
  }
  console.log(`   axes par fiche : ${Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, c]) => `${k} → ${c}`).join("  ")}`);
  console.log(`   déclinaisons portant une valeur hors axe : ${incoherentes}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
