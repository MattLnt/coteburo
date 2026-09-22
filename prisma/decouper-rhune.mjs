// Rend à Rhune ses blocs de tarif, et nomme ses axes.
//
//   node prisma/decouper-rhune.mjs
//   node prisma/decouper-rhune.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUE LA RÉFÉRENCE ÉCRIT — pages 128, 129 et 130
//
//   RU X B / 1 B
//      │ │   └── suffixe : 10 sans tablette · 1B tablette bois
//      │ │                 11 tablette + électrification CE (250V + 2 USB)
//      │ └────── orientation
//      └──────── le meuble
//
//   orientation, chez le fauteuil et le canapé :   B tablette à droite
//                                                  C tablette à gauche
//   orientation, chez la méridienne et le banc :   D à droite   ·  G à gauche
//                                                  E 2 poufs à droite
//                                                  F 2 poufs à gauche
//
// TROIS TRAVAUX
//
//   1. NOMMER. Quatre fiches ne couvrent qu'un bloc du tarif et n'ont besoin
//      que d'un nom : « Modèle » devient « Orientation » et « Équipement ».
//
//   2. DÉCOUPER. Deux fiches en fondent plusieurs :
//
//        « Méridienne avec tablette… »   12 références = TROIS blocs
//            RUYD/RUYG   méridienne 2 places - 1 pouf        L 1770
//            RUZD/RUZG   méridienne 3 places - 1 pouf, 1 ch. L 2520
//            RUZE/RUZF   méridienne 3 places - 2 poufs       L 2520
//
//        « Banc à droite ou à gauche… »   8 références = DEUX blocs
//            RUQD/RUQG   banc 2 places                       L 1730
//            RURD/RURG   banc 3 places                       L 2500
//
//      Trois dimensions, trois prix, trois meubles : ce sont des produits,
//      pas des variantes. Et leurs frères « sans tablette » existent DÉJÀ en
//      fiches séparées — on les rejoint, on n'invente rien.
//
//   3. RENOMMER. « Canapé 3 places, inclus 2 coussins lombaires » porte
//      RUZT/10, que la page 130 appelle « Tête à tête 3 places (2 angles
//      inversés + pouf au centre) ». Ce n'est pas un canapé 3 places — celui-là
//      existe à côté, sous RUZ1/10. Deux meubles différents portaient le même
//      nom.
//
// CE QU'ON NE SUPPRIME PAS
//   La fiche d'origine n'est pas détruite : elle devient le premier des blocs
//   qu'elle contenait, et les autres blocs partent dans des fiches neuves.
//   Aucune combinaison n'est perdue — le script les compte avant et après, et
//   refuse d'écrire si le total ne retombe pas.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ORIENTATION = {
  B: "Tablette à droite", C: "Tablette à gauche",
  D: "À droite", G: "À gauche",
  E: "2 poufs à droite", F: "2 poufs à gauche",
};
const EQUIPEMENT = {
  "10": "Sans tablette",
  "1B": "Tablette de rangement bois",
  "11": "Tablette de rangement bois + électrification CE",
};
const ORDRE_EQUIPEMENT = ["Sans tablette", "Tablette de rangement bois",
  "Tablette de rangement bois + électrification CE"];

/** RUYD/1B → { meuble: "RUY", orientation: "D", suffixe: "1B" } */
function decoder(ref) {
  const m = /^(RU[A-Z0-9])([A-Z])\/(\w{2})$/.exec(String(ref || ""));
  if (!m) return null;
  return { meuble: m[1], orientation: m[2], suffixe: m[3] };
}

// ── 1. Les fiches à bloc unique : on nomme, on ne découpe pas ───────────
const A_NOMMER = [
  "Fauteuil avec tablette de rangement bois et électrification possible - Rhune",
  "Canapé 2 places avec tablette de rangement bois et électrification possible - Rhune",
  "Canapé 3 places avec tablette de rangement bois et électrification possible - Rhune",
  "Méridienne 3 places - 2 poufs (1 angle, 2 poufs) - Rhune",
];

// ── 2. Les fiches à découper : un bloc par meuble ───────────────────────
const A_DECOUPER = [
  {
    fiche: "Méridienne avec tablette de rangement bois et électrification possible - Rhune",
    blocs: [
      { meuble: "RUY", nom: "Méridienne 2 places - 1 pouf, avec tablette de rangement bois - Rhune" },
      { meuble: "RUZ", orientations: ["D", "G"], nom: "Méridienne 3 places - 1 pouf, 1 chauffeuse, avec tablette de rangement bois - Rhune" },
      { meuble: "RUZ", orientations: ["E", "F"], nom: "Méridienne 3 places - 2 poufs, avec tablette de rangement bois - Rhune" },
    ],
  },
  {
    fiche: "Banc à droite ou à gauche et électrification possible - Rhune",
    blocs: [
      { meuble: "RUQ", nom: "Banc 2 places, avec tablette de rangement bois - Rhune" },
      { meuble: "RUR", nom: "Banc 3 places, avec tablette de rangement bois - Rhune" },
    ],
  },
];

// ── 3. Les fiches mal nommées ───────────────────────────────────────────
const A_RENOMMER = [
  ["Canapé 3 places, inclus 2 coussins lombaires - Rhune",
    "Tête à tête 3 places - 2 angles inversés, pouf au centre - Rhune"],
];

const appartient = (bloc, d) =>
  d.meuble === bloc.meuble && (!bloc.orientations || bloc.orientations.includes(d.orientation));

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const selection = {
    id: true, nom: true, slug: true, gammeId: true, publie: true, venteSurDevis: true,
    descriptif: true, imageUrl: true, images: true,
    categoriePrincipaleId: true, sousCategoriePrincipaleId: true,
    categories: { select: { id: true } }, sousCategories: { select: { id: true } },
    choix: { orderBy: { ordre: "asc" }, select: { id: true, cle: true, nom: true, nature: true,
      rendu: true, ordre: true, rangReference: true, element: true,
      valeurs: { orderBy: { ordre: "asc" }, select: { id: true, libelle: true, suffixeReference: true, couleur: true, paletteId: true, modeleId: true } } } },
    combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true,
      ecoContribution: true, poids: true, ean: true, pageCatalogue: true, ancienId: true } },
    visuels: { orderBy: { ordre: "asc" }, select: { url: true, role: true, ordre: true, recadre: true, urlOrigine: true } },
  };

  const refuses = [];

  // ── Ce qui sera nommé ────────────────────────────────────────────────
  const nommages = [];
  for (const nom of A_NOMMER) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom }, select: selection });
    if (!v) { refuses.push(`${nom} — introuvable`); continue; }
    const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
    if (!modele) { refuses.push(`${nom} — pas de question « Modèle »`); continue; }
    const decodees = v.combinaisons.map((k) => ({ k, d: decoder(k.referenceBase) }));
    const illisible = decodees.find((x) => !x.d);
    if (illisible) { refuses.push(`${nom} — référence illisible « ${illisible.k.referenceBase} »`); continue; }
    const meubles = new Set(decodees.map((x) => x.d.meuble + (x.d.orientation === "E" || x.d.orientation === "F" ? "-EF" : "")));
    if (meubles.size > 1) { refuses.push(`${nom} — ${meubles.size} meubles : ${[...meubles].join(", ")} — à découper, pas à nommer`); continue; }
    nommages.push({ v, modele, decodees });
  }

  // ── Ce qui sera découpé ──────────────────────────────────────────────
  const decoupes = [];
  for (const plan of A_DECOUPER) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom: plan.fiche }, select: selection });
    if (!v) { refuses.push(`${plan.fiche} — introuvable`); continue; }
    const modele = v.choix.find((c) => /^(mod[èe]le|r[ée]f[ée]rence)$/i.test(c.nom));
    const decodees = v.combinaisons.map((k) => ({ k, d: decoder(k.referenceBase) }));
    const illisible = decodees.find((x) => !x.d);
    if (illisible) { refuses.push(`${plan.fiche} — référence illisible « ${illisible.k.referenceBase} »`); continue; }

    const lots = plan.blocs.map((b) => ({ bloc: b, lignes: decodees.filter((x) => appartient(b, x.d)) }));
    const orphelines = decodees.filter((x) => !plan.blocs.some((b) => appartient(b, x.d)));
    if (orphelines.length) {
      refuses.push(`${plan.fiche} — ${orphelines.length} combinaisons n'entrent dans aucun bloc : ${[...new Set(orphelines.map((o) => o.k.referenceBase))].join(", ")}`);
      continue;
    }
    const vide = lots.find((l) => !l.lignes.length);
    if (vide) { refuses.push(`${plan.fiche} — le bloc « ${vide.bloc.nom} » ne reçoit aucune combinaison`); continue; }
    const total = lots.reduce((n, l) => n + l.lignes.length, 0);
    if (total !== v.combinaisons.length) {
      refuses.push(`${plan.fiche} — ${total} combinaisons réparties pour ${v.combinaisons.length} : on en perdrait`);
      continue;
    }
    decoupes.push({ v, modele, lots });
  }

  // ── Le rapport ───────────────────────────────────────────────────────
  titre(`${nommages.length} FICHES À NOMMER`);
  for (const n of nommages) {
    const orients = [...new Set(n.decodees.map((x) => ORIENTATION[x.d.orientation]))];
    const equips = [...new Set(n.decodees.map((x) => EQUIPEMENT[x.d.suffixe]))];
    console.log(`\n   ${n.v.nom}`);
    console.log(`      Orientation : ${orients.join(" · ")}`);
    console.log(`      Équipement  : ${equips.join(" · ")}`);
  }

  titre(`${decoupes.length} FICHES À DÉCOUPER`);
  for (const d of decoupes) {
    console.log(`\n   ${d.v.nom}`);
    console.log(`      ${d.v.combinaisons.length} combinaisons → ${d.lots.length} fiches`);
    for (const [i, l] of d.lots.entries()) {
      const refs = [...new Set(l.lignes.map((x) => x.k.referenceBase))].sort();
      const prix = l.lignes.map((x) => x.k.prixTarifHT).filter(Boolean);
      console.log(`         ${i === 0 ? "reste ici " : "fiche neuve"} · ${String(l.lignes.length).padStart(2)} combi · ${Math.min(...prix)}→${Math.max(...prix)} €`);
      console.log(`            ${l.bloc.nom}`);
      console.log(`            ${refs.join(" ")}`);
    }
  }

  titre(`${A_RENOMMER.length} FICHE À RENOMMER`);
  for (const [avant, apres] of A_RENOMMER) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom: avant }, select: { id: true, combinaisons: { select: { referenceBase: true } } } });
    if (!v) { console.log(`   INTROUVABLE : ${avant}`); continue; }
    console.log(`\n   « ${avant} »\n → « ${apres} »   (${[...new Set(v.combinaisons.map((c) => c.referenceBase))].join(", ")})`);
  }

  if (refuses.length) {
    titre(`${refuses.length} REFUS — rien n'y sera touché`);
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  // ── L'écriture ───────────────────────────────────────────────────────
  // Poser les deux axes sur une fiche, et réécrire ses combinaisons.
  async function poser(vitrineId, modeleId, lignes, ordreDepart) {
    const orients = [...new Set(lignes.map((x) => ORIENTATION[x.d.orientation]))];
    const equips = ORDRE_EQUIPEMENT.filter((e) => lignes.some((x) => EQUIPEMENT[x.d.suffixe] === e));

    const axes = {};
    axes.orientation = await prisma.choix.create({
      data: { vitrineId, cle: "orientation", nom: "Orientation", nature: "tarifaire",
        rendu: "boutons", ordre: ordreDepart },
    });
    for (const [i, lib] of orients.entries()) {
      await prisma.valeurChoix.create({ data: { choixId: axes.orientation.id, libelle: lib, ordre: i } });
    }
    if (equips.length > 1) {
      axes.equipement = await prisma.choix.create({
        data: { vitrineId, cle: "equipement", nom: "Équipement", nature: "tarifaire",
          rendu: "boutons", ordre: ordreDepart + 1 },
      });
      for (const [i, lib] of equips.entries()) {
        await prisma.valeurChoix.create({ data: { choixId: axes.equipement.id, libelle: lib, ordre: i } });
      }
    }
    if (modeleId) await prisma.choix.delete({ where: { id: modeleId } });
    return { orients, equips };
  }

  // 1. Nommer.
  for (const n of nommages) {
    const ordre = n.modele.ordre;
    await poser(n.v.id, n.modele.id, n.decodees, ordre);
    for (const { k, d } of n.decodees) {
      const { [n.modele.cle]: _vieux, ...reste } = k.valeurs || {};
      const valeurs = { ...reste, orientation: ORIENTATION[d.orientation] };
      if (new Set(n.decodees.map((x) => EQUIPEMENT[x.d.suffixe])).size > 1) {
        valeurs.equipement = EQUIPEMENT[d.suffixe];
      }
      await prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } });
    }
  }

  // 2. Découper : le premier bloc reste, les suivants partent.
  for (const d of decoupes) {
    for (const [i, lot] of d.lots.entries()) {
      let cibleId = d.v.id;
      if (i > 0) {
        const neuve = await prisma.produitVitrine.create({
          data: {
            nom: lot.bloc.nom, slug: slug(lot.bloc.nom), gammeId: d.v.gammeId,
            publie: d.v.publie, venteSurDevis: d.v.venteSurDevis, descriptif: d.v.descriptif,
            imageUrl: d.v.imageUrl, images: d.v.images,
            categoriePrincipaleId: d.v.categoriePrincipaleId,
            sousCategoriePrincipaleId: d.v.sousCategoriePrincipaleId,
            categories: { connect: d.v.categories.map((c) => ({ id: c.id })) },
            sousCategories: { connect: d.v.sousCategories.map((s) => ({ id: s.id })) },
          },
        });
        cibleId = neuve.id;
        // Les axes de finition suivent : revêtement, finition tarifaire…
        for (const c of d.v.choix) {
          if (c.id === d.modele?.id) continue;
          const copie = await prisma.choix.create({
            data: { vitrineId: cibleId, cle: c.cle, nom: c.nom, nature: c.nature,
              rendu: c.rendu, ordre: c.ordre, rangReference: c.rangReference, element: c.element },
          });
          for (const [j, w] of c.valeurs.entries()) {
            await prisma.valeurChoix.create({
              data: { choixId: copie.id, libelle: w.libelle, ordre: j,
                suffixeReference: w.suffixeReference, couleur: w.couleur,
                paletteId: w.paletteId, modeleId: w.modeleId },
            });
          }
        }
        for (const vi of d.v.visuels) {
          await prisma.visuel.create({ data: { vitrineId: cibleId, ...vi } });
        }
      } else {
        await prisma.produitVitrine.update({ where: { id: d.v.id }, data: { nom: lot.bloc.nom, slug: slug(lot.bloc.nom) } });
      }

      const ordre = d.modele ? d.modele.ordre : 0;
      await poser(cibleId, i === 0 ? d.modele?.id : null, lot.lignes, ordre);

      for (const { k, d: dec } of lot.lignes) {
        const { [d.modele?.cle]: _vieux, ...reste } = k.valeurs || {};
        const valeurs = { ...reste, orientation: ORIENTATION[dec.orientation] };
        if (new Set(lot.lignes.map((x) => EQUIPEMENT[x.d.suffixe])).size > 1) {
          valeurs.equipement = EQUIPEMENT[dec.suffixe];
        }
        if (i === 0) {
          await prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } });
        } else {
          await prisma.combinaison.create({
            data: { vitrineId: cibleId, valeurs, empreinte: empreinteDe(valeurs),
              referenceBase: k.referenceBase, prixTarifHT: k.prixTarifHT,
              ecoContribution: k.ecoContribution, poids: k.poids, ean: k.ean,
              pageCatalogue: k.pageCatalogue, ancienId: k.ancienId },
          });
          await prisma.combinaison.delete({ where: { id: k.id } });
        }
      }
    }
  }

  // 3. Renommer.
  for (const [avant, apres] of A_RENOMMER) {
    const v = await prisma.produitVitrine.findFirst({ where: { nom: avant }, select: { id: true } });
    if (v) await prisma.produitVitrine.update({ where: { id: v.id }, data: { nom: apres, slug: slug(apres) } });
  }

  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
