import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// EXPORT APERÇU → CSV ouvrable dans Excel. Ne modifie PAS la base.
// Colonnes : Marque | Gamme | Nom actuel | Nom proposé | Modifié
// Format proposé : "Type + Gamme". Idempotent (ne double pas la gamme).
// ─────────────────────────────────────────────────────────────

function proposer(nom, gammeNom) {
  const base = (nom || "").trim();
  const g = (gammeNom || "").trim();
  if (!g) return base;
  if (base.toLowerCase().includes(g.toLowerCase())) return base;
  return `${base} ${g}`;               // "Type + Gamme"
  // return `${g} — ${base}`;          // variante "Gamme + Type"
}

// Échappe un champ CSV (délimiteur ';', pour Excel FR)
function c(val) {
  const s = String(val ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    orderBy: [{ gamme: { marque: { nom: "asc" } } }, { gamme: { nom: "asc" } }, { nom: "asc" }],
    select: { nom: true, gamme: { select: { nom: true, marque: { select: { nom: true } } } } },
  });

  const lignes = [["Marque", "Gamme", "Nom actuel", "Nom proposé", "Modifié"]];
  let changent = 0;

  for (const v of vitrines) {
    const marque = v.gamme?.marque?.nom || "";
    const gammeNom = v.gamme?.nom || "";
    const propose = proposer(v.nom, gammeNom);
    const modifie = propose !== v.nom;
    if (modifie) changent++;
    lignes.push([marque, gammeNom, v.nom, propose, modifie ? "oui" : "non"]);
  }

  // BOM UTF-8 pour qu'Excel affiche bien les accents
  const csv = "\uFEFF" + lignes.map((row) => row.map(c).join(";")).join("\r\n");
  const chemin = "renommage-produits.csv";
  writeFileSync(chemin, csv, "utf8");

  console.log(`✓ Fichier généré : ${chemin} (à la racine du projet)`);
  console.log(`  ${vitrines.length} produits — ${changent} seraient renommés, ${vitrines.length - changent} inchangés.`);
  console.log(`  Ouvre-le dans Excel pour voir le rendu. (La base n'a PAS été modifiée.)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
