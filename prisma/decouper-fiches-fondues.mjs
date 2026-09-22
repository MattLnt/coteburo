// Sépare deux fiches qui contenaient chacune deux produits différents.
//
//   node prisma/decouper-fiches-fondues.mjs
//   node prisma/decouper-fiches-fondues.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// LES DEUX CAS
//
//   1. « Coussin latéral cylindrique …, l'unité - Rhune » porte cinq
//      combinaisons pour DEUX articles de la page 131 :
//
//        RU50/00         le coussin, 58 à 78 € selon la catégorie de tissu
//        OLTELDISQ80N0   le kit d'électrification, 210 €
//
//      Un coussin en tissu et une prise CE à deux ports USB. Le client qui
//      voulait un coussin pouvait se retrouver avec une prise.
//
//   2. « AlaiaT - chaise multimédia moyen dossier, lift haut avec repose-pied
//      - Sièges Hauts » porte cinq références pour DEUX sièges de la page 61 :
//
//        IA32/00, IA52/00, IA62/00   l'Alaia, trois mécanismes
//        TO32/20, TO32/00            le Torino, deux hauteurs de lift
//
//      Le Torino est un autre siège, avec son propre en-tête dans le tarif et
//      ses propres dimensions. Il n'a rien à faire dans la fiche Alaia.
//
// CE QU'ON NE PERD PAS
//   La fiche d'origine garde le premier produit ; le second part dans une
//   fiche neuve, qui hérite du rayon, des visuels et des axes de finition.
//   Le script compte les combinaisons avant et après et refuse d'écrire si le
//   total ne retombe pas.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const PLANS = [
  {
    fiche: "Coussin latéral cylindrique (seulement possible d'en mettre 2 sur le 3 places), l'unité - Rhune",
    reste: {
      nom: "Coussin latéral cylindrique, l'unité - Rhune",
      garde: (r) => r.startsWith("RU50"),
      // Une seule référence : plus rien à demander, la question « Modèle »
      // disparaît sans être remplacée.
      axe: null,
    },
    part: {
      nom: "Kit d'électrification, prise CE et 2 ports USB - Rhune",
      garde: (r) => r.startsWith("OLTEL"),
      axe: null,
      descriptif: "À fixer sur le support en bois du canapé, à l'endroit souhaité.",
    },
  },
  {
    fiche: "AlaiaT - chaise multimédia moyen dossier, lift haut avec repose-pied - Sièges Hauts",
    reste: {
      nom: "AlaiaT - chaise multimédia moyen dossier, lift haut avec repose-pied - Sièges Hauts",
      garde: (r) => r.startsWith("IA"),
      axe: { cle: "mecanisme", nom: "Mécanisme", rendu: "boutons",
        lire: (r) => r.slice(2, 4),
        codes: { 32: "Contact permanent", 52: "Synchro", 62: "Synchro automatique" },
        ordre: ["Contact permanent", "Synchro", "Synchro automatique"] },
    },
    part: {
      nom: "Torino - siège haut, assise et dossier moyen tapissés, contact permanent, repose-pieds - Sièges Hauts",
      garde: (r) => r.startsWith("TO"),
      axe: { cle: "lift", nom: "Hauteur de lift", rendu: "boutons",
        lire: (r) => r.slice(-2),
        codes: { 20: "Assis-debout", "00": "Haut" },
        ordre: ["Assis-debout", "Haut"] },
    },
  },
];

const SELECTION = {
  id: true, nom: true, slug: true, gammeId: true, publie: true, venteSurDevis: true,
  descriptif: true, imageUrl: true, images: true,
  categoriePrincipaleId: true, sousCategoriePrincipaleId: true,
  categories: { select: { id: true } }, sousCategories: { select: { id: true } },
  choix: { orderBy: { ordre: "asc" }, select: { id: true, cle: true, nom: true, nature: true,
    rendu: true, ordre: true, rangReference: true, element: true,
    valeurs: { orderBy: { ordre: "asc" }, select: { libelle: true, suffixeReference: true, couleur: true, paletteId: true, modeleId: true } } } },
  combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true,
    ecoContribution: true, poids: true, ean: true, pageCatalogue: true, ancienId: true } },
  visuels: { orderBy: { ordre: "asc" }, select: { url: true, role: true, ordre: true, recadre: true, urlOrigine: true } },
};

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const prets = [];
  const refuses = [];

  for (const plan of PLANS) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom: plan.fiche }, select: SELECTION });
    if (!v) { refuses.push(`${plan.fiche} — introuvable`); continue; }
    const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
    if (!modele) { refuses.push(`${plan.fiche} — pas de question « Modèle »`); continue; }

    const lots = [plan.reste, plan.part].map((b) => ({
      bloc: b, lignes: v.combinaisons.filter((k) => b.garde(String(k.referenceBase || ""))),
    }));
    const orphelines = v.combinaisons.filter((k) => !lots.some((l) => l.lignes.includes(k)));
    if (orphelines.length) {
      refuses.push(`${plan.fiche} — ${orphelines.length} combinaisons dans aucun lot : ${[...new Set(orphelines.map((o) => o.referenceBase))].join(", ")}`);
      continue;
    }
    const vide = lots.find((l) => !l.lignes.length);
    if (vide) { refuses.push(`${plan.fiche} — le lot « ${vide.bloc.nom} » est vide`); continue; }
    if (lots.reduce((n, l) => n + l.lignes.length, 0) !== v.combinaisons.length) {
      refuses.push(`${plan.fiche} — le compte ne retombe pas`); continue;
    }
    // Chaque lot doit savoir décoder son axe, s'il en a un.
    let illisible = null;
    for (const l of lots) {
      if (!l.bloc.axe) continue;
      for (const k of l.lignes) {
        const mot = l.bloc.axe.codes[l.bloc.axe.lire(String(k.referenceBase))];
        if (!mot) { illisible = `${k.referenceBase} (lot ${l.bloc.nom})`; break; }
      }
      if (illisible) break;
    }
    if (illisible) { refuses.push(`${plan.fiche} — code illisible : ${illisible}`); continue; }

    prets.push({ v, modele, lots });
  }

  titre(`${prets.length} FICHES À SÉPARER`);
  for (const p of prets) {
    console.log(`\n   ${p.v.nom}`);
    console.log(`      ${p.v.combinaisons.length} combinaisons → 2 fiches`);
    for (const [i, l] of p.lots.entries()) {
      const refs = [...new Set(l.lignes.map((k) => k.referenceBase))].sort();
      const prix = l.lignes.map((k) => k.prixTarifHT).filter((x) => x != null);
      console.log(`         ${i === 0 ? "reste ici " : "fiche neuve"} · ${String(l.lignes.length).padStart(2)} combi · ${prix.length ? `${Math.min(...prix)}→${Math.max(...prix)} €` : "—"}`);
      console.log(`            ${l.bloc.nom}`);
      console.log(`            ${refs.join(" ")}${l.bloc.axe ? `   axe « ${l.bloc.axe.nom} »` : "   (une seule référence, plus de question)"}`);
    }
  }
  if (refuses.length) {
    titre(`${refuses.length} REFUS`);
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  for (const p of prets) {
    for (const [i, lot] of p.lots.entries()) {
      let cibleId = p.v.id;
      if (i > 0) {
        const neuve = await prisma.produitVitrine.create({
          data: {
            nom: lot.bloc.nom, slug: slug(lot.bloc.nom), gammeId: p.v.gammeId,
            publie: p.v.publie, venteSurDevis: p.v.venteSurDevis,
            descriptif: lot.bloc.descriptif ?? p.v.descriptif,
            imageUrl: p.v.imageUrl, images: p.v.images,
            categoriePrincipaleId: p.v.categoriePrincipaleId,
            sousCategoriePrincipaleId: p.v.sousCategoriePrincipaleId,
            categories: { connect: p.v.categories.map((c) => ({ id: c.id })) },
            sousCategories: { connect: p.v.sousCategories.map((s) => ({ id: s.id })) },
          },
        });
        cibleId = neuve.id;
        for (const c of p.v.choix) {
          if (c.id === p.modele.id) continue;
          const copie = await prisma.choix.create({
            data: { vitrineId: cibleId, cle: c.cle, nom: c.nom, nature: c.nature,
              rendu: c.rendu, ordre: c.ordre, rangReference: c.rangReference, element: c.element },
          });
          for (const [j, w] of c.valeurs.entries()) {
            await prisma.valeurChoix.create({
              data: { choixId: copie.id, libelle: w.libelle, ordre: j, suffixeReference: w.suffixeReference,
                couleur: w.couleur, paletteId: w.paletteId, modeleId: w.modeleId },
            });
          }
        }
        for (const vi of p.v.visuels) await prisma.visuel.create({ data: { vitrineId: cibleId, ...vi } });
      } else if (lot.bloc.nom !== p.v.nom) {
        await prisma.produitVitrine.update({ where: { id: p.v.id }, data: { nom: lot.bloc.nom, slug: slug(lot.bloc.nom) } });
      }

      // L'axe du lot : on reprend le choix « Modèle » côté fiche d'origine.
      let axeId = null;
      if (lot.bloc.axe) {
        const a = lot.bloc.axe;
        const mots = a.ordre.filter((m) => lot.lignes.some((k) => a.codes[a.lire(String(k.referenceBase))] === m));
        if (i === 0) {
          await prisma.choix.update({ where: { id: p.modele.id },
            data: { cle: a.cle, nom: a.nom, nature: "tarifaire", rendu: a.rendu } });
          await prisma.valeurChoix.deleteMany({ where: { choixId: p.modele.id } });
          axeId = p.modele.id;
        } else {
          const neuf = await prisma.choix.create({
            data: { vitrineId: cibleId, cle: a.cle, nom: a.nom, nature: "tarifaire",
              rendu: a.rendu, ordre: p.modele.ordre },
          });
          axeId = neuf.id;
        }
        for (const [j, mot] of mots.entries()) {
          await prisma.valeurChoix.create({ data: { choixId: axeId, libelle: mot, ordre: j } });
        }
      } else if (i === 0) {
        await prisma.choix.delete({ where: { id: p.modele.id } });
      }

      for (const k of lot.lignes) {
        const { [p.modele.cle]: _vieux, ...reste } = k.valeurs || {};
        const valeurs = { ...reste };
        if (lot.bloc.axe) {
          const a = lot.bloc.axe;
          valeurs[a.cle] = a.codes[a.lire(String(k.referenceBase))];
        }
        if (i === 0) {
          await prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } });
        } else {
          await prisma.combinaison.create({
            data: { vitrineId: cibleId, valeurs, empreinte: empreinteDe(valeurs),
              referenceBase: k.referenceBase, prixTarifHT: k.prixTarifHT, ecoContribution: k.ecoContribution,
              poids: k.poids, ean: k.ean, pageCatalogue: k.pageCatalogue, ancienId: k.ancienId },
          });
          await prisma.combinaison.delete({ where: { id: k.id } });
        }
      }
    }
  }
  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
