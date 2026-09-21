// Reverse le catalogue actuel dans le modèle à choix, valeurs, combinaisons
// et visuels. À vide par défaut : rien n'est écrit tant que --appliquer
// n'est pas donné.
//
//   node prisma/migrer-modele-produit.mjs
//   node prisma/migrer-modele-produit.mjs --apercu="Bureau multiposte - Partage"
//   node prisma/migrer-modele-produit.mjs --echecs
//   node prisma/migrer-modele-produit.mjs --appliquer
//
// CE QU'ELLE LIT, CE QU'ELLE ÉCRIT
//
//   axesDeclinaisons        → Choix de nature « tarifaire » + ValeurChoix
//   groupesFinition         → Choix de nature « finition »  + ValeurChoix
//   declinaisons            → Combinaison (prix, éco, poids, ean, réf. de base)
//   referencesParFinition   → ValeurChoix.suffixeReference
//   imageUrl + images[]     → Visuel, rattaché à une valeur quand le décor
//                             figure dans l'URL
//
//   Rien n'est supprimé : les anciens champs restent en place le temps que le
//   front bascule.
//
// LE TEST DE VÉRITÉ
//   Le modèle tient si la référence se reconstruit :
//
//       referenceBase + Σ suffixeReference(valeur retenue)
//
//   Pour chaque fiche portant une table de références, on cherche un
//   découpage du suffixe en un jeton par choix de finition, puis on
//   REGÉNÈRE toutes les références et on les confronte à celles du tarif.
//   Le découpage n'est retenu que si l'ensemble regénéré est exactement
//   l'ensemble du tarif — ni manquante, ni en trop.
//
//   Une fiche qui échoue est listée par --echecs et migrée sans suffixes :
//   sa référence reste celle de la combinaison, et le cas est à trancher à
//   la main. Rien n'est inventé.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const ECHECS = process.argv.includes("--echecs");
const APERCU = (process.argv.find((a) => a.startsWith("--apercu=")) || "").slice(9) || null;

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const slug = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Un séparateur qui ne peut apparaître dans aucun libellé, écrit en toutes
// lettres : les trois octets de contrôle qui traînaient ici rendaient le
// fichier illisible et piégeaient les outils qui le relisaient.
const SEP = "␟";

// L'empreinte ne dépend pas de l'ordre des clés du JSON.
const empreinteDe = (valeurs) => {
  const ordonne = Object.keys(valeurs).sort().map((k) => `${k}=${valeurs[k]}`).join(SEP);
  return createHash("md5").update(ordonne).digest("hex").slice(0, 16);
};

const RENDU = { tarifaire: "boutons", finition: "pastilles", option: "cases" };

// ── Le découpage de la référence ──────────────────────────────────────────
/** Le plus long préfixe commun d'une liste de chaînes. */
function prefixeCommun(L) {
  if (!L.length) return "";
  let p = L[0];
  for (const s of L) {
    let i = 0;
    while (i < p.length && i < s.length && p[i] === s[i]) i += 1;
    p = p.slice(0, i);
  }
  return p;
}

/**
 * Les découpages possibles d'une longueur en n morceaux. Un groupe qui n'a
 * qu'une valeur peut n'ajouter aucun caractère : son jeton est alors déjà
 * dans le préfixe commun. « Table à pieds pliants » n'existe qu'en piétement
 * noir, et sa base « DZ145 » avale le 5 du piétement.
 */
function decoupages(longueur, minima) {
  const n = minima.length;
  if (n === 1) return [[longueur]];
  const out = [];
  const max = longueur - minima.slice(1).reduce((a, b) => a + b, 0);
  for (let t = minima[0]; t <= max; t += 1) {
    for (const reste of decoupages(longueur - t, minima.slice(1))) out.push([t, ...reste]);
  }
  return out;
}

/**
 * Toutes les valeurs du groupe que peut désigner un morceau de libellé.
 *
 * Le rapprochement va dans les deux sens, parce que le tarif et la fiche ne
 * nomment pas les choses avec la même précision :
 *   - le tarif en dit plus : « NOIR METAL », « MEUBLE NOIR », « POIGNEES
 *     ALUMINIUM » désignent la valeur « Noir » ou « Aluminium » ;
 *   - la fiche en dit plus : « Chêne Nebraska », « C1 — classique Aluminium »
 *     sont désignés par « NEBRASKA » et « POIGNEES ALUMINIUM ».
 *
 * Plusieurs valeurs peuvent convenir — « C1 — classique Aluminium » et
 * « D1 — design Aluminium » répondent toutes deux à « POIGNEES ALUMINIUM ».
 * On rend donc la liste, et c'est le jeton observé dans la référence qui
 * tranchera : celui qui commence par « C1 » désigne la classique. Une preuve,
 * pas une préférence.
 */
function valeursDe(morceau, valeurs) {
  const k = nu(morceau);
  const dernier = k.split(" ").pop();
  // Trois niveaux, du plus sûr au plus faible. On ne descend d'un cran que
  // si le précédent est vide : « POIGNEES NOIR » ne partage que son dernier
  // mot avec « C3 — classique Noir », mais aucune autre lecture n'existe, et
  // la régénération complète des références vérifiera l'hypothèse.
  const exact = [];
  const contenu = [];
  const memeDernierMot = [];
  for (const v of valeurs) {
    const kv = nu(v);
    if (!kv) continue;
    if (kv === k) { exact.push(v); continue; }
    if (k.startsWith(`${kv} `) || k.endsWith(` ${kv}`)
      || kv.startsWith(`${k} `) || kv.endsWith(` ${k}`)) { contenu.push(v); continue; }
    if (dernier && dernier.length > 2 && kv.split(" ").pop() === dernier) memeDernierMot.push(v);
  }
  if (exact.length) return exact;
  if (contenu.length) return contenu;
  return memeDernierMot;
}

const valeurDe = (morceau, valeurs) => valeursDe(morceau, valeurs)[0] || null;

/**
 * Retrouve, pour chaque groupe de finition, le jeton que chaque valeur ajoute
 * à la référence. Rend null si aucun découpage ne régénère exactement les
 * références du tarif.
 */
function resoudreSuffixes(refsParLibelle, groupes) {
  const libelles = Object.keys(refsParLibelle);
  if (!libelles.length || !groupes.length) return null;
  const base = prefixeCommun(libelles.map((l) => refsParLibelle[l]));
  const noms = groupes.map((g) => g.finitions.map((f) => f.nom));

  // Chaque morceau du libellé désigne une valeur d'un groupe. L'ordre des
  // morceaux est celui du tarif, et c'est LUI que suit la référence — pas
  // l'ordre d'affichage des groupes. Chez Eko le libellé dit « NOIR -
  // SERRURE NOIR » et la référence écrit DZ51 + G + 5 dans le même ordre,
  // alors que la fiche montre la serrure avant la finition.
  //
  // Un groupe que le libellé ne cite jamais n'ajoute rien à la référence :
  // c'est le cas des groupes à valeur unique — « Équerres », « Structure » —
  // dont le jeton est déjà dans le préfixe commun.
  //
  // Le rattachement d'un morceau à un groupe ne peut pas se décider libellé
  // par libellé : une même teinte figure souvent dans plusieurs groupes.
  // « NOIR - SERRURE NOIR » se lirait aussi bien à l'envers. On cherche donc
  // un schéma — une position de morceau par groupe — qui vaille pour TOUS les
  // libellés. Chez Eko, « OMBRE - SERRURE NOIR » tranche : seule la finition
  // connaît l'ombre, donc la première position est la finition.
  const morceauxPar = {};
  let K = null;
  for (const l of libelles) {
    const M = l.split(/\s+\/\s+|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
    if (K === null) K = M.length;
    else if (M.length !== K) return { echec: "les libellés n'ont pas tous le même nombre de morceaux" };
    morceauxPar[l] = M;
  }
  if (K > groupes.length) return { echec: "plus de morceaux que de groupes" };

  // Les groupes possibles pour chaque position, tous libellés confrontés.
  const candidatsPos = [];
  for (let j = 0; j < K; j += 1) {
    const ok = [];
    for (let g = 0; g < groupes.length; g += 1) {
      if (libelles.every((l) => valeurDe(morceauxPar[l][j], noms[g]) !== null)) ok.push(g);
    }
    if (!ok.length) {
      const exemple = morceauxPar[libelles[0]][j];
      return { echec: `aucun groupe ne couvre la position ${j + 1} (« ${exemple} »…)` };
    }
    candidatsPos.push(ok);
  }

  // Les schémas injectifs : un groupe ne sert qu'une fois.
  const schemas = [];
  const batir = (j, acc, pris) => {
    if (schemas.length > 200) return;
    if (j === K) { schemas.push(acc.slice()); return; }
    for (const g of candidatsPos[j]) {
      if (pris.has(g)) continue;
      pris.add(g); acc.push(g);
      batir(j + 1, acc, pris);
      acc.pop(); pris.delete(g);
    }
  };
  batir(0, [], new Set());
  if (!schemas.length) return { echec: "aucun schéma ne rattache chaque morceau à un groupe distinct" };
  const suffixes = libelles.map((l) => refsParLibelle[l].slice(base.length));
  const taille = suffixes[0].length;
  if (K > 1 && suffixes.some((s) => s.length !== taille)) {
    return { echec: "suffixes de longueurs inégales sur plusieurs jetons" };
  }

  let meilleur = null;
  for (const ordreGroupes of schemas) {
  // Les valeurs possibles de chaque morceau, une fois le schéma fixé. Le
  // choix définitif se fera jeton en main, dans la boucle de découpage.
  const parts = {};
  for (const l of libelles) {
    parts[l] = ordreGroupes.map((g, j) => ({ g, choix: valeursDe(morceauxPar[l][j], noms[g]) }));
  }

  // Un seul jeton : il vaut le suffixe entier, quelle que soit sa longueur.
  // « PLA01BL » et « PLA01BL2 » cohabitent ainsi sans difficulté.
  const candidats = K === 1
    ? [null]
    : decoupages(taille, ordreGroupes.map((g) => (groupes[g].finitions.length <= 1 ? 0 : 1)));

  for (const decoupe of candidats) {
    const table = groupes.map(() => new Map());
    let bon = true;
    // Le choix retenu pour chaque morceau, sous ce découpage.
    const retenu = {};
    for (const l of libelles) {
      const s = refsParLibelle[l].slice(base.length);
      let i = 0;
      retenu[l] = [];
      for (let j = 0; j < ordreGroupes.length; j += 1) {
        const g = ordreGroupes[j];
        const jeton = decoupe ? s.slice(i, i + decoupe[j]) : s;
        if (decoupe) i += decoupe[j];
        // Quand plusieurs valeurs répondent au morceau, c'est le jeton qui
        // tranche : « C1 — classique Aluminium » porte le jeton « C1 ».
        const candidats = parts[l][j].choix;
        let valeur = candidats[0];
        if (candidats.length > 1) {
          const jk = nu(jeton);
          const marquee = jk && candidats.find((v) => nu(v).startsWith(`${jk} `) || nu(v) === jk);
          if (marquee) valeur = marquee;
          else { bon = false; break; }
        }
        if (!valeur) { bon = false; break; }
        retenu[l].push({ g, valeur });
        const cle = nu(valeur);
        const connu = table[g].get(cle);
        if (connu === undefined) table[g].set(cle, jeton);
        else if (connu !== jeton) { bon = false; break; }
      }
      if (!bon) break;
    }
    if (!bon) continue;
    // Deux valeurs d'un même groupe ne peuvent pas porter le même jeton —
    // sauf un groupe à valeur unique, dont le jeton peut être vide.
    if (table.some((m, g) => groupes[g].finitions.length > 1 && new Set(m.values()).size !== m.size)) continue;

    // Toutes les références du tarif se regénèrent — c'est vrai par
    // construction, on le vérifie quand même, une par une.
    let exactes = true;
    for (const l of libelles) {
      const reconstruite = base + retenu[l].map((t) => table[t.g].get(nu(t.valeur)) ?? "").join("");
      if (reconstruite !== refsParLibelle[l]) { exactes = false; break; }
    }
    if (!exactes) continue;

    // Le produit cartésien peut dépasser ce que le tarif propose : certaines
    // associations de teintes ne sont pas vendues. On les relève.
    const attendues = new Set(Object.values(refsParLibelle));
    const manquantes = [];
    const combiner = (j, acc, choisi) => {
      if (j === ordreGroupes.length) {
        if (!attendues.has(base + acc)) manquantes.push(choisi.slice());
        return;
      }
      for (const [cle, jeton] of table[ordreGroupes[j]]) {
        choisi.push(cle);
        combiner(j + 1, acc + jeton, choisi);
        choisi.pop();
      }
    };
    combiner(0, "", []);

    if (!meilleur || manquantes.length < meilleur.manquantes.length) {
      meilleur = { base, table, decoupe, manquantes, ordreGroupes };
    }
    if (!manquantes.length) break;
  }
  if (meilleur && !meilleur.manquantes.length) break;
  }
  return meilleur || { echec: "aucun découpage cohérent" };
}

// ── Le plan d'une fiche ───────────────────────────────────────────────────
function planifier(v) {
  const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
  const declinaisons = Array.isArray(v.declinaisons) ? v.declinaisons : [];
  const groupes = [...v.groupesFinition].sort((a, b) => a.ordre - b.ordre);

  const choix = [];
  let ordre = 0;

  // Les axes portent le prix : ce sont les choix tarifaires. Une valeur vide
  // ou nulle traîne parfois dans le JSON ; elle ne fait pas un choix, et la
  // base refuserait un libellé absent.
  for (const a of axes) {
    const valeurs = (a.valeurs || [])
      .filter((val) => val != null && String(val).trim() !== "")
      .map((val, i) => ({ libelle: String(val), ordre: i }));
    if (!valeurs.length) continue;
    choix.push({ cle: a.id, nom: a.nom || a.id, nature: "tarifaire", ordre: ordre++, valeurs });
  }

  // Les groupes de finition ne touchent pas au prix.
  const refsParFinition = declinaisons.find((d) => d.referencesParFinition)?.referencesParFinition || null;
  const brut = refsParFinition ? resoudreSuffixes(refsParFinition, groupes) : null;
  const resolution = brut && !brut.echec ? brut : null;

  // Les clés doivent rester uniques sur la fiche : un axe « finition » et un
  // groupe nommé « Finition » produisent le même slug, et la base refuse le
  // doublon. On numérote le second plutôt que d'écraser le premier.
  const clesPrises = new Set(choix.map((c) => c.cle));
  const cleLibre = (base, secours) => {
    let cle = base || secours;
    let i = 2;
    while (clesPrises.has(cle)) { cle = `${base || secours}-${i}`; i += 1; }
    clesPrises.add(cle);
    return cle;
  };

  groupes.forEach((g, ig) => {
    const cle = cleLibre(slug(g.nom), `finition-${ig}`);
    const valeursFin = [...g.finitions]
      .filter((f) => f.nom != null && String(f.nom).trim() !== "")
      .sort((a, b) => a.ordre - b.ordre);
    if (!valeursFin.length) return;
    choix.push({
      cle, nom: g.nom, nature: "finition", ordre: ordre++,
      valeurs: valeursFin.map((f, i) => ({
        libelle: f.nom, couleur: f.couleur, imageUrl: f.imageUrl,
        paletteNom: f.paletteNom, ordre: i,
        suffixeReference: resolution ? (resolution.table[ig].get(nu(f.nom)) || null) : null,
      })),
    });
  });

  // Les combinaisons : une par déclinaison, la finition en moins.
  const combinaisons = declinaisons.map((d) => {
    const valeurs = { ...(d.valeurs || {}) };
    let base = d.referenceFournisseur || null;
    if (resolution) base = resolution.base;
    return {
      valeurs, empreinte: empreinteDe(valeurs), ancienId: d.id || null,
      prixTarifHT: d.prixTarifHT == null ? null : Number(d.prixTarifHT),
      ecoContribution: d.ecoContribution == null ? null : Number(d.ecoContribution),
      poids: d.poids == null ? null : Number(d.poids),
      ean: d.ean || null, referenceBase: base,
      pageCatalogue: d.pageCatalogue == null ? null : Number(d.pageCatalogue),
    };
  });

  // Les visuels. Le décor est encore dans l'URL : on tente de le rattacher à
  // une valeur de finition, sans forcer.
  const valeursFinition = [];
  for (const c of choix) {
    if (c.nature !== "finition") continue;
    for (const val of c.valeurs) valeursFinition.push({ cle: c.cle, libelle: val.libelle, slug: slug(val.libelle) });
  }
  // Un visuel montre souvent DEUX pièces à la fois — « …-aluminium-chene-fil… »
  // porte le piétement et le plateau. On retient donc toutes les valeurs que
  // le nom nomme, une au plus par choix : le nom est écrit dans l'ordre des
  // pièces, et deux plateaux ne peuvent pas coexister sur une photo.
  const rattacher = (url) => {
    const fichier = String(url).split("/").pop().replace(/\.[a-z0-9]+$/i, "");
    const parChoix = new Map();
    for (const val of valeursFinition) {
      if (!val.slug || val.slug.length < 4) continue;
      if (!fichier.includes(val.slug)) continue;
      const tenant = parChoix.get(val.cle);
      if (!tenant || val.slug.length > tenant.slug.length) parChoix.set(val.cle, val);
    }
    return [...parChoix.values()];
  };
  const visuels = [];
  const vus = new Set();
  if (v.imageUrl) {
    visuels.push({ url: v.imageUrl, role: "vignette", ordre: 0, rattache: [] });
    vus.add(v.imageUrl);
  }
  for (const url of v.images || []) {
    if (!url || vus.has(url)) continue;
    vus.add(url);
    const fichier = String(url).split("/").pop();
    visuels.push({
      url, role: /(^|[-_/])amb/i.test(fichier) ? "ambiance" : "galerie",
      ordre: visuels.length, rattache: rattacher(url),
    });
  }

  return {
    id: v.id, nom: v.nom, choix, combinaisons, visuels,
    resolution, refsParFinition, echec: brut && brut.echec ? brut.echec : null,
    manquantes: resolution ? resolution.manquantes : [],
    aDesRefs: !!refsParFinition,
    testOk: !!resolution,
  };
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ MIGRATION À VIDE — rien n'est écrit ═══\n");

  const palettes = await prisma.paletteFinition.findMany({ select: { id: true, nom: true } });
  const paletteParNom = new Map(palettes.map((p) => [nu(p.nom), p.id]));
  // Les modèles de nuancier, cherchables par palette et par nom, puis par nom
  // seul : une teinte peut exister dans une palette qu'on n'a pas su nommer.
  const modeles = await prisma.finitionModele.findMany({ select: { id: true, nom: true, paletteId: true } });
  const modeleParNom = new Map();
  for (const m of modeles) {
    modeleParNom.set(`${m.paletteId ?? ""}${SEP}${nu(m.nom)}`, m.id);
    const seul = `${SEP}${nu(m.nom)}`;
    if (!modeleParNom.has(seul)) modeleParNom.set(seul, m.id);
  }

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, axesDeclinaisons: true, declinaisons: true,
      imageUrl: true, images: true,
      groupesFinition: {
        select: {
          nom: true, ordre: true,
          finitions: { select: { nom: true, couleur: true, imageUrl: true, paletteNom: true, ordre: true } },
        },
      },
    },
  });

  const plans = vitrines.map(planifier);

  titre("CE QUI SERAIT CRÉÉ");
  const nChoix = plans.reduce((n, p) => n + p.choix.length, 0);
  const nVal = plans.reduce((n, p) => n + p.choix.reduce((m, c) => m + c.valeurs.length, 0), 0);
  const nComb = plans.reduce((n, p) => n + p.combinaisons.length, 0);
  const nVis = plans.reduce((n, p) => n + p.visuels.length, 0);
  const parNature = {};
  for (const p of plans) for (const c of p.choix) parNature[c.nature] = (parNature[c.nature] || 0) + 1;
  console.log(`\n   produits           ${String(plans.length).padStart(6)}`);
  console.log(`   choix              ${String(nChoix).padStart(6)}   ${Object.entries(parNature).map(([k, c]) => `${k} ${c}`).join(" · ")}`);
  console.log(`   valeurs de choix   ${String(nVal).padStart(6)}`);
  console.log(`   combinaisons       ${String(nComb).padStart(6)}`);
  console.log(`   visuels            ${String(nVis).padStart(6)}`);

  titre("RIEN NE SE PERD ?");
  const axesAvant = vitrines.reduce((n, v) => n + (Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons.length : 0), 0);
  const groupesAvant = vitrines.reduce((n, v) => n + v.groupesFinition.length, 0);
  const declAvant = vitrines.reduce((n, v) => n + (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0), 0);
  const imagesAvant = vitrines.reduce((n, v) => n + (v.imageUrl ? 1 : 0) + (v.images || []).filter(Boolean).length, 0);
  const ligne = (quoi, avant, apres) => {
    const ok = avant === apres;
    console.log(`   ${quoi.padEnd(34)} ${String(avant).padStart(6)} → ${String(apres).padStart(6)}   ${ok ? "identique" : "ÉCART"}`);
    return ok;
  };
  console.log("");
  let sain = true;
  // Un axe dont toutes les valeurs sont nulles ne fait pas un choix : les neuf
  // axes « reference » vides des cabines et des tisaneries sont écartés
  // volontairement, et aucune déclinaison ne les renseignait.
  const axesVides = vitrines.reduce((n, v) => n + (Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [])
    .filter((a) => !(a.valeurs || []).some((x) => x != null && String(x).trim() !== "")).length, 0);
  sain = ligne("axes → choix tarifaires", axesAvant - axesVides, parNature.tarifaire || 0) && sain;
  if (axesVides) console.log(`   ${"dont axes vides écartés".padEnd(34)} ${String(axesVides).padStart(6)}          volontaire`);
  sain = ligne("groupes → choix de finition", groupesAvant, parNature.finition || 0) && sain;
  sain = ligne("déclinaisons → combinaisons", declAvant, nComb) && sain;
  const doublons = plans.reduce((n, p) => n + (p.combinaisons.length - new Set(p.combinaisons.map((c) => c.empreinte)).size), 0);
  console.log(`   ${"combinaisons en double".padEnd(34)} ${String(doublons).padStart(6)}          ${doublons ? "À VOIR" : "aucune"}`);
  console.log(`   ${"images → visuels".padEnd(34)} ${String(imagesAvant).padStart(6)} → ${String(nVis).padStart(6)}   ${nVis <= imagesAvant ? "dédoublonnage" : "ÉCART"}`);

  titre("LE TEST DE VÉRITÉ — LA RÉFÉRENCE SE RECONSTRUIT-ELLE ?");
  const concernees = plans.filter((p) => p.aDesRefs);
  const reussies = concernees.filter((p) => p.testOk);
  const echouees = concernees.filter((p) => !p.testOk);
  const nRefs = reussies.reduce((n, p) => n + Object.keys(p.refsParFinition).length, 0);
  console.log(`\n   fiches portant une table de références du tarif  ${String(concernees.length).padStart(5)}`);
  console.log(`   dont la référence se reconstruit exactement       ${String(reussies.length).padStart(5)}`);
  console.log(`   dont le découpage échoue                          ${String(echouees.length).padStart(5)}`);
  console.log(`\n   références du tarif regénérées à l'identique      ${String(nRefs).padStart(5)}`);
  // Un arrondi ne doit pas pouvoir afficher « 100 % » tant qu'une fiche
  // échoue : 223 sur 224 font 99,6, et c'est cela qu'il faut lire.
  const taux = concernees.length ? (reussies.length / concernees.length) * 100 : 0;
  const affiche = echouees.length && taux > 99.9 ? "99,9" : taux.toFixed(1).replace(".", ",");
  console.log(`\n   ${affiche} % — ${echouees.length
    ? `${echouees.length} fiche(s) restent à trancher.`
    : "le modèle tient sur toutes les fiches concernées."}`);

  const avecExclusions = reussies.filter((p) => p.manquantes.length);
  const nExcl = avecExclusions.reduce((n, p) => n + p.manquantes.length, 0);
  console.log(`\n   fiches où le tarif ne vend pas toutes les associations ${String(avecExclusions.length).padStart(3)}`);
  console.log(`   associations de finitions absentes du tarif            ${String(nExcl).padStart(3)}`);
  if (avecExclusions.length) {
    console.log(`      la règle reste exacte ; c'est la disponibilité qui n'est pas le produit complet`);
    for (const p of avecExclusions.slice(0, 4)) {
      console.log(`      ${p.nom.slice(0, 48).padEnd(50)} ${p.manquantes.length} absentes — ex. ${p.manquantes[0].join(" / ")}`);
    }
  }

  const sansRefs = plans.filter((p) => !p.aDesRefs && p.choix.some((c) => c.nature === "finition"));
  console.log(`\n   fiches à finitions mais sans table de références   ${String(sansRefs.length).padStart(5)}`);
  console.log(`      leur référence reste celle de la combinaison — rien à reconstruire`);

  if (ECHECS && echouees.length) {
    titre("LES FICHES DONT LE DÉCOUPAGE ÉCHOUE");
    console.log("");
    for (const p of echouees) {
      const g = p.choix.filter((c) => c.nature === "finition");
      const refs = Object.entries(p.refsParFinition);
      console.log(`   ${p.nom}`);
      console.log(`      motif : ${p.echec}`);
      console.log(`      ${g.length} groupe(s) : ${g.map((x) => `${x.nom} (${x.valeurs.length})`).join(" · ")}`);
      console.log(`      ${refs.length} références, base commune « ${prefixeCommun(refs.map((r) => r[1]))} »`);
      console.log(`      ex. ${refs.slice(0, 3).map(([l, r]) => `${r} = ${l}`).join("  |  ")}`);
    }
  }

  const rattaches = plans.reduce((n, p) => n + p.visuels.filter((v) => v.rattache.length).length, 0);
  console.log(`\n   visuels rattachés à une valeur de finition        ${String(rattaches).padStart(5)} / ${nVis}`);

  if (APERCU) {
    const p = plans.find((x) => x.nom === APERCU) || plans.find((x) => x.nom.includes(APERCU));
    titre(`APERÇU — ${p ? p.nom : APERCU}`);
    if (!p) console.log("\n   fiche introuvable");
    else {
      console.log("");
      for (const c of p.choix) {
        const ech = c.valeurs.slice(0, 6).map((v) => v.suffixeReference ? `${v.libelle} [${v.suffixeReference}]` : v.libelle);
        console.log(`   ${c.nature.padEnd(10)} ${c.nom.padEnd(22)} ${ech.join(" · ")}${c.valeurs.length > 6 ? " …" : ""}`);
      }
      console.log(`\n   ${p.combinaisons.length} combinaisons — la première :`);
      const c0 = p.combinaisons[0];
      console.log(`      ${JSON.stringify(c0.valeurs)}`);
      console.log(`      base ${c0.referenceBase} · ${c0.prixTarifHT} € · éco ${c0.ecoContribution} · ancien id ${c0.ancienId}`);
      if (p.resolution) {
        console.log(`\n   Reconstruction de la référence :`);
        const g = p.choix.filter((x) => x.nature === "finition");
        const ex = Object.entries(p.refsParFinition).slice(0, 4);
        for (const [libelle, ref] of ex) {
          const morceaux = libelle.split(/\s+\/\s+|\s+-\s+/).map((s) => s.trim());
          // Chaque morceau interroge LE groupe que le schéma lui a rattaché :
          // « BLANC » en seconde position est un plateau, pas un piétement.
          const jetons = morceaux.map((m, i) => {
            const g = p.resolution.ordreGroupes[i];
            if (g === undefined) return "?";
            for (const [k, j] of p.resolution.table[g]) {
              if (nu(m) === k || nu(m).endsWith(` ${k}`) || nu(m).startsWith(`${k} `)) return j;
            }
            return "?";
          });
          console.log(`      ${p.resolution.base} + ${jetons.join(" + ")} = ${p.resolution.base + jetons.join("")}   ${p.resolution.base + jetons.join("") === ref ? "✓" : "✗"}  ${libelle}`);
        }
      }
      console.log(`\n   ${p.visuels.length} visuels :`);
      for (const v of p.visuels.slice(0, 5)) {
        console.log(`      ${v.role.padEnd(9)} ${v.rattache.length ? `→ ${v.rattache.map((r) => r.libelle).join(" + ")}` : "—"}   ${v.url.split("/").pop()}`);
      }
    }
  }

  if (!APPLIQUER) {
    console.log(`\n${sain ? "Rien ne se perd." : "Des écarts sont signalés ci-dessus."} Migration à vide terminée.`);
    console.log("Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const p of plans) {
    // On repart de zéro sur cette fiche : la migration est rejouable.
    await prisma.exclusionFinition.deleteMany({ where: { vitrineId: p.id } });
    await prisma.visuel.deleteMany({ where: { vitrineId: p.id } });
    await prisma.combinaison.deleteMany({ where: { vitrineId: p.id } });
    await prisma.choix.deleteMany({ where: { vitrineId: p.id } });

    const valeurIdParCle = new Map();
    for (const c of p.choix) {
      const cree = await prisma.choix.create({
        data: {
          cle: c.cle, nom: c.nom, nature: c.nature, ordre: c.ordre,
          rendu: RENDU[c.nature], origine: "tarif", vitrineId: p.id,
          valeurs: {
            create: c.valeurs.map((v) => {
              const paletteId = v.paletteNom ? paletteParNom.get(nu(v.paletteNom)) ?? null : null;
              return {
                libelle: v.libelle, couleur: v.couleur ?? null, imageUrl: v.imageUrl ?? null,
                suffixeReference: v.suffixeReference ?? null, ordre: v.ordre,
                paletteId,
                // Le lien vers la bibliothèque, par clé. Une valeur qui porte
                // le nom d'un modèle de nuancier le désigne : la couleur et la
                // pastille suivront désormais la bibliothèque au lieu d'en
                // être une copie qui se périme.
                modeleId: modeleParNom.get(`${paletteId ?? ""}${SEP}${nu(v.libelle)}`)
                  ?? modeleParNom.get(`${SEP}${nu(v.libelle)}`) ?? null,
              };
            }),
          },
        },
        select: { valeurs: { select: { id: true, libelle: true } } },
      });
      for (const v of cree.valeurs) valeurIdParCle.set(`${c.cle}${SEP}${v.libelle}`, v.id);
    }

    if (p.combinaisons.length) {
      await prisma.combinaison.createMany({
        data: p.combinaisons.map((c) => ({ ...c, vitrineId: p.id })),
        skipDuplicates: true,
      });
    }

    for (const v of p.visuels) {
      const ids = (v.rattache || [])
        .map((r) => valeurIdParCle.get(`${r.cle}${SEP}${r.libelle}`))
        .filter(Boolean);
      await prisma.visuel.create({
        data: {
          url: v.url, role: v.role, ordre: v.ordre, vitrineId: p.id,
          valeurs: { create: ids.map((id) => ({ valeurChoixId: id })) },
        },
      });
    }

    // Les associations de finitions que le tarif ne vend pas. On les écrit en
    // identifiants de valeurs, pas en libellés : le front doit pouvoir fermer
    // un choix, pas relire du texte.
    for (const tuple of p.manquantes || []) {
      const ids = tuple.map((cleValeur, i) => {
        const g = p.resolution.ordreGroupes[i];
        const choixFinition = p.choix.filter((c) => c.nature === "finition")[g];
        if (!choixFinition) return null;
        const val = choixFinition.valeurs.find((x) => nu(x.libelle) === cleValeur);
        return val ? valeurIdParCle.get(`${choixFinition.cle}${SEP}${val.libelle}`) : null;
      }).filter(Boolean);
      if (ids.length === tuple.length) {
        await prisma.exclusionFinition.create({ data: { vitrineId: p.id, valeurs: ids } });
      }
    }

    n += 1;
    if (n % 50 === 0) console.log(`   ${n} / ${plans.length} produits`);
  }
  console.log(`   ${n} produits migrés`);

  titre("CONTRÔLE EN BASE");
  const [cChoix, cVal, cComb, cVis, cSuf, cLien, cModele, cExcl] = await Promise.all([
    prisma.choix.count(), prisma.valeurChoix.count(),
    prisma.combinaison.count(), prisma.visuel.count(),
    prisma.valeurChoix.count({ where: { suffixeReference: { not: null } } }),
    prisma.visuelValeur.count(),
    prisma.valeurChoix.count({ where: { modeleId: { not: null } } }),
    prisma.exclusionFinition.count(),
  ]);
  console.log(`   choix ${cChoix} · valeurs ${cVal} · combinaisons ${cComb} · visuels ${cVis}`);
  console.log(`   valeurs portant un suffixe de référence  ${String(cSuf).padStart(5)}`);
  console.log(`   valeurs reliées à un modèle de nuancier  ${String(cModele).padStart(5)}`);
  console.log(`   rattachements visuel ↔ valeur            ${String(cLien).padStart(5)}`);
  console.log(`   associations de finitions exclues        ${String(cExcl).padStart(5)}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
