// Contrôle indépendant du modèle produit, lu depuis les nouvelles tables.
//
//   node prisma/verifier-modele-produit.mjs
//
// POURQUOI UN SCRIPT À PART
//   La migration se contrôle elle-même, mais elle contrôle ce qu'elle croit
//   avoir écrit. Celui-ci ne lit que la base, sans rien savoir de ce qui l'a
//   remplie, et refait le raisonnement à l'envers.
//
// LES CINQ INVARIANTS
//   1. Chaque produit a retrouvé ses choix et ses combinaisons.
//   2. Toute valeur citée par une combinaison existe dans un choix tarifaire
//      du même produit — et réciproquement, aucun choix tarifaire n'est
//      ignoré des combinaisons.
//   3. La référence se reconstruit : referenceBase + Σ suffixeReference
//      redonne, pour chaque produit, exactement les références du tarif.
//   4. Aucune association exclue ne désigne une valeur inexistante.
//   5. Le prix est là où on l'attend, et nulle part ailleurs.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

const verdict = (libelle, valeur, attendu) => {
  const ok = valeur === attendu;
  console.log(`   ${ok ? "✓" : "✗"} ${libelle.padEnd(52)} ${String(valeur).padStart(6)}${ok ? "" : ` (attendu ${attendu})`}`);
  return ok;
};

async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, declinaisons: true,
      choix: { select: { cle: true, nature: true, ordre: true, rangReference: true, valeurs: { select: { id: true, libelle: true, suffixeReference: true, supplementHT: true, ordre: true } } } },
      combinaisons: { select: { valeurs: true, referenceBase: true, prixTarifHT: true, ancienId: true } },
      exclusionsFinition: { select: { valeurs: true } },
      visuels: { select: { role: true, valeurs: { select: { valeurChoixId: true } } } },
    },
  });

  let sain = true;

  titre("1. RIEN N'A DISPARU");
  const avecChoix = vitrines.filter((v) => v.choix.length).length;
  const declAvant = vitrines.reduce((n, v) => n + (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0), 0);
  const combApres = vitrines.reduce((n, v) => n + v.combinaisons.length, 0);
  console.log("");
  sain = verdict("produits en base", vitrines.length, 555) && sain;
  sain = verdict("déclinaisons → combinaisons", combApres, declAvant) && sain;
  console.log(`   · produits ayant au moins un choix                  ${String(avecChoix).padStart(6)}`);

  titre("2. AUCUNE VALEUR ORPHELINE");
  let valeurHorsChoix = 0;
  let cleSansChoix = 0;
  let choixIgnore = 0;
  for (const v of vitrines) {
    const tarifaires = v.choix.filter((c) => c.nature === "tarifaire");
    const parCle = new Map(tarifaires.map((c) => [c.cle, new Set(c.valeurs.map((x) => x.libelle))]));
    const vues = new Set();
    for (const comb of v.combinaisons) {
      for (const [cle, val] of Object.entries(comb.valeurs || {})) {
        vues.add(cle);
        const libelles = parCle.get(cle);
        if (!libelles) { cleSansChoix += 1; continue; }
        if (!libelles.has(val)) valeurHorsChoix += 1;
      }
    }
    for (const c of tarifaires) if (v.combinaisons.length && !vues.has(c.cle)) choixIgnore += 1;
  }
  console.log("");
  sain = verdict("valeurs portées mais absentes de leur choix", valeurHorsChoix, 0) && sain;
  sain = verdict("clés portées sans choix correspondant", cleSansChoix, 0) && sain;
  sain = verdict("choix tarifaires qu'aucune combinaison n'emploie", choixIgnore, 0) && sain;

  titre("3. LA RÉFÉRENCE SE RECONSTRUIT");
  let fichesTestees = 0;
  let refsTestees = 0;
  let refsJustes = 0;
  const fautives = [];
  for (const v of vitrines) {
    const declinaisons = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const attendu = declinaisons.find((d) => d.referencesParFinition)?.referencesParFinition;
    if (!attendu) continue;
    // La référence s'assemble dans l'ordre des RANGS, pas dans celui de
    // l'affichage. Un choix sans rang n'ajoute rien au code.
    const finitions = v.choix
      .filter((c) => c.nature === "finition" && c.rangReference != null)
      .sort((a, b) => a.rangReference - b.rangReference);
    if (!finitions.length) continue;

    const base = v.combinaisons[0]?.referenceBase;
    if (!base) continue;
    fichesTestees += 1;

    // On regénère depuis les seules tables neuves : base + jetons, pour toutes
    // les associations, moins celles que les exclusions déclarent absentes.
    const exclus = new Set(v.exclusionsFinition.map((e) => JSON.stringify([...e.valeurs].sort())));
    const obtenues = new Set();
    const parcourir = (i, ref, ids) => {
      if (i === finitions.length) {
        if (!exclus.has(JSON.stringify([...ids].sort()))) obtenues.add(ref);
        return;
      }
      // Seules les valeurs QUE LE TARIF DÉCLINE engendrent une référence.
      // Une valeur sans jeton figure sur la fiche mais ne se commande pas :
      // la compter fabriquerait des références qui n'existent nulle part.
      for (const val of finitions[i].valeurs) {
        if (val.suffixeReference == null) continue;
        parcourir(i + 1, ref + val.suffixeReference, [...ids, val.id]);
      }
    };
    parcourir(0, base, []);

    const cibles = new Set(Object.values(attendu));
    refsTestees += cibles.size;
    let manquantes = 0;
    for (const r of cibles) if (obtenues.has(r)) refsJustes += 1; else manquantes += 1;
    const enTrop = [...obtenues].filter((r) => !cibles.has(r)).length;
    if (manquantes || enTrop) fautives.push({ nom: v.nom, manquantes, enTrop, attendues: cibles.size });
  }
  console.log("");
  console.log(`   fiches confrontées au tarif                         ${String(fichesTestees).padStart(6)}`);
  sain = verdict("références du tarif retrouvées", refsJustes, refsTestees) && sain;
  sain = verdict("fiches en désaccord", fautives.length, 0) && sain;
  for (const f of fautives.slice(0, 8)) {
    console.log(`      ${f.nom.slice(0, 50).padEnd(52)} ${f.manquantes} manquante(s), ${f.enTrop} en trop sur ${f.attendues}`);
  }

  // Une valeur de finition sans jeton n'est pas commandable. Ce n'est pas une
  // anomalie — le tarif ne décline pas tout — mais il faut savoir combien de
  // teintes la fiche montre sans pouvoir les vendre.
  let sansJeton = 0;
  let finitionsTotal = 0;
  for (const v of vitrines) {
    for (const c of v.choix) {
      if (c.nature !== "finition" || c.rangReference == null) continue;
      for (const x of c.valeurs) { finitionsTotal += 1; if (x.suffixeReference == null) sansJeton += 1; }
    }
  }
  console.log(`   valeurs de finition sans jeton, donc non commandables  ${String(sansJeton).padStart(4)} / ${finitionsTotal}`);

  titre("4. LES EXCLUSIONS DÉSIGNENT DES VALEURS RÉELLES");
  const tousIds = new Set();
  for (const v of vitrines) for (const c of v.choix) for (const x of c.valeurs) tousIds.add(x.id);
  let exclInvalides = 0;
  let exclTotal = 0;
  for (const v of vitrines) {
    for (const e of v.exclusionsFinition) {
      exclTotal += 1;
      if (!Array.isArray(e.valeurs) || e.valeurs.some((id) => !tousIds.has(id))) exclInvalides += 1;
    }
  }
  console.log("");
  console.log(`   associations exclues                                ${String(exclTotal).padStart(6)}`);
  sain = verdict("exclusions citant une valeur inexistante", exclInvalides, 0) && sain;

  titre("5. LE PRIX EST À SA PLACE");
  let combSansPrix = 0;
  let valeurAvecPrix = 0;
  for (const v of vitrines) {
    for (const c of v.combinaisons) if (c.prixTarifHT == null) combSansPrix += 1;
    for (const c of v.choix) for (const x of c.valeurs) if (x.supplementHT != null) valeurAvecPrix += 1;
  }
  console.log("");
  console.log(`   combinaisons sans prix tarif                        ${String(combSansPrix).padStart(6)}`);
  sain = verdict("valeurs portant un supplément (aucun attendu)", valeurAvecPrix, 0) && sain;
  const sansAncienId = vitrines.reduce((n, v) => n + v.combinaisons.filter((c) => !c.ancienId).length, 0);
  console.log(`   combinaisons sans pont vers l'ancien identifiant    ${String(sansAncienId).padStart(6)}`);

  titre(sain ? "TOUT CONCORDE" : "DES ÉCARTS SUBSISTENT");
  console.log(sain
    ? "\n   Le modèle produit est en place et vérifié depuis la base.\n"
    : "\n   Les lignes marquées ✗ ci-dessus sont à reprendre.\n");
  if (!sain) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
