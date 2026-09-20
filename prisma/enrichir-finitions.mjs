// Rend aux finitions leurs couleurs et leurs groupes.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/enrichir-finitions.mjs --apercu="Bureau plan droit - Astrolite"
//   node prisma/enrichir-finitions.mjs
//   node prisma/enrichir-finitions.mjs --appliquer
//
// CE QUE LA PURGE A FAIT PERDRE
//   L'ancienne base avait été enrichie à la main dans l'admin : les libellés
//   composites du tarif y étaient éclatés en groupes nommés — « Plateau »,
//   « Piétement métal », « Poignées » — et mille quatre-vingt-quatorze
//   finitions portaient leur couleur. Le classeur ne contient rien de tout
//   cela : il ne donne que le libellé brut. D'où des pastilles toutes grises,
//   FicheProduit les dessinant avec « couleur || #e8e3da ».
//
// TROIS RÉPARATIONS
//
//   1. LES COULEURS. La sauvegarde d'avant-purge donne la couleur de cent
//      trente-six teintes — BLANC, NOIR, CHÊNE FIL, TIMBER. On les applique
//      par correspondance de nom, en retirant au besoin le suffixe de
//      matière : « VERT EAU TISSU » est du vert d'eau.
//
//   2. LES GROUPES BURONOMIC. Le libellé « NOIR METAL / NEBRASKA / VERT EAU
//      - VERT EAU » décrit quatre parties. On ne devine pas leur rôle par
//      leur position : le SUFFIXE le donne — METAL, TISSU, PLASTIQUE — et le
//      tiret porte un mot de rôle — POIGNEES, SERRURE, MEUBLE. Là où ni l'un
//      ni l'autre ne parle, on s'appuie sur la correspondance établie avec
//      l'ancienne base : « ALUMINIUM / HETRE » y était « Piétement métal »
//      puis « Plateau ».
//
//      Les parties ne remplacent pas la valeur de l'axe — elles s'y
//      accrochent. La valeur composite reste la clé du prix ; ses parties
//      deviennent les pastilles que « finitionsParValeur » affiche, groupées
//      par « paletteNom ». Éclater l'axe lui-même aurait cassé le
//      rattachement au tarif.
//
//   3. LES VINGT-SIX FICHES RESCAPÉES. Vingt-six fiches enrichies portent
//      encore le même nom qu'avant la purge : on leur rend leurs groupes
//      d'origine, deux cent soixante-cinq finitions dont deux cent
//      cinquante-six colorées. Les autres ont été renommées par la
//      rationalisation 2026 et ne se retrouvent plus.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const APERCU = (process.argv.find((a) => a.startsWith("--apercu=")) || "").slice(9) || null;
const SAUVEGARDE = "prisma/sauvegardes/catalogue-avant-purge-2026-09-19T08-20-15.json";

const titre = (t) => console.log(`\n${"═".repeat(68)}\n${t}\n${"═".repeat(68)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/['’]/g, " ").replace(/\s+/g, " ").trim();

// Les suffixes qui nomment la matière d'une partie, et donc son rôle.
const MATIERES = [
  ["METAL", "Piétement métal"],
  ["TISSU", "Tissu"],
  ["PLASTIQUE", "Plastique"],
  ["MELAMINE", "Mélaminé"],
];
// Les mots de rôle qui ouvrent la partie écrite après le tiret.
const ROLES = [
  ["POIGNEES", "Poignées"],
  ["POIGNEE", "Poignées"],
  ["SERRURE", "Serrure"],
  ["MEUBLE", "Meuble"],
];

/** Le dictionnaire des teintes : nom normalisé → couleur, la plus fréquente. */
function dictionnaire(sauvegarde) {
  const brut = {};
  const ajoute = (f) => {
    if (!f.couleur) return;
    const k = nu(f.nom);
    brut[k] = brut[k] || {};
    brut[k][f.couleur] = (brut[k][f.couleur] || 0) + 1;
  };
  for (const v of sauvegarde.vitrines) {
    for (const g of v.groupesFinition) g.finitions.forEach(ajoute);
  }
  for (const p of sauvegarde.palettes) p.finitions.forEach(ajoute);
  const out = {};
  for (const [k, v] of Object.entries(brut)) {
    out[k] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
  }
  return out;
}

/** La couleur d'une teinte, le suffixe de matière retiré au besoin. */
function couleurDe(nom, dico) {
  const k = nu(nom);
  if (dico[k]) return dico[k];
  for (const [suffixe] of MATIERES) {
    if (k.endsWith(` ${suffixe}`)) {
      const court = k.slice(0, -suffixe.length - 1);
      if (dico[court]) return dico[court];
      // « VERT EAU » là où l'ancienne base écrivait « VERT D EAU ».
      const avecD = court.replace(/^VERT EAU$/, "VERT D EAU");
      if (dico[avecD]) return dico[avecD];
    }
  }
  const avecD = k.replace(/^VERT EAU$/, "VERT D EAU");
  return dico[avecD] || null;
}

/** Les parties d'un libellé composite, chacune avec son rôle. */
function parties(libelle, dico) {
  const [tete, queue] = libelle.split(" - ").map((s) => s.trim());
  const segments = tete.split("/").map((s) => s.trim()).filter(Boolean);
  const out = [];

  segments.forEach((seg, i) => {
    const k = nu(seg);
    let role = null;
    let valeur = seg;
    for (const [suffixe, nomRole] of MATIERES) {
      if (k.endsWith(` ${suffixe}`)) {
        role = nomRole;
        valeur = seg.slice(0, -suffixe.length - 1).trim();
        break;
      }
    }
    // Sans suffixe, la position tranche, et le vocabulaire de chaque
    // position le justifie :
    //   à deux segments — « ALUMINIUM / HETRE » était « Piétement métal »
    //     puis « Plateau » dans l'ancienne base, sur Astrolite et Partage ;
    //   à trois — la position 2 ne porte que des bois (NEBRASKA, CHENE FIL,
    //     BLANC, YUKON) et la position 3 que des teintes de textile (VERT
    //     EAU, SABLE, OCRE, BLEU PETROLE). Les confondre sous « Plateau »
    //     mettait un tissu au rang d'un plateau.
    if (!role) {
      role = segments.length === 1 ? "Finition"
        : i === 0 ? "Piétement"
          : i === 1 ? "Plateau" : "Tissu";
    }
    out.push({ nom: valeur, role, couleur: couleurDe(valeur, dico) });
  });

  if (queue) {
    const k = nu(queue);
    let role = null;
    let valeur = queue;
    for (const [mot, nomRole] of ROLES) {
      if (k.startsWith(`${mot} `)) {
        role = nomRole;
        valeur = queue.slice(mot.length).trim();
        break;
      }
    }
    // Une teinte nue après le tiret : le catalogue ne dit pas de quelle
    // pièce il s'agit. On la nomme « Complément » plutôt que d'inventer un
    // chant ou un second tissu — c'est une question pour Buronomic.
    if (!role) role = "Complément";
    out.push({ nom: valeur, role, couleur: couleurDe(valeur, dico) });
  }
  return out;
}

const estComposite = (n) => / \/ | - /.test(n);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const sauvegarde = JSON.parse(await readFile(SAUVEGARDE, "utf8"));
  const dico = dictionnaire(sauvegarde);
  console.log(`${Object.keys(dico).length} teintes au dictionnaire`);

  const palettes = await prisma.paletteFinition.findMany({ select: { nom: true } });
  const nomsPalette = new Map(palettes.map((p) => [nu(p.nom), p.nom]));

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, axesDeclinaisons: true,
      groupesFinition: { select: { id: true, finitions: { select: { id: true, nom: true } } } },
      gamme: { select: { nom: true, marque: { select: { slug: true } } } },
    },
  });

  // ── 1 et 2 : couleurs, palettes, et parties d'axe ──
  const majFinitions = [];   // { id, couleur, paletteNom }
  const majAxes = [];        // { id, axes }
  let coloriees = 0;
  let rattachees = 0;
  let avecParties = 0;

  for (const v of vitrines) {
    for (const g of v.groupesFinition) {
      for (const f of g.finitions) {
        const couleur = estComposite(f.nom) ? null : couleurDe(f.nom, dico);
        // « Tissu B+ » n'est pas une teinte mais une catégorie tarifaire :
        // elle renvoie à la palette du même nom, dont les pastilles ont été
        // recréées.
        const base = nu(f.nom).split(" — ")[0].trim();
        const palette = nomsPalette.get(nu(f.nom)) || nomsPalette.get(base) || null;
        if (couleur) coloriees += 1;
        if (palette) rattachees += 1;
        if (couleur || palette) majFinitions.push({ id: f.id, couleur, paletteNom: palette });
      }
    }

    if (v.gamme.marque.slug !== "buronomic") continue;
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    const axeFin = axes.find((a) => a.id === "finition");
    if (!axeFin || !(axeFin.valeurs || []).some(estComposite)) continue;

    const fpv = {};
    for (const valeur of axeFin.valeurs || []) {
      fpv[valeur] = parties(valeur, dico).map((p, i) => ({
        id: `${valeur}:${i}`,
        nom: p.nom,
        couleur: p.couleur,
        imageUrl: null,
        paletteNom: p.role,
      }));
    }
    majAxes.push({
      id: v.id, nom: v.nom,
      axes: axes.map((a) => (a.id === "finition" ? { ...a, finitionsParValeur: fpv } : a)),
    });
    avecParties += 1;
  }

  // ── 3 : les fiches rescapées ──
  const parNom = new Map(vitrines.map((v) => [v.nom, v]));
  const rescapees = sauvegarde.vitrines
    .filter((v) => v.groupesFinition.length && parNom.has(v.nom))
    .map((v) => ({ ancienne: v, neuve: parNom.get(v.nom) }));
  const nRescapees = rescapees.reduce(
    (n, r) => n + r.ancienne.groupesFinition.reduce((m, g) => m + g.finitions.length, 0), 0);

  titre("CE QUI SERAIT FAIT");
  console.log(`\n   finitions colorées                ${String(coloriees).padStart(5)}`);
  console.log(`   finitions rattachées à une palette ${String(rattachees).padStart(4)}`);
  console.log(`   fiches Buronomic découpées en parties ${String(avecParties).padStart(3)}`);
  console.log(`   fiches rescapées à restaurer        ${String(rescapees.length).padStart(3)}`
    + `   (${nRescapees} finitions)`);

  if (APERCU) {
    const v = vitrines.find((x) => x.nom === APERCU);
    if (!v) {
      console.log(`\n⚠ fiche « ${APERCU} » introuvable`);
    } else {
      titre(`APERÇU — ${v.nom}`);
      const maj = majAxes.find((m) => m.id === v.id);
      const axeFin = (maj?.axes || v.axesDeclinaisons || []).find((a) => a.id === "finition");
      const valeurs = (axeFin?.valeurs || []).slice(0, 4);
      console.log("\n   AVANT — un seul groupe « Finitions », pastilles grises :\n");
      for (const val of valeurs) console.log(`      ○ ${val}`);
      if (!maj) {
        console.log("\n   (cette fiche n'est pas concernée par le découpage)");
      } else {
        console.log("\n   APRÈS — la valeur reste la clé du prix, ses parties");
        console.log("   deviennent des pastilles groupées par rôle :\n");
        for (const val of valeurs) {
          console.log(`      ${val}`);
          for (const p of maj.axes.find((a) => a.id === "finition").finitionsParValeur[val]) {
            console.log(`         ${p.paletteNom.padEnd(16)} ${p.nom.padEnd(16)} `
              + `${p.couleur || "— sans couleur —"}`);
          }
        }
      }
    }
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const f of majFinitions) {
    await prisma.finition.update({
      where: { id: f.id },
      data: { couleur: f.couleur, paletteNom: f.paletteNom },
    });
    n += 1;
    if (n % 200 === 0) process.stdout.write(`\r   ${n} / ${majFinitions.length} finitions`);
  }
  console.log(`\r   ${n} finitions mises à jour`);

  for (const m of majAxes) {
    await prisma.produitVitrine.update({
      where: { id: m.id }, data: { axesDeclinaisons: m.axes },
    });
  }
  console.log(`   ${majAxes.length} fiches Buronomic découpées en parties`);

  // Les rescapées : on remplace le groupe « Finitions » par les groupes
  // d'origine, qui disent ce que le client choisit vraiment.
  let nR = 0;
  for (const { ancienne, neuve } of rescapees) {
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: neuve.id } });
    for (const [i, g] of ancienne.groupesFinition.entries()) {
      await prisma.groupeFinition.create({
        data: {
          nom: g.nom, ordre: g.ordre ?? i, vitrineId: neuve.id,
          finitions: {
            create: g.finitions.map((f, j) => ({
              nom: f.nom,
              // Les URL de l'ancienne base pointent sur un Cloudinary vidé.
              imageUrl: null,
              couleur: f.couleur ?? couleurDe(f.nom, dico),
              paletteNom: f.paletteNom ?? null,
              ordre: f.ordre ?? j,
            })),
          },
        },
      });
      nR += 1;
    }
  }
  console.log(`   ${rescapees.length} fiches restaurées, ${nR} groupes recréés`);

  titre("CONTRÔLE");
  console.log(`   finitions avec couleur  ${await prisma.finition.count({ where: { couleur: { not: null } } })} / ${await prisma.finition.count()}`);
  console.log(`   finitions avec palette  ${await prisma.finition.count({ where: { paletteNom: { not: null } } })}`);
  const groupes = await prisma.groupeFinition.groupBy({ by: ["nom"], _count: true });
  console.log(`   noms de groupe distincts ${groupes.length}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
