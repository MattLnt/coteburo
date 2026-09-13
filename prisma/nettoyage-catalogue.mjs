import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Nettoyage du catalogue après les imports en masse :
//
//   1. Retirer le suffixe « - NEW » de tous les noms
//   2. Repérer les doublons — même produit importé deux fois, ou fiche
//      ancienne saisie à la main puis réimportée
//   3. Ne garder que la version la plus complète
//
// Le script ne touche rien tant qu'on ne passe pas --appliquer.
// Sans cet argument, il montre ce qu'il ferait.

const APPLIQUER = process.argv.includes("--appliquer");

const SUFFIXE = " - NEW";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Deux fiches sont le même produit si leurs noms se ressemblent une fois
// normalisés. « Chaise Klik » et « Chaise pieds métal - Klik » ne sont pas
// le même produit ; « Rayonnage niveaux ajourés Archikit » et « Rayonnage
// niveaux ajourés - Archikit » le sont.
function cle(nom) {
  return slugify((nom || "").replace(SUFFIXE, ""));
}

// Une fiche vaut mieux qu'une autre si elle porte plus d'informations.
// L'import génère des descriptifs, des sections et des accessoires liés,
// ce que les anciennes saisies n'ont généralement pas.
function score(v) {
  const decl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
  const sections = Array.isArray(v.sectionsDevis) ? v.sectionsDevis.length : 0;
  const images = (v.images?.length || 0) + (v.imageUrl ? 1 : 0);

  return (
    decl * 2 +
    sections * 10 +
    v.optionsLiees.length * 15 +
    v.groupesFinition.length * 5 +
    images * 8 +
    (v.descriptif ? 20 : 0) +
    (v.prixUnitaireTarifHT != null ? 10 : 0) +
    (v.publie ? 3 : 0)
  );
}

function detail(v) {
  const bouts = [];
  const decl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
  if (decl) bouts.push(`${decl} décl.`);
  const sections = Array.isArray(v.sectionsDevis) ? v.sectionsDevis.length : 0;
  if (sections) bouts.push(`${sections} section(s)`);
  if (v.optionsLiees.length) bouts.push(`${v.optionsLiees.length} accessoire(s)`);
  if (v.groupesFinition.length) bouts.push(`${v.groupesFinition.length} groupe(s) finition`);
  const images = (v.images?.length || 0) + (v.imageUrl ? 1 : 0);
  if (images) bouts.push(`${images} image(s)`);
  if (v.descriptif) bouts.push("descriptif");
  if (v.publie) bouts.push("publié");
  return bouts.join(" · ") || "vide";
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les modifications seront écrites ═══\n"
    : "═══ SIMULATION — rien n'est modifié ═══\n");

  const marques = await prisma.marque.findMany({
    where: { slug: { in: ["buronomic", "sokoa"] } },
    select: { id: true, nom: true },
  });

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: { in: marques.map((m) => m.id) } } },
    include: {
      gamme: { select: { id: true, nom: true, marque: { select: { nom: true } } } },
      optionsLiees: { select: { id: true } },
      optionPour: { select: { id: true, nom: true } },
      groupesFinition: { select: { id: true } },
    },
  });

  console.log(`${vitrines.length} produit(s) examiné(s) sur Buronomic et Sokoa.\n`);

  // ── Regroupement par gamme puis par clé de nom ──
  const groupes = new Map();
  for (const v of vitrines) {
    const k = `${v.gamme.id}::${cle(v.nom)}`;
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(v);
  }

  const aSupprimer = [];
  const aRenommer = [];

  for (const [, lot] of groupes) {
    if (lot.length > 1) {
      // Doublon : on trie par score décroissant, on garde le premier.
      lot.sort((a, b) => score(b) - score(a));
      const garde = lot[0];
      const perdants = lot.slice(1);

      console.log(`▸ ${garde.gamme.nom} — doublon sur « ${cle(garde.nom).replace(/-/g, " ")} »`);
      console.log(`   GARDE  ${garde.nom}`);
      console.log(`          ${detail(garde)}`);

      for (const p of perdants) {
        console.log(`   EFFACE ${p.nom}`);
        console.log(`          ${detail(p)}`);

        // Une fiche référencée comme accessoire ailleurs ne doit pas
        // disparaître sans que la liaison bascule sur celle qu'on garde.
        if (p.optionPour.length) {
          console.log(`          ⚠ liée comme accessoire à ${p.optionPour.length} produit(s) — la liaison sera reportée`);
        }
        aSupprimer.push({ perdant: p, garde });
      }
      console.log("");
    }

    // Renommage, sur la fiche conservée comme sur les uniques.
    const garde = lot[0];
    if (garde.nom.includes(SUFFIXE)) {
      aRenommer.push({ id: garde.id, avant: garde.nom, apres: garde.nom.replace(SUFFIXE, "") });
    }
  }

  console.log(`\n═══ ${aSupprimer.length} suppression(s) · ${aRenommer.length} renommage(s) ═══\n`);

  if (!APPLIQUER) {
    console.log("Relancer avec --appliquer pour exécuter :");
    console.log("   node prisma\\nettoyage-catalogue.mjs --appliquer");
    return;
  }

  // ── Report des liaisons avant suppression ──
  for (const { perdant, garde } of aSupprimer) {
    for (const parent of perdant.optionPour) {
      await prisma.produitVitrine.update({
        where: { id: parent.id },
        data: { optionsLiees: { connect: { id: garde.id } } },
      });
    }
  }

  // ── Suppressions ──
  const ids = aSupprimer.map((x) => x.perdant.id);
  if (ids.length) {
    // Les groupes de finitions partent en cascade (onDelete: Cascade),
    // les liaisons many-to-many aussi.
    const res = await prisma.produitVitrine.deleteMany({ where: { id: { in: ids } } });
    console.log(`${res.count} produit(s) supprimé(s).`);
  }

  // ── Renommages ──
  // Le slug reste inchangé : les URL déjà indexées continuent de marcher.
  let renommes = 0;
  for (const r of aRenommer) {
    await prisma.produitVitrine.update({
      where: { id: r.id },
      data: { nom: r.apres },
    });
    renommes++;
  }
  console.log(`${renommes} produit(s) renommé(s).`);

  // ── Contrôle ──
  const restants = await prisma.produitVitrine.count({
    where: { nom: { contains: SUFFIXE } },
  });
  console.log(`\n${restants === 0 ? "Aucun" : restants} suffixe « - NEW » restant.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());