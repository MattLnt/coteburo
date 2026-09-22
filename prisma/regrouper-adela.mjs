// Regroupe les vingt-quatre fiches Adela en quatre.
//
//   node prisma/regrouper-adela.mjs
//   node prisma/regrouper-adela.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Même cause qu'Adio : le tarif Sokoa étale la gamme sur quatre pages
//   (102 à 105), une colonne par version, et l'import a fait une fiche par
//   colonne. Douze des vingt-quatre fiches n'ont aucune photo alors que leur
//   jumelle en a : regroupées, elles héritent des siennes.
//
// LA RÉFÉRENCE, TELLE QUE LE TARIF L'ÉCRIT
//   « ALA0/4 + coloris* », page 105 :
//
//     AL    la gamme
//     A     quatre pieds      E  traineau     G  tabouret    J  giratoire
//     B     idem, assise      F               H              K
//           tapissée
//     0     chaise, sans accotoirs      1  fauteuil, avec accotoirs
//     /4    piétement fixe              /5  base giratoire
//     N     version assise et dossier tapissés ; « + » = coloris à préciser
//
//   Les quatre coloris sont nommés page 105 : « noir (1), blanc (2),
//   gris (3) et bordeaux (8) ». Ils ne figurent PAS dans la référence : le
//   tarif écrit « + coloris* à préciser à la commande ». Ils deviennent donc
//   une question de finition, sans jeton de référence, et non une question
//   tarifaire qui inventerait des codes.
//
// DEUX DÉFAUTS DU CATALOGUE, REPORTÉS SANS ÊTRE CORRIGÉS
//   1. Pages 103 et 104 impriment la MÊME référence — ALB0/4 + — pour la
//      version dos résille (216 €) et la version dos polypropylène (177 €).
//      La fiche regroupée porte les deux prix, et le dit en clair.
//   2. Page 102 imprime « ALJO/5N », avec un O au lieu d'un zéro ; page 105
//      écrit bien « ALJ0/5 ». On lit donc O comme un zéro pour savoir s'il y a
//      des accotoirs, mais on garde la référence telle qu'elle est imprimée :
//      ce n'est pas à nous de réécrire le tarif du fournisseur.
//
// CE QUI SE PERD, ASSUMÉ
//   Les dimensions varient d'un demi-centimètre selon le garnissage. La fiche
//   regroupée porte l'intervalle observé, jamais une valeur choisie.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Adela";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Ce que le tarif écrit lui-même, page 105 et page 205 ──────────────
const CORPS = { A: "4 pieds", B: "4 pieds", E: "traineau", F: "traineau", G: "tabouret", H: "tabouret", J: "giratoire", K: "giratoire" };
// Les lettres A, E, G, J portent le corps nu ; B, F, H, K l'assise tapissée.
const ASSISE_TAPISSEE = new Set(["B", "F", "H", "K"]);

const PRODUIT = {
  "4 pieds": "Chaise et fauteuil 4 pieds - Adela",
  traineau: "Chaise et fauteuil pieds traineau - Adela",
  tabouret: "Tabouret pieds traineau - Adela",
  giratoire: "Siège giratoire - Adela",
};
const PIETEMENT = {
  "4 pieds": "Quatre pieds métal, finition chromée ou époxy",
  traineau: "Piétement traineau métal, finition chromée ou époxy",
  tabouret: "Piétement traineau métal, finition chromée ou époxy, hauteur tabouret",
  giratoire: "Base giratoire aluminium poli, roulettes ø 50 mm",
};
const DESCRIPTIF = {
  "4 pieds": "<p>L'Adela sur quatre pieds métal : une chaise polyvalente empilable grande hauteur, dans quatre garnissages du tout polypropylène à l'assise et au dossier tapissés, avec ou sans accotoirs.</p>",
  traineau: "<p>L'Adela sur piétement traineau. Le traîneau glisse sur la moquette et accepte la tablette écritoire amovible et la barre inter-rangées — de quoi équiper une salle de formation. Quatre garnissages, avec ou sans accotoirs.</p>",
  tabouret: "<p>La version tabouret de l'Adela, sur piétement traineau, assise à 75 cm. Pour les comptoirs d'accueil et les tables hautes. Quatre garnissages, du tout polypropylène à l'assise et au dossier tapissés.</p>",
  giratoire: "<p>La version giratoire de l'Adela, sur base aluminium poli et roulettes ø 50 mm pour moquette. Elle complète la gamme pour les postes où l'on reste assis, dans les quatre garnissages et avec ou sans accotoirs.</p>",
};

const GARNISSAGE = {
  PP: "Tout polypropylène",
  TAPISSE: "Assise et dossier tapissés",
  ASSISE_PP: "Assise tapissée, dossier polypropylène",
  ASSISE_RESILLE: "Assise tapissée, dossier résille",
};
const ORDRE_GARNISSAGE = [GARNISSAGE.PP, GARNISSAGE.ASSISE_PP,
  GARNISSAGE.ASSISE_RESILLE, GARNISSAGE.TAPISSE];

// Page 105 : « noir (1), blanc (2), gris (3) et bordeaux (8) ».
const COLORIS = [
  { libelle: "Noir", couleur: "#0d0d0d" },        // RAL 9005
  { libelle: "Blanc", couleur: "#f4f4f0" },       // RAL 9003
  { libelle: "Gris", couleur: "#575d5e" },        // RAL 7012
  { libelle: "Bordeaux", couleur: "#7b2233" },    // NCS S5540-Y90R
];

const tissuNu = (t) => String(t || "").split(/\s+[—–-]\s+/)[0].trim();

/**
 * Décomposer une référence Adela.
 *
 * Le « O » de ALJO/5N est une coquille du tarif, page 102 : page 105 écrit
 * ALJ0/5. On le lit comme un zéro pour savoir s'il y a des accotoirs, sans
 * toucher à la référence elle-même.
 */
function lireReference(ref) {
  const brut = String(ref || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = /^AL([ABEFGHJK])([01O])\/([45])(N?)\+?$/.exec(brut);
  if (!m) return null;
  const [, lettre, chiffre, base, tapisse] = m;
  return {
    lettre,
    corps: CORPS[lettre],
    accotoirs: chiffre === "1" ? "Avec accotoirs" : "Sans accotoirs",
    coquille: chiffre === "O",
    base,                    // 4 = piétement fixe, 5 = base giratoire
    tapisse: tapisse === "N",
  };
}

/** Le garnissage que la référence impose, quand elle le dit. */
function garnissageDeLaReference(r) {
  if (!ASSISE_TAPISSEE.has(r.lettre)) return r.tapisse ? GARNISSAGE.TAPISSE : GARNISSAGE.PP;
  return null;   // B, F, H, K : le tarif imprime la même référence pour deux dos
}

/** Le garnissage que le nom de la fiche annonce. */
function garnissageDuNom(k) {
  if (/assise tapissee et dos resille|dos resille/.test(k)) return GARNISSAGE.ASSISE_RESILLE;
  if (/assise tapissee et dos pp|assise tapissee dos et accotoirs pp|assise tapissee dos pp/.test(k)) return GARNISSAGE.ASSISE_PP;
  if (/assise et dos tapisses/.test(k)) return GARNISSAGE.TAPISSE;
  if (/assise et dos pp|assise dos et accotoirs pp/.test(k)) return GARNISSAGE.PP;
  return null;
}

function dimensionsDe(sections) {
  const s = (Array.isArray(sections) ? sections : []).find((x) => /dimension/i.test(x?.titre || ""));
  if (!s) return null;
  const txt = String(s.contenu).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const out = {};
  for (const m of txt.matchAll(/(Hauteur d'assise|Hauteur|Largeur|Profondeur)\s*:\s*(?:de\s*)?([\d.,]+)(?:\s*à\s*([\d.,]+))?/gi)) {
    const a = parseFloat(m[2].replace(",", "."));
    const b = m[3] ? parseFloat(m[3].replace(",", ".")) : a;
    const cle = /^hauteur d/i.test(m[1]) ? "Hauteur d'assise" : m[1];
    out[cle] = out[cle] ? [Math.min(out[cle][0], a), Math.max(out[cle][1], b)] : [a, b];
  }
  return Object.keys(out).length ? out : null;
}

function fusionnerDimensions(liste) {
  const out = {};
  for (const d of liste.filter(Boolean)) {
    for (const [k, v] of Object.entries(d)) {
      out[k] = out[k] ? [Math.min(out[k][0], v[0]), Math.max(out[k][1], v[1])] : [v[0], v[1]];
    }
  }
  const nb = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
  const lignes = ["Hauteur", "Largeur", "Profondeur", "Hauteur d'assise"]
    .filter((k) => out[k])
    .map((k) => `<li>${k} : ${out[k][0] === out[k][1] ? `${nb(out[k][0])} cm` : `de ${nb(out[k][0])} à ${nb(out[k][1])} cm`}</li>`);
  return lignes.length ? `<ul>${lignes.join("")}</ul>` : null;
}

const FINITIONS_TEXTE = "<p>Quatre coloris de polypropylène : noir, blanc, gris et bordeaux. Coques et accotoirs assortis au coloris choisi. Nuancier page 205 du catalogue Sokoa.</p><p>Le coloris est à préciser à la commande : le tarif ne lui donne pas de code de référence.</p>";
const AVERTISSEMENT = "<p><strong>Attention à la commande.</strong> Le catalogue Sokoa imprime la même référence pour la version à dossier résille et celle à dossier polypropylène, à deux prix différents. La version doit être précisée en clair sur la commande.</p>";
const OPTIONS_TEXTE = {
  "4 pieds": "<p>Polypropylène noir ignifugé M2 en option sur la version tout PP. Chariot de transport et diable disponibles — nous consulter.</p>",
  traineau: "<p>Tablette écritoire amovible, système d'accroche d'alignement et barre inter-rangées disponibles sur cette version. Polypropylène noir ignifugé M2 en option sur la version tout PP.</p>",
  tabouret: "<p>Polypropylène noir ignifugé M2 en option sur la version tout PP. Chariot de transport disponible — nous consulter.</p>",
  giratoire: "<p>Polypropylène noir ignifugé M2 en option sur la version tout PP.</p>",
};

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, sectionsDevis: true,
          visuels: { select: { id: true } },
          choix: { orderBy: { ordre: "asc" }, select: { cle: true, nom: true, nature: true } },
          combinaisons: {
            select: {
              valeurs: true, prixTarifHT: true, ecoContribution: true, poids: true,
              ean: true, referenceBase: true, pageCatalogue: true, ancienId: true,
            },
          },
        },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  const refuses = [];
  const coquilles = new Set();
  const groupes = new Map();
  let combinaisonsLues = 0;

  for (const v of gamme.vitrines) {
    const k = nu(v.nom);
    const refs = v.combinaisons.map((c) => lireReference(c.referenceBase));
    if (!refs.length || refs.some((r) => !r)) {
      refuses.push(`${v.nom} — référence hors forme AL?0/4`);
      continue;
    }
    const corpsVus = [...new Set(refs.map((r) => r.corps))];
    if (corpsVus.length !== 1) { refuses.push(`${v.nom} — plusieurs piétements dans une fiche`); continue; }
    const corps = corpsVus[0];

    let garnissage = garnissageDeLaReference(refs[0]);
    const duNom = garnissageDuNom(k);
    if (garnissage) {
      if (duNom && duNom !== garnissage) {
        refuses.push(`${v.nom} — le nom dit « ${duNom} », la référence « ${garnissage} »`);
        continue;
      }
    } else if (duNom) {
      garnissage = duNom;   // B, F, H, K : seul le nom distingue les deux dos
    } else {
      refuses.push(`${v.nom} — garnissage illisible, ni dans la référence ni dans le nom`);
      continue;
    }

    const nom = PRODUIT[corps];
    if (!groupes.has(nom)) {
      groupes.set(nom, { nom, corps, fiches: [], combinaisons: [], collisions: [], vues: new Map() });
    }
    const grp = groupes.get(nom);
    grp.fiches.push(v);

    const cleTissu = v.choix.find((c) => c.nature === "tarifaire" && /tissu/i.test(c.nom))?.cle
      || v.choix.find((c) => c.nature === "tarifaire" && /^finition$/i.test(c.nom))?.cle
      || null;

    for (const c of v.combinaisons) {
      combinaisonsLues += 1;
      const r = lireReference(c.referenceBase);
      if (r.coquille) coquilles.add(String(c.referenceBase).trim());
      const valeurs = { garnissage, accotoirs: r.accotoirs };
      const t = cleTissu ? tissuNu(c.valeurs?.[cleTissu]) : null;
      if (t) valeurs.tissu = t;

      const empreinte = empreinteDe(valeurs);
      if (grp.vues.has(empreinte)) {
        grp.collisions.push({ a: grp.vues.get(empreinte), b: `${c.referenceBase} (${c.prixTarifHT} €)`, valeurs });
        continue;
      }
      grp.vues.set(empreinte, `${c.referenceBase} (${c.prixTarifHT} €)`);
      grp.combinaisons.push({
        valeurs, empreinte,
        prixTarifHT: c.prixTarifHT, ecoContribution: c.ecoContribution, poids: c.poids,
        ean: c.ean, referenceBase: c.referenceBase, pageCatalogue: c.pageCatalogue,
        ancienId: c.ancienId,
      });
    }
  }

  const QUESTIONS = [
    { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
    { cle: "accotoirs", nom: "Accotoirs", ordonne: ["Sans accotoirs", "Avec accotoirs"] },
    { cle: "tissu", nom: "Tissu", ordonne: null },
  ];
  const valeursDe = (grp, q) => {
    const vues = [...new Set(grp.combinaisons.map((c) => c.valeurs[q.cle]).filter(Boolean))];
    if (!q.ordonne) return vues.sort();
    return q.ordonne.filter((x) => vues.includes(x)).concat(vues.filter((x) => !q.ordonne.includes(x)));
  };

  for (const grp of groupes.values()) {
    grp.cible = [...grp.fiches].sort((a, b) => b.visuels.length - a.visuels.length)[0];
    grp.dimensions = fusionnerDimensions(grp.fiches.map((f) => dimensionsDe(f.sectionsDevis)));
    grp.visuels = grp.fiches.reduce((n, f) => n + f.visuels.length, 0);
  }

  titre("LES FICHES QU'ON OBTIENDRAIT");
  for (const grp of groupes.values()) {
    const prix = grp.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
    console.log(`\n   ${grp.nom}`);
    console.log(`      remplace ${grp.fiches.length} fiches · reprend celle de « ${grp.cible.nom.replace(" - Adela", "").slice(0, 44)} »`);
    console.log("      ──");
    for (const q of QUESTIONS) {
      const vals = valeursDe(grp, q);
      if (vals.length < 2) continue;
      console.log(`      ${q.nom.padEnd(22)} ${vals.join(" · ")}`);
    }
    console.log(`      ${"Coloris".padEnd(22)} ${COLORIS.map((c) => c.libelle).join(" · ")}   (finition, sans code)`);
    console.log("      ──");
    console.log(`      ${grp.combinaisons.length} variantes · ${Math.min(...prix)} à ${Math.max(...prix)} € HT`);
    console.log(`      ${grp.visuels} visuels repris`);
    if (grp.dimensions) console.log(`      ${grp.dimensions.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
  }

  if (coquilles.size) {
    titre("COQUILLES DU TARIF, CONSERVÉES TELLES QUELLES");
    console.log("");
    for (const r of coquilles) console.log(`   ${r}   ← un O au lieu d'un zéro (page 102 ; page 105 écrit ALJ0/5)`);
    console.log("\n   Lue comme un zéro pour les accotoirs, la référence reste imprimée");
    console.log("   telle quelle : réécrire le tarif d'un fournisseur ne nous appartient pas.");
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  const collisions = [...groupes.values()].flatMap((g) => g.collisions);
  if (collisions.length) {
    titre("DEUX PRIX POUR UNE MÊME CONFIGURATION — RIEN NE SERA ÉCRIT");
    console.log("\n   Une information a été perdue en chemin.\n");
    for (const c of collisions.slice(0, 12)) {
      console.log(`   ${c.a}  ≠  ${c.b}`);
      console.log(`      ${JSON.stringify(c.valeurs)}`);
    }
    if (collisions.length > 12) console.log(`   … et ${collisions.length - 12} autres`);
    process.exitCode = 1;
    return;
  }

  const ecrites = [...groupes.values()].reduce((n, g) => n + g.combinaisons.length, 0);
  const perdues = combinaisonsLues - ecrites;
  titre("LE COMPTE");
  console.log(`
   variantes lues ....................... ${combinaisonsLues}
   variantes conservées ................. ${ecrites}
   variantes perdues .................... ${perdues}`);
  if (perdues !== 0) {
    console.log("\n   Une variante perdue est un prix qui disparaît du catalogue.");
    console.log("   Rien ne sera écrit.");
    process.exitCode = 1;
    return;
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const grp of groupes.values()) {
    const cible = grp.cible;
    const autres = grp.fiches.filter((v) => v.id !== cible.id);

    const garnissages = ORDRE_GARNISSAGE
      .filter((g) => grp.combinaisons.some((c) => c.valeurs.garnissage === g));
    const deuxDos = garnissages.includes(GARNISSAGE.ASSISE_PP)
      && garnissages.includes(GARNISSAGE.ASSISE_RESILLE);
    const sections = [
      { titre: "Assise et dossier", contenu: `<ul>${garnissages.map((g) => `<li>${g}</li>`).join("")}</ul>` },
      { titre: "Piétement", contenu: `<p>${PIETEMENT[grp.corps]}</p>` },
      { titre: "Finitions", contenu: FINITIONS_TEXTE },
      { titre: "Empilabilité", contenu: "<p>Empilable grande hauteur.</p>" },
      ...(grp.dimensions ? [{ titre: "Dimensions", contenu: grp.dimensions }] : []),
      { titre: "Bon à savoir", contenu: (deuxDos ? AVERTISSEMENT : "") + OPTIONS_TEXTE[grp.corps] },
    ];

    await prisma.produitVitrine.update({
      where: { id: cible.id },
      data: {
        nom: grp.nom, slug: slug(grp.nom), publie: true,
        descriptif: DESCRIPTIF[grp.corps], sectionsDevis: sections,
      },
    });
    await prisma.choix.deleteMany({ where: { vitrineId: cible.id } });
    await prisma.combinaison.deleteMany({ where: { vitrineId: cible.id } });

    let ordre = 0;
    for (const q of QUESTIONS) {
      const vals = valeursDe(grp, q);
      if (vals.length < 2) continue;
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: cible.id, cle: q.cle, nom: q.nom,
          nature: "tarifaire", rendu: "boutons", ordre, origine: "editorial",
          valeurs: { create: vals.map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    }
    // Les quatre coloris : le tarif ne leur donne pas de code, ils ne changent
    // pas le prix, et ils sont à préciser à la commande.
    ordre += 1;
    await prisma.choix.create({
      data: {
        vitrineId: cible.id, cle: "coloris", nom: "Coloris polypropylène",
        nature: "finition", rendu: "pastilles", ordre, origine: "tarif",
        valeurs: {
          create: COLORIS.map((c, i) => ({
            libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "",
          })),
        },
      },
    });

    await prisma.combinaison.createMany({
      data: grp.combinaisons.map((c) => ({ ...c, vitrineId: cible.id })),
    });

    let rang = cible.visuels.length;
    for (const v of autres) {
      for (const img of v.visuels) {
        rang += 1;
        await prisma.visuel.update({ where: { id: img.id }, data: { vitrineId: cible.id, ordre: rang } });
      }
    }
    await prisma.produitVitrine.updateMany({
      where: { id: { in: autres.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });

    console.log(`   ${grp.nom}`);
    console.log(`      ${grp.combinaisons.length} variantes · ${autres.length} fiches dépubliées · ${grp.visuels} visuels`);
  }

  titre("CONTRÔLE");
  const publiees = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  const sansPrix = await prisma.combinaison.count({
    where: { vitrine: { gamme: { nom: GAMME }, publie: true }, prixTarifHT: null },
  });
  const sansVisuel = await prisma.produitVitrine.count({
    where: { gamme: { nom: GAMME }, publie: true, visuels: { none: {} } },
  });
  console.log(`   fiches publiées : ${publiees} · variantes : ${comb} · sans prix : ${sansPrix} · sans visuel : ${sansVisuel}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
