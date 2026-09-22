// Regroupe les vingt fiches Adio en trois.
//
//   node prisma/regrouper-adio.mjs
//   node prisma/regrouper-adio.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Adio est une gamme, pas vingt produits : trois piétements, quatre
//   garnissages, cinq coloris, quatre tissus. Le tarif Sokoa la présente ainsi
//   sur quatre pages ; l'import en a fait une fiche par colonne.
//
//   Aucune des vingt fiches n'a de photo. Trois fiches à photographier au lieu
//   de vingt, c'est aussi une demande tenable à faire au fournisseur.
//
// CE QUI N'EST PAS DEVINÉ — TOUT SE LIT DANS LA RÉFÉRENCE
//   Le tarif nomme lui-même ses codes, page 68 : « Noir / Noir (1),
//   Gris / Blanc (2), Vert foncé / clair (5), Bleu foncé / clair (4) et
//   Taupe foncé / clair (7) » ; page 70, les mêmes accords en lettres :
//   « (N), (B), (V), (L), (T) ». La référence AOA0/11 se lit donc :
//
//     AO    la gamme
//     A     quatre pieds       E  luge       J  giratoire
//     B     quatre pieds,      F  luge,      K  giratoire,
//           assise tapissée       assise t.     assise tapissée
//     0     sans accotoirs     1  avec accotoirs   (+27 € partout, vérifié)
//     /11   premier caractère = l'accord de coloris ;
//           second = un chiffre (version PP) ou une lettre (version tapissée)
//
//   Le garnissage se déduit donc du couple (lettre, alphabet du suffixe), et le
//   script REFUSE une fiche dont le nom dit autre chose que sa référence.
//
// LA FICHE MAL TITRÉE
//   « Finition taupe foncé / clair - Adio » n'est pas un produit : l'import a
//   pris le dernier libellé de colonne de la page 70 pour un nom. Ses
//   références et ses prix sont ceux du « Siège giratoire, assise et dossier
//   tapissés » — AOJ0/1 à 305 € en tissu C. Le script ne la requalifie que si
//   ce prix est bien celui-là ; sinon il la laisse et dit pourquoi.
//
// CE QUI SE PERD, ASSUMÉ
//   Les dimensions diffèrent de quelques millimètres d'une version à l'autre.
//   Une fiche regroupée ne peut en porter qu'une : on écrit l'intervalle
//   réellement observé, jamais une valeur choisie au hasard.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Adio";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Ce que le tarif écrit lui-même ────────────────────────────────────
const ACCORDS = {
  1: "Noir / Noir", N: "Noir / Noir",
  G: "Gris / Blanc", B: "Gris / Blanc",
  V: "Vert foncé / clair",
  L: "Bleu foncé / clair",
  T: "Taupe foncé / clair",
};
// L'ordre d'affichage des accords : celui de la page 68.
const ORDRE_ACCORDS = ["Noir / Noir", "Gris / Blanc", "Vert foncé / clair",
  "Bleu foncé / clair", "Taupe foncé / clair"];

const FAMILLES = { A: "4 pieds", B: "4 pieds", E: "luge", F: "luge", J: "giratoire", K: "giratoire" };
const PRODUIT = {
  "4 pieds": "Chaise et fauteuil 4 pieds - Adio",
  luge: "Chaise et fauteuil luge - Adio",
  giratoire: "Siège giratoire - Adio",
};
const PIETEMENT = {
  "4 pieds": "Quatre pieds métal, empilable par six",
  luge: "Piétement luge métal, empilable par six",
  giratoire: "Base giratoire, lift, roulettes ø 65 mm sol dur",
};

const GARNISSAGE = {
  PP: "Tout polypropylène",
  TAPISSE: "Assise et dossier tapissés",
  ASSISE_PP: "Assise tapissée, dossier polypropylène",
  ASSISE_RESILLE: "Assise tapissée, dossier résille Runner",
};
const ORDRE_GARNISSAGE = [GARNISSAGE.PP, GARNISSAGE.ASSISE_PP,
  GARNISSAGE.ASSISE_RESILLE, GARNISSAGE.TAPISSE];

/** Décomposer une référence Adio. Rend null si elle n'a pas la forme attendue. */
function lireReference(ref) {
  const m = /^AO([ABEFJK])([01])\/([0-9A-Z]{1,2})\+?$/.exec(String(ref || "").trim().toUpperCase());
  if (!m) return null;
  const [, lettre, chiffre, suffixe] = m;
  return {
    lettre,
    famille: FAMILLES[lettre],
    accotoirs: chiffre === "1" ? "Avec accotoirs" : "Sans accotoirs",
    suffixe,
    // « 11 » : chiffre en second → version PP. « 1N » : lettre → tapissée.
    alphabet: /^[0-9]$/.test(suffixe[1] || "") ? "chiffres"
      : /^[A-Z]$/.test(suffixe[1] || "") ? "lettres" : "giratoire",
    accord: ACCORDS[suffixe[0]] || null,
  };
}

/** Le garnissage que la référence impose, pour les piétements fixes. */
function garnissageDeLaReference(r) {
  if (r.famille === "giratoire") return null;   // la référence ne le dit pas
  const tapisse = r.alphabet === "lettres";
  if (r.lettre === "A" || r.lettre === "E") return tapisse ? GARNISSAGE.TAPISSE : GARNISSAGE.PP;
  return tapisse ? GARNISSAGE.ASSISE_RESILLE : GARNISSAGE.ASSISE_PP;
}

/** Le garnissage que le nom de la fiche annonce. */
function garnissageDuNom(k) {
  if (/assise et dos pp/.test(k)) return GARNISSAGE.PP;
  if (/assise et dossier tapisses/.test(k)) return GARNISSAGE.TAPISSE;
  if (/assise tapissee dos pp/.test(k)) return GARNISSAGE.ASSISE_PP;
  if (/assise tapissee et dossier resille/.test(k)) return GARNISSAGE.ASSISE_RESILLE;
  return null;
}

// Le tarif écrit « Tissu C — Spazio exclu » : la restriction dépend du siège et
// sera portée par la combinaison, pas par le libellé.
const tissuNu = (t) => String(t || "").split(/\s+[—–-]\s+/)[0].trim();

// Le giratoire blanc coûte quarante euros de plus : c'est un vrai choix.
const BASE = { 1: "Base et roulettes noires", 7: "Base et roulettes blanches" };

/** Les dimensions d'une fiche, pour en faire un intervalle. */
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

// Le descriptif de chaque fiche d'origine ne valait que pour sa version : « la
// version la plus simple », « sans accotoirs ». Regroupée, la fiche couvre les
// quatre garnissages : on réécrit, sinon elle mentirait dès la première ligne.
const DESCRIPTIF = {
  "4 pieds": "<p>L'Adio sur quatre pieds métal, la version qu'on empile par six dans une salle polyvalente ou une salle de formation. Quatre garnissages du tout polypropylène à l'assise et au dossier tapissés, et cinq accords de coloris polypropylène et métal.</p>",
  luge: "<p>L'Adio sur piétement luge. Le traîneau glisse sur la moquette au lieu de l'accrocher et donne un léger effet de bascule — deux raisons de le préférer aux quatre pieds en salle de réunion. Empilable par six, dans les quatre garnissages et les cinq coloris de la gamme.</p>",
  giratoire: "<p>La version giratoire de l'Adio : lift et roulettes ø 65 mm pour sol dur, sur base noire ou blanche. Elle complète la collection pour les postes où l'on reste assis plus d'une réunion, dans les quatre garnissages et les cinq coloris de la gamme.</p>",
};

const FINITIONS_TEXTE = "<p>Cinq accords polypropylène et métal : noir / noir, gris / blanc, vert foncé / clair, taupe foncé / clair, bleu foncé / clair.</p><p>Les teintes métal, accotoirs, coque sous assise et liaison assise-dos sont foncées ; le dos et le dessus d'assise sont clairs. Nuancier page 205 du catalogue Sokoa.</p>";
const OPTIONS_TEXTE = "<p>Le coloris polypropylène et métal est à préciser à la commande. Tablette écritoire rabattable, accroches d'alignement, patins et chariots de transport disponibles en option — nous consulter.</p>";

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
  const groupes = new Map();
  let combinaisonsLues = 0;

  for (const v of gamme.vitrines) {
    const k = nu(v.nom);
    const refs = v.combinaisons.map((c) => lireReference(c.referenceBase));
    if (!refs.length || refs.some((r) => !r)) {
      refuses.push(`${v.nom} — référence hors forme AO?0/??`);
      continue;
    }
    const familles = [...new Set(refs.map((r) => r.famille))];
    if (familles.length !== 1) { refuses.push(`${v.nom} — plusieurs piétements dans une fiche`); continue; }
    const famille = familles[0];

    // Le garnissage : de la référence quand elle le dit, du nom sinon.
    let garnissage = garnissageDeLaReference(refs[0]);
    const duNom = garnissageDuNom(k);
    if (garnissage) {
      if (duNom && duNom !== garnissage) {
        refuses.push(`${v.nom} — le nom dit « ${duNom} », la référence « ${garnissage} »`);
        continue;
      }
    } else if (duNom) {
      garnissage = duNom;
    } else {
      // Fiche mal titrée : on ne la requalifie que si son prix la désigne.
      const temoin = v.combinaisons.find((c) => /^AOJ0\/1/.test(String(c.referenceBase))
        && tissuNu(c.valeurs?.finition) === "Tissu C");
      if (temoin && temoin.prixTarifHT === 305) {
        garnissage = GARNISSAGE.TAPISSE;   // page 70, colonne « giratoire tapissé »
      } else {
        refuses.push(`${v.nom} — garnissage illisible, et le prix témoin ne répond pas (305 € attendu en tissu C, lu ${temoin?.prixTarifHT ?? "rien"})`);
        continue;
      }
    }

    const nom = PRODUIT[famille];
    if (!groupes.has(nom)) {
      groupes.set(nom, { nom, famille, fiches: [], combinaisons: [], collisions: [], vues: new Map() });
    }
    const grp = groupes.get(nom);
    grp.fiches.push(v);

    const cleTissu = v.choix.find((c) => c.nature === "tarifaire" && /finition|tissu/i.test(c.nom))?.cle || null;

    for (const c of v.combinaisons) {
      combinaisonsLues += 1;
      const r = lireReference(c.referenceBase);
      const valeurs = { garnissage, accotoirs: r.accotoirs };
      if (famille === "giratoire") {
        const b = BASE[r.suffixe[0]];
        if (!b) { refuses.push(`${v.nom} — base inconnue dans ${c.referenceBase}`); continue; }
        valeurs.base = b;
      } else {
        if (!r.accord) { refuses.push(`${v.nom} — accord inconnu dans ${c.referenceBase}`); continue; }
        valeurs.coloris = r.accord;
      }
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

  // Les questions de chaque fiche, dans l'ordre où on les pose.
  const questionsDe = (grp) => [
    { cle: "garnissage", nom: "Assise et dossier", ordonne: ORDRE_GARNISSAGE },
    { cle: "accotoirs", nom: "Accotoirs", ordonne: ["Sans accotoirs", "Avec accotoirs"] },
    ...(grp.famille === "giratoire"
      ? [{ cle: "base", nom: "Base et roulettes", ordonne: ["Base et roulettes noires", "Base et roulettes blanches"] }]
      : [{ cle: "coloris", nom: "Coloris polypropylène et métal", ordonne: ORDRE_ACCORDS }]),
    { cle: "tissu", nom: "Tissu", ordonne: null },
  ];

  const valeursDe = (grp, q) => {
    const vues = [...new Set(grp.combinaisons.map((c) => c.valeurs[q.cle]).filter(Boolean))];
    if (!q.ordonne) return vues.sort();
    return q.ordonne.filter((x) => vues.includes(x)).concat(vues.filter((x) => !q.ordonne.includes(x)));
  };

  for (const grp of groupes.values()) {
    // La fiche d'accueil : la mieux illustrée, à défaut la première.
    grp.cible = [...grp.fiches].sort((a, b) => b.visuels.length - a.visuels.length)[0];
    grp.dimensions = fusionnerDimensions(grp.fiches.map((f) => dimensionsDe(f.sectionsDevis)));
  }

  titre("LES FICHES QU'ON OBTIENDRAIT");
  for (const grp of groupes.values()) {
    const prix = grp.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
    console.log(`\n   ${grp.nom}`);
    console.log(`      remplace ${grp.fiches.length} fiches · reprend celle de « ${grp.cible.nom.replace(" - Adio", "")} »`);
    console.log("      ──");
    for (const q of questionsDe(grp)) {
      const vals = valeursDe(grp, q);
      if (vals.length < 2) continue;
      console.log(`      ${q.nom.padEnd(30)} ${vals.join(" · ")}`);
    }
    console.log("      ──");
    console.log(`      ${grp.combinaisons.length} variantes · ${Math.min(...prix)} à ${Math.max(...prix)} € HT`);
    if (grp.dimensions) console.log(`      ${grp.dimensions.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
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
    const sections = [
      { titre: "Assise et dossier", contenu: `<ul>${garnissages.map((g) => `<li>${g}</li>`).join("")}</ul>` },
      { titre: "Piétement", contenu: `<p>${PIETEMENT[grp.famille]}</p>` },
      { titre: "Finitions", contenu: FINITIONS_TEXTE },
      ...(grp.dimensions ? [{ titre: "Dimensions", contenu: grp.dimensions }] : []),
      { titre: "Bon à savoir", contenu: OPTIONS_TEXTE },
    ];

    await prisma.produitVitrine.update({
      where: { id: cible.id },
      data: {
        nom: grp.nom, slug: slug(grp.nom), publie: true,
        descriptif: DESCRIPTIF[grp.famille], sectionsDevis: sections,
      },
    });
    await prisma.choix.deleteMany({ where: { vitrineId: cible.id } });
    await prisma.combinaison.deleteMany({ where: { vitrineId: cible.id } });

    let ordre = 0;
    for (const q of questionsDe(grp)) {
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
    // Le giratoire garde les cinq accords : ils ne bougent pas son prix, et sa
    // référence se complète à la commande. C'est ce qu'écrit le tarif.
    if (grp.famille === "giratoire") {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: cible.id, cle: "coloris", nom: "Coloris polypropylène et métal",
          nature: "finition", rendu: "pastilles", ordre, origine: "tarif",
          valeurs: { create: ORDRE_ACCORDS.map((libelle, i) => ({ libelle, ordre: i, suffixeReference: "" })) },
        },
      });
    }

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
    // Les fiches remplacées sortent du catalogue sans être détruites.
    await prisma.produitVitrine.updateMany({
      where: { id: { in: autres.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });

    console.log(`   ${grp.nom}`);
    console.log(`      ${grp.combinaisons.length} variantes · ${autres.length} fiches dépubliées`);
  }

  titre("CONTRÔLE");
  const publiees = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  const sansPrix = await prisma.combinaison.count({
    where: { vitrine: { gamme: { nom: GAMME }, publie: true }, prixTarifHT: null },
  });
  console.log(`   fiches publiées : ${publiees} · variantes : ${comb} · sans prix : ${sansPrix}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
