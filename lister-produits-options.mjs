import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sort l'inventaire complet : chaque produit avec ses accessoires rattachés,
// groupé par marque puis par gamme. Écrit aussi un fichier markdown, plus
// pratique à parcourir qu'une sortie de terminal de plusieurs centaines
// de lignes.

const prix = (p) => (p == null ? "—" : `${p} €`);

async function main() {
  const marques = await prisma.marque.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  const lignes = [];
  const dire = (s = "") => { console.log(s); lignes.push(s); };

  for (const m of marques) {
    const gammes = await prisma.gamme.findMany({
      where: { marqueId: m.id },
      orderBy: { nom: "asc" },
      include: {
        vitrines: {
          orderBy: { nom: "asc" },
          include: {
            optionsLiees: {
              orderBy: { nom: "asc" },
              select: {
                nom: true, sansDeclinaisons: true,
                prixUnitaireTarifHT: true, prixUnitaireHT: true,
                declinaisons: true,
              },
            },
            categories: { select: { nom: true, estOption: true } },
          },
        },
      },
    });

    const avecProduits = gammes.filter((g) => g.vitrines.length > 0);
    if (!avecProduits.length) continue;

    dire(`\n\n# ${m.nom.toUpperCase()}`);

    for (const g of avecProduits) {
      // Les gammes d'accessoires se listent à part, en fin de marque.
      const estGammeAccessoires = g.vitrines.every((v) =>
        v.categories.some((c) => c.estOption)
      );
      if (estGammeAccessoires) continue;

      dire(`\n## ${g.nom}${g.publie ? "" : "  — non publiée"}`);

      for (const v of g.vitrines) {
        const nbDecl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
        const detail = v.sansDeclinaisons
          ? prix(v.prixUnitaireHT ?? v.prixUnitaireTarifHT)
          : `${nbDecl} déclinaison(s)`;

        dire(`\n**${v.nom}** — ${detail}${v.publie ? "" : " · non publié"}`);

        if (v.optionsLiees.length === 0) {
          dire(`   aucun accessoire rattaché`);
          continue;
        }

        for (const o of v.optionsLiees) {
          let p;
          if (o.sansDeclinaisons) {
            p = prix(o.prixUnitaireHT ?? o.prixUnitaireTarifHT);
          } else {
            const d = Array.isArray(o.declinaisons) ? o.declinaisons : [];
            const montants = d.map((x) => x.prixVenteHT || x.prixTarifHT).filter(Boolean);
            p = montants.length ? `${montants.join(" / ")} €` : "—";
          }
          dire(`   · ${o.nom} — ${p}`);
        }
      }
    }

    // Gammes d'accessoires, listées sans leurs propres liaisons.
    for (const g of avecProduits) {
      const estGammeAccessoires = g.vitrines.every((v) =>
        v.categories.some((c) => c.estOption)
      );
      if (!estGammeAccessoires) continue;

      dire(`\n## ${g.nom} — ${g.vitrines.length} accessoire(s)`);
      for (const v of g.vitrines) {
        const nbDecl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
        const p = v.sansDeclinaisons
          ? prix(v.prixUnitaireHT ?? v.prixUnitaireTarifHT)
          : `${nbDecl} déclinaison(s)`;
        dire(`   · ${v.nom} — ${p}`);
      }
    }
  }

  await writeFile("inventaire-produits-options.md", lignes.join("\n"), "utf8");
  console.log(`\n\n═══ Écrit dans inventaire-produits-options.md ═══`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());