import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// APPLIQUE le renommage "Type + Gamme" sur le NOM de chaque produit.
// - Ne touche JAMAIS au slug → les URLs publiques ne changent pas.
// - Idempotent : si le nom contient déjà la gamme, il est laissé tel quel
//   (relançable sans risque de doubler la gamme).
// ─────────────────────────────────────────────────────────────

function proposer(nom, gammeNom) {
  const base = (nom || "").trim();
  const g = (gammeNom || "").trim();
  if (!g) return base;
  if (base.toLowerCase().includes(g.toLowerCase())) return base;
  return `${base} ${g}`;               // "Type + Gamme"
}

async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
    select: { id: true, nom: true, gamme: { select: { nom: true } } },
  });

  let modifies = 0, inchanges = 0;
  for (const v of vitrines) {
    const propose = proposer(v.nom, v.gamme?.nom || "");
    if (propose === v.nom) { inchanges++; continue; }
    await prisma.produitVitrine.update({ where: { id: v.id }, data: { nom: propose } });
    console.log(`  ✓ "${v.nom}"  →  "${propose}"`);
    modifies++;
  }

  console.log(`\n════════════════════════════════`);
  console.log(`Total : ${vitrines.length} produits`);
  console.log(`Renommés : ${modifies}   |   Inchangés : ${inchanges}`);
  console.log(`(Slugs et URLs inchangés.)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
