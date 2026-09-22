// Supprime les fiches dépubliées que le redécoupage a remplacées.
//
//   node prisma/supprimer-fiches-remplacees.mjs
//   node prisma/supprimer-fiches-remplacees.mjs --appliquer
//
// En simulation par défaut. --appliquer supprime — sans retour possible.
//
// CE QU'ON SUPPRIME
//   Les fiches mises hors catalogue par les scripts de redécoupage : celles
//   que mes regroupements avaient fabriquées, et les originales que le
//   redécoupage a recréées à l'identique. Toutes portent publie = false et
//   accessoireSeul = true, la marque que ces scripts posaient.
//
// CE QU'ON NE SUPPRIME PAS
//   Une fiche dépubliée pour une autre raison — un brouillon, un produit
//   retiré de la vente — n'est pas concernée : le script ne prend que celles
//   dont le nom ou les références se retrouvent dans une fiche publiée de la
//   même gamme. Une fiche dépubliée qui n'a pas d'équivalent publié est
//   laissée, et signalée.
//
// LES GARDE-FOUS
//   Une fiche citée par une commande, un devis, un favori, une promotion, une
//   réalisation ou une autre fiche n'est pas supprimée, même si le site n'est
//   pas encore ouvert. Le script refuse en bloc et dit laquelle.
//
//   LigneCommande et LigneDevis gardent l'identifiant de la fiche en texte,
//   sans relation déclarée : c'est délibéré, une commande conserve son
//   historique même si la fiche disparaît. On les interroge donc à part.
//
// CE QUE LA SUPPRESSION EMPORTE
//   Les questions, les variantes et les visuels de la fiche, par cascade.
//   Les visuels ont déjà été rendus à leur produit par
//   prisma/rendre-visuels.mjs — le script vérifie qu'il n'en reste aucun et
//   refuse s'il en trouve, plutôt que de faire disparaître une photo.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la suppression est définitive ═══\n"
    : "═══ SIMULATION — rien n'est supprimé ═══\n");

  const candidates = await prisma.produitVitrine.findMany({
    where: { publie: false, accessoireSeul: true },
    select: {
      id: true, nom: true,
      gamme: { select: { id: true, nom: true } },
      combinaisons: { select: { referenceBase: true } },
      _count: {
        select: {
          visuels: true, favoris: true, promotions: true, realisations: true,
          optionsLiees: true, optionPour: true, produitsLies: true, liePour: true,
          combinaisons: true, choix: true,
        },
      },
    },
  });

  if (!candidates.length) {
    console.log("Aucune fiche dépubliée par le redécoupage. Rien à faire.");
    return;
  }

  // ── Chaque fiche a-t-elle bien une remplaçante publiée ? ────────────
  const publiees = await prisma.produitVitrine.findMany({
    where: { publie: true },
    select: { nom: true, gammeId: true, combinaisons: { select: { referenceBase: true } } },
  });
  const refsPubliees = new Map();   // gammeId -> Set de références
  const nomsPublies = new Set(publiees.map((v) => v.nom));
  for (const v of publiees) {
    if (!refsPubliees.has(v.gammeId)) refsPubliees.set(v.gammeId, new Set());
    const s = refsPubliees.get(v.gammeId);
    for (const c of v.combinaisons) {
      const r = String(c.referenceBase || "").trim().toUpperCase().split(/[\s*+]/)[0];
      if (r) s.add(r);
    }
  }

  const remplacees = [];
  const sansEquivalent = [];
  for (const v of candidates) {
    const s = refsPubliees.get(v.gamme?.id) || new Set();
    const siennes = [...new Set(v.combinaisons
      .map((c) => String(c.referenceBase || "").trim().toUpperCase().split(/[\s*+]/)[0])
      .filter(Boolean))];
    // Remplacée si son nom existe encore, ou si toutes ses références sont
    // reprises par une fiche publiée de la même gamme.
    const parNom = nomsPublies.has(v.nom);
    const parRefs = siennes.length > 0 && siennes.every((r) => s.has(r));
    if (parNom || parRefs) remplacees.push({ ...v, parNom, parRefs });
    else sansEquivalent.push(v);
  }

  // ── Les garde-fous ──────────────────────────────────────────────────
  const ids = remplacees.map((v) => v.id);
  const [cmd, devis] = ids.length ? await Promise.all([
    prisma.ligneCommande.count({ where: { vitrineId: { in: ids } } }),
    prisma.ligneDevis.count({ where: { vitrineId: { in: ids } } }),
  ]) : [0, 0];

  const liees = remplacees.filter((v) => v._count.favoris || v._count.promotions
    || v._count.realisations || v._count.optionsLiees || v._count.optionPour
    || v._count.produitsLies || v._count.liePour);
  const avecVisuels = remplacees.filter((v) => v._count.visuels);

  titre(`${remplacees.length} FICHES REMPLACÉES, PRÊTES À PARTIR`);
  const parGamme = new Map();
  for (const v of remplacees) {
    const g = v.gamme?.nom || "sans gamme";
    if (!parGamme.has(g)) parGamme.set(g, []);
    parGamme.get(g).push(v);
  }
  for (const [g, liste] of [...parGamme].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n   ── ${g} (${liste.length})`);
    for (const v of liste) {
      const motif = v.parNom ? "même nom republié" : "références reprises";
      console.log(`      ${v.nom.replace(/ - .*$/, "").slice(0, 56).padEnd(58)} ${String(v._count.combinaisons).padStart(3)} var. · ${motif}`);
    }
  }

  if (sansEquivalent.length) {
    titre("DÉPUBLIÉES SANS ÉQUIVALENT PUBLIÉ — CONSERVÉES");
    console.log("\n   Aucune fiche publiée ne reprend leur nom ni leurs références.");
    console.log("   On ne les touche pas.\n");
    for (const v of sansEquivalent) {
      console.log(`   ${(v.gamme?.nom || "?").padEnd(14)} ${v.nom.slice(0, 54)}  (${v._count.combinaisons} var.)`);
    }
  }

  const soucis = [];
  if (cmd) soucis.push(`${cmd} ligne(s) de commande citent une de ces fiches`);
  if (devis) soucis.push(`${devis} ligne(s) de devis en citent une`);
  for (const v of liees) {
    soucis.push(`${v.nom} : ${[
      v._count.favoris && `${v._count.favoris} favori(s)`,
      v._count.promotions && `${v._count.promotions} promotion(s)`,
      v._count.realisations && `${v._count.realisations} réalisation(s)`,
      (v._count.optionsLiees + v._count.optionPour) && "liée comme option",
      (v._count.produitsLies + v._count.liePour) && "liée à un autre produit",
    ].filter(Boolean).join(", ")}`);
  }
  for (const v of avecVisuels) {
    soucis.push(`${v.nom} porte encore ${v._count.visuels} visuel(s) — les rendre d'abord`);
  }

  if (soucis.length) {
    titre("QUELQUE CHOSE Y RENVOIE ENCORE — RIEN NE SERA SUPPRIMÉ");
    console.log("");
    for (const s of soucis.slice(0, 20)) console.log(`   ${s}`);
    console.log("\n   Une suppression ne se rattrape pas : on s'arrête.");
    process.exitCode = 1;
    return;
  }

  titre("LE COMPTE");
  const vars = remplacees.reduce((n, v) => n + v._count.combinaisons, 0);
  const qs = remplacees.reduce((n, v) => n + v._count.choix, 0);
  console.log(`   ${remplacees.length} fiches · ${vars} variantes · ${qs} questions partiraient`);
  console.log(`   ${sansEquivalent.length} fiche(s) conservée(s), sans équivalent publié`);
  console.log("   aucune commande, aucun devis, aucun favori, aucun visuel en jeu");

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour supprimer définitivement.");
    return;
  }

  titre("SUPPRESSION");
  const { count } = await prisma.produitVitrine.deleteMany({ where: { id: { in: ids } } });
  console.log(`   ${count} fiches supprimées.`);

  titre("CONTRÔLE");
  const restantes = await prisma.produitVitrine.count({ where: { publie: false } });
  const pub = await prisma.produitVitrine.count({ where: { publie: true } });
  const orphelins = await prisma.visuel.count({ where: { vitrine: { publie: false } } });
  console.log(`   fiches publiées : ${pub} · dépubliées restantes : ${restantes} · visuels orphelins : ${orphelins}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
