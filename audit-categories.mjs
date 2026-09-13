import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Vérifie le rattachement des produits Buronomic à la taxonomie du site.
//
// Les imports ont posé des noms de catégories devinés d'après le
// catalogue papier. Sur Sokoa, ils ne correspondaient à rien : les
// produits se retrouvaient invisibles dans la navigation. Avant de
// corriger, on regarde ce qui existe et où va chaque gamme.

(async () => {
  // La taxonomie est commune à toutes les marques.
  const categories = await prisma.categorie.findMany({
    orderBy: { nom: "asc" },
    include: {
      sousCategories: {
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, _count: { select: { vitrines: true } } },
      },
      _count: { select: { vitrines: true } },
    },
  });

  const rapport = [
    `# Catégories Buronomic`,
    ``,
    `Lancé le ${new Date().toLocaleString("fr-FR")}`,
    ``,
    `## Taxonomie du site\n`,
  ];

  console.log("═══ TAXONOMIE ═══\n");
  for (const c of categories) {
    console.log(`${c.nom.padEnd(22)} ${c._count.vitrines} produit(s)`);
    rapport.push(`\n### ${c.nom} — ${c._count.vitrines} produit(s)\n`);
    for (const s of c.sousCategories) {
      console.log(`   ${s.nom.padEnd(26)} ${s._count.vitrines}`);
      rapport.push(`- ${s.nom} — ${s._count.vitrines} produit(s)`);
    }
    if (!c.sousCategories.length) rapport.push(`_Aucune sous-catégorie._`);
  }

  // ── Rattachement par gamme ──
  const marque = await prisma.marque.findFirst({
    where: { slug: "buronomic" },
    select: { id: true },
  });

  const gammes = await prisma.gamme.findMany({
    where: { marqueId: marque.id },
    orderBy: { nom: "asc" },
    include: {
      vitrines: {
        select: {
          nom: true,
          publie: true,
          categories: { select: { nom: true, estOption: true } },
          sousCategories: { select: { nom: true } },
        },
      },
    },
  });

  rapport.push(`\n---\n`);
  rapport.push(`## Rattachement par gamme\n`);

  console.log("\n\n═══ RATTACHEMENT PAR GAMME ═══\n");

  let sansSousCat = 0;

  for (const g of gammes) {
    const produits = g.vitrines.filter((v) => !v.categories.some((c) => c.estOption));
    if (!produits.length) continue;

    // On regroupe par couple catégorie / sous-catégorie : une gamme
    // homogène ne doit donner qu'une seule combinaison.
    const combos = new Map();
    for (const v of produits) {
      const cat = v.categories.map((c) => c.nom).join(" + ") || "—";
      const sous = v.sousCategories.map((s) => s.nom).join(" + ") || "aucune";
      const cle = `${cat} › ${sous}`;
      combos.set(cle, (combos.get(cle) || 0) + 1);
      if (!v.sousCategories.length) sansSousCat++;
    }

    console.log(`${g.nom} — ${produits.length} produit(s)`);
    rapport.push(`\n### ${g.nom} — ${produits.length} produit(s)\n`);

    for (const [cle, n] of combos) {
      console.log(`   ${cle}  (${n})`);
      rapport.push(`- ${cle} — ${n} produit(s)`);
    }
  }

  await writeFile("audit-categories.md", rapport.join("\n"), "utf8");

  console.log(`\n\n${sansSousCat} produit(s) Buronomic sans sous-catégorie.`);
  console.log(`Détail dans audit-categories.md`);

  process.exit(0);
})();