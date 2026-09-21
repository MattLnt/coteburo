// Sauvegarde intégrale de la base, table par table.
//
//   node prisma/sauvegarder-base.mjs
//   node prisma/sauvegarder-base.mjs --verifier=prisma/sauvegardes/base-….json
//
// POURQUOI CELLE-CI PLUTÔT QUE « sauvegarder-catalogue »
//   L'autre ne garde que ce qui allait disparaître à la purge de septembre.
//   Celle-ci ne choisit pas : elle vide chaque table dans un JSON, sans
//   jointure ni mise en forme, de quoi remonter la base telle quelle.
//
//   Aucune donnée n'est réécrite ni tronquée. Les identifiants sont ceux de
//   la base, les relations tiennent donc toutes seules au remontage.
//
// CE QU'ELLE NE CONTIENT PAS
//   Les secrets de connexion, jamais lus ni écrits ici : le script prend
//   l'URL dans l'environnement et n'en dit rien.
//
// VÉRIFICATION
//   --verifier relit un fichier de sauvegarde et le confronte aux comptes
//   actuels. À lancer après coup : une sauvegarde qu'on n'a pas vérifiée
//   n'est pas une sauvegarde.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, readFile } from "node:fs/promises";

const prisma = new PrismaClient();
const DOSSIER = "prisma/sauvegardes";
const VERIFIER = (process.argv.find((a) => a.startsWith("--verifier=")) || "").slice(11) || null;

// Toutes les tables du schéma. L'ordre est celui du remontage : un parent
// avant ses enfants, pour qu'une restauration naïve ne bute pas sur une clé
// étrangère.
const TABLES = [
  "reglages", "palierInstallation", "user", "resetPasswordToken",
  "marque", "categorie", "sousCategorie", "gamme",
  "paletteFinition", "finitionModele",
  "produitVitrine", "groupeFinition", "finition",
  "produit", "variante",
  "promotion", "promotionProduit", "promotionVitrine",
  "realisation", "article", "favori",
  "commande", "ligneCommande", "devis", "ligneDevis",
];

const titre = (t) => console.log(`\n${"═".repeat(70)}\n${t}\n${"═".repeat(70)}`);

async function compter() {
  const out = {};
  for (const t of TABLES) out[t] = await prisma[t].count();
  return out;
}

async function verifier(chemin) {
  const sauvegarde = JSON.parse(await readFile(chemin, "utf8"));
  const actuels = await compter();
  titre("VÉRIFICATION");
  console.log(`\n   fichier : ${chemin}`);
  console.log(`   écrit le ${sauvegarde.date}\n`);
  let ecarts = 0;
  for (const t of TABLES) {
    const dans = (sauvegarde.tables[t] || []).length;
    const base = actuels[t];
    const signe = dans === base ? "  " : dans < base ? "←−" : "−→";
    if (dans !== base) ecarts += 1;
    console.log(`   ${t.padEnd(22)} sauvegarde ${String(dans).padStart(6)} ${signe} base ${String(base).padStart(6)}`);
  }
  console.log(ecarts
    ? `\n   ${ecarts} table(s) ont bougé depuis la sauvegarde.`
    : `\n   Tout concorde : la sauvegarde est fidèle à la base.`);
}

async function main() {
  if (VERIFIER) return verifier(VERIFIER);

  await mkdir(DOSSIER, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const chemin = `${DOSSIER}/base-complete-${horodatage}.json`;

  titre("SAUVEGARDE INTÉGRALE");
  console.log("");
  const tables = {};
  let total = 0;
  for (const t of TABLES) {
    tables[t] = await prisma[t].findMany();
    total += tables[t].length;
    console.log(`   ${t.padEnd(22)} ${String(tables[t].length).padStart(6)} lignes`);
  }

  const contenu = {
    _lisezmoi: [
      "Sauvegarde intégrale de la base Côté BURO.",
      "",
      "Une entrée par table, dans l'ordre de remontage : un parent avant",
      "ses enfants. Les identifiants sont ceux de la base, les relations",
      "se rétablissent donc d'elles-mêmes.",
      "",
      "Prise avant la migration vers le modèle produit à choix, valeurs,",
      "combinaisons et visuels.",
    ],
    date: new Date().toISOString(),
    ordreDeRemontage: TABLES,
    tables,
  };

  await writeFile(chemin, JSON.stringify(contenu, null, 2), "utf8");

  titre("ÉCRIT");
  console.log(`\n   ${chemin}`);
  console.log(`   ${TABLES.length} tables · ${total} lignes`);
  console.log(`\n   Vérifier :`);
  console.log(`   node prisma/sauvegarder-base.mjs --verifier=${chemin}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
