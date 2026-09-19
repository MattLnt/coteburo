// Purge du catalogue produit en base.
//
// En simulation par défaut : le script dit ce qu'il supprimerait, sans rien
// écrire. Il faut --appliquer pour qu'il agisse.
//
//   node prisma/purge-catalogue.mjs
//   node prisma/purge-catalogue.mjs --appliquer
//
// CE QUI PART
//   fiches vitrine et leurs déclinaisons, gammes, catégories et
//   sous-catégories, groupes de finition et finitions, palettes et modèles
//   de finition, produits tarifaires et variantes.
//   Avec eux : commandes, devis, favoris et promotions, qui pointent sur
//   des produits et n'auraient plus de sens — le client a confirmé qu'il
//   s'agit de tests.
//
// CE QUI RESTE
//   les trois marques, qui portent les slugs et les remises et que l'import
//   réutilisera ; les utilisateurs ; les articles de blog ; les
//   réalisations ; les paliers d'installation.
//
// L'ordre compte : on descend des feuilles vers les racines, sinon une
// contrainte de clé étrangère bloque. Les suppressions en cascade déclarées
// au schéma font le reste.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// Chaque étape : un libellé, le compteur d'avant, et l'action.
const ETAPES = [
  ["lignes de commande", () => prisma.ligneCommande.count(), () => prisma.ligneCommande.deleteMany()],
  ["commandes", () => prisma.commande.count(), () => prisma.commande.deleteMany()],
  ["lignes de devis", () => prisma.ligneDevis.count(), () => prisma.ligneDevis.deleteMany()],
  ["devis", () => prisma.devis.count(), () => prisma.devis.deleteMany()],
  ["favoris", () => prisma.favori.count(), () => prisma.favori.deleteMany()],
  ["promotions ↔ fiches", () => prisma.promotionVitrine.count(), () => prisma.promotionVitrine.deleteMany()],
  ["promotions ↔ produits", () => prisma.promotionProduit.count(), () => prisma.promotionProduit.deleteMany()],
  ["promotions", () => prisma.promotion.count(), () => prisma.promotion.deleteMany()],
  ["variantes", () => prisma.variante.count(), () => prisma.variante.deleteMany()],
  ["produits tarifaires", () => prisma.produit.count(), () => prisma.produit.deleteMany()],
  ["finitions", () => prisma.finition.count(), () => prisma.finition.deleteMany()],
  ["groupes de finition", () => prisma.groupeFinition.count(), () => prisma.groupeFinition.deleteMany()],
  ["modèles de finition", () => prisma.finitionModele.count(), () => prisma.finitionModele.deleteMany()],
  ["palettes de finition", () => prisma.paletteFinition.count(), () => prisma.paletteFinition.deleteMany()],
  ["fiches vitrine", () => prisma.produitVitrine.count(), () => prisma.produitVitrine.deleteMany()],
  ["sous-catégories", () => prisma.sousCategorie.count(), () => prisma.sousCategorie.deleteMany()],
  ["catégories", () => prisma.categorie.count(), () => prisma.categorie.deleteMany()],
  ["gammes", () => prisma.gamme.count(), () => prisma.gamme.deleteMany()],
];

// Ce qu'on ne touche pas : on le compte avant et après, pour le prouver.
const TEMOINS = [
  ["marques", () => prisma.marque.count()],
  ["utilisateurs", () => prisma.user.count()],
  ["articles", () => prisma.article.count()],
  ["réalisations", () => prisma.realisation.count()],
  ["paliers d'installation", () => prisma.palierInstallation.count()],
];

async function releve(liste) {
  const out = {};
  for (const [nom, compte] of liste) out[nom] = await compte();
  return out;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les suppressions sont écrites ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const avantTemoins = await releve(TEMOINS);

  console.log("── À SUPPRIMER ──\n");
  let total = 0;
  const avant = [];
  for (const [nom, compte] of ETAPES) {
    const n = await compte();
    avant.push([nom, n]);
    total += n;
    console.log(`   ${nom.padEnd(24)} ${String(n).padStart(6)}`);
  }
  console.log(`   ${"─".repeat(31)}`);
  console.log(`   ${"total".padEnd(24)} ${String(total).padStart(6)} enregistrements`);

  // Les déclinaisons vivent en JSON sur la fiche : elles partent avec elle.
  const vitrines = await prisma.produitVitrine.findMany({ select: { declinaisons: true } });
  const decl = vitrines.reduce(
    (n, v) => n + (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0), 0);
  console.log(`   ${"dont déclinaisons JSON".padEnd(24)} ${String(decl).padStart(6)} (portées par les fiches)`);

  console.log("\n── À CONSERVER ──\n");
  for (const [nom, n] of Object.entries(avantTemoins)) {
    console.log(`   ${nom.padEnd(24)} ${String(n).padStart(6)}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour exécuter.");
    return;
  }

  console.log("\n── EXÉCUTION ──\n");
  for (const [nom, , supprime] of ETAPES) {
    const r = await supprime();
    console.log(`   ${nom.padEnd(24)} ${String(r.count ?? 0).padStart(6)} supprimé(s)`);
  }

  console.log("\n── CONTRÔLE APRÈS PURGE ──\n");
  let reste = 0;
  for (const [nom, compte] of ETAPES) {
    const n = await compte();
    reste += n;
    if (n) console.log(`   ⚠ ${nom} : ${n} enregistrement(s) subsistent`);
  }
  console.log(`   catalogue restant : ${reste}`);

  const apresTemoins = await releve(TEMOINS);
  let intacts = true;
  for (const [nom, n] of Object.entries(apresTemoins)) {
    const a = avantTemoins[nom];
    if (a !== n) {
      intacts = false;
      console.log(`   ⚠ ${nom} : ${a} → ${n}`);
    }
  }
  console.log(intacts
    ? "   éléments conservés : tous intacts"
    : "   ⚠ des éléments à conserver ont bougé, voir ci-dessus");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
