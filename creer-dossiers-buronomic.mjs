import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Crée l'arborescence de rangement des photos Buronomic : un dossier par
// gamme, un sous-dossier par produit, plus un README qui rappelle la
// convention de nommage et liste les références attendues.
//
// Chez Sokoa, les fichiers portaient déjà la référence du produit, ce qui
// a permis un rattachement automatique. On reproduit cette logique : en
// nommant chaque photo d'après la référence qu'elle montre, l'import
// saura où la poser sans intervention.
//
// Les références figurent à tous les niveaux — sommaire, gamme, produit —
// pour éviter d'avoir à les rechercher ailleurs au moment de nommer.

const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Buronomic";

// Un nom de dossier ne peut pas contenir ces caractères sous Windows.
function nomDossier(s) {
  return (s || "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// Un aperçu court des références, pour les listes.
// Au-delà de six, on tronque : la liste complète est dans le README du produit.
function apercuRefs(refs) {
  if (!refs.length) return "sur devis";
  if (refs.length <= 6) return refs.join(" · ");
  return `${refs.slice(0, 6).join(" · ")} … +${refs.length - 6}`;
}

async function main() {
  const marque = await prisma.marque.findFirst({
    where: { slug: "buronomic" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Buronomic introuvable."); return; }

  const gammes = await prisma.gamme.findMany({
    where: { marqueId: marque.id },
    orderBy: { nom: "asc" },
    include: {
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          nom: true, sansDeclinaisons: true,
          referenceUnitaire: true, declinaisons: true, axesDeclinaisons: true,
          categories: { select: { estOption: true } },
        },
      },
    },
  });

  await mkdir(RACINE, { recursive: true });

  let nbGammes = 0, nbProduits = 0;

  const sommaire = [
    `# Photos Buronomic — où ranger quoi`,
    ``,
    `Un dossier par gamme, un sous-dossier par produit.`,
    ``,
    `## Comment nommer les fichiers`,
    ``,
    `Le nom doit commencer par la référence du produit photographié.`,
    `Tout ce qui suit est libre : c'est le début qui compte.`,
    ``,
    "```",
    `AR95.jpg                     vue principale`,
    `AR95_dos.jpg                 autre angle`,
    `AR95_chene.jpg               une finition précise`,
    `AR96_detail-goulotte.jpg     un détail`,
    "```",
    ``,
    `La première photo d'une référence devient la vignette du produit.`,
    `Les suivantes alimentent la galerie, dans l'ordre alphabétique.`,
    ``,
    `## Les photos d'ambiance`,
    ``,
    `Elles montrent le produit en situation et n'ont pas de référence.`,
    `Préfixez-les par « amb » :`,
    ``,
    "```",
    `amb_open-space.jpg`,
    `amb_salle-reunion.jpg`,
    "```",
    ``,
    `Elles seront placées en fin de galerie.`,
    ``,
    `## Ce qui est ignoré`,
    ``,
    `Un fichier dont le nom ne commence ni par une référence connue ni`,
    `par « amb » sera laissé de côté, sans erreur.`,
    ``,
    `---`,
    ``,
  ];

  for (const g of gammes) {
    // Les accessoires n'ont pas vocation à figurer au catalogue : leurs
    // photos sont facultatives, on ne crée pas de dossier pour eux.
    const produits = g.vitrines.filter((v) => !v.categories.some((c) => c.estOption));
    if (!produits.length) continue;

    const dossierGamme = join(RACINE, nomDossier(g.nom));
    await mkdir(dossierGamme, { recursive: true });
    nbGammes++;

    sommaire.push(`## ${g.nom}`);
    sommaire.push(``);

    const lignesGamme = [
      `# ${g.nom}`,
      ``,
      `Déposez les photos dans le sous-dossier du produit concerné.`,
      `Nommez chaque fichier d'après la référence qu'il montre.`,
      ``,
    ];

    for (const v of produits) {
      const dossierProduit = join(dossierGamme, nomDossier(v.nom));
      await mkdir(dossierProduit, { recursive: true });
      nbProduits++;

      const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
      const refs = v.sansDeclinaisons
        ? [v.referenceUnitaire].filter(Boolean)
        : [...new Set(decl.map((d) => d.referenceFournisseur).filter(Boolean))];

      const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];

      // ── README du produit ──
      const lignes = [
        `# ${v.nom}`,
        ``,
        `**Gamme** ${g.nom}`,
        `**Références** ${refs.length ? refs.join(" · ") : "aucune — vente sur devis"}`,
        ``,
      ];

      if (axes.length) {
        lignes.push(`## Axes de configuration`, ``);
        axes.forEach((a) => lignes.push(`- **${a.nom}** : ${(a.valeurs || []).join(" · ")}`));
        lignes.push(``);
      }

      if (refs.length) {
        lignes.push(`## Ce que chaque référence désigne`, ``);

        if (!v.sansDeclinaisons && axes.length) {
          const vues = new Set();
          for (const d of decl) {
            const r = d.referenceFournisseur;
            if (!r || vues.has(r)) continue;
            vues.add(r);
            const combi = axes
              .map((a) => (d.valeurs || {})[a.id])
              .filter(Boolean)
              .join(" · ");
            lignes.push(`- \`${r}\` — ${combi}`);
          }
        } else {
          refs.forEach((r) => lignes.push(`- \`${r}\``));
        }
        lignes.push(``);
      } else {
        lignes.push(
          `## Aucune référence`, ``,
          `Ce produit est vendu sur devis. Nommez les fichiers librement,`,
          `ils seront rattachés dans l'ordre alphabétique.`, ``,
        );
      }

      lignes.push(
        `## Exemples de nommage`,
        ``,
        "```",
        refs.length
          ? [
              `${refs[0]}.jpg                 vue principale`,
              `${refs[0]}_dos.jpg             autre angle`,
              `${refs[0]}_chene.jpg           une finition`,
              refs.length > 1 ? `${refs[1]}.jpg                 autre référence` : null,
              `amb_open-space.jpg    ambiance`,
            ].filter(Boolean).join("\n")
          : `01-principale.jpg\n02-dos.jpg\namb_open-space.jpg`,
        "```",
        ``,
        `La première photo devient la vignette du produit.`,
      );

      await writeFile(join(dossierProduit, "_LISEZ-MOI.md"), lignes.join("\n"), "utf8");

      // Les références apparaissent dans le sommaire et dans le README de
      // gamme : plus besoin d'ouvrir chaque dossier pour les retrouver.
      sommaire.push(`**${v.nom}**`);
      sommaire.push(`   ${apercuRefs(refs)}`);
      sommaire.push(``);

      lignesGamme.push(`### ${v.nom}`);
      lignesGamme.push(``);
      lignesGamme.push(refs.length ? refs.map((r) => `\`${r}\``).join(" · ") : "_vente sur devis_");
      lignesGamme.push(``);
    }

    await writeFile(join(dossierGamme, "_LISEZ-MOI.md"), lignesGamme.join("\n"), "utf8");
  }

  await writeFile(join(RACINE, "_LISEZ-MOI.md"), sommaire.join("\n"), "utf8");

  console.log(`${nbGammes} gamme(s) · ${nbProduits} dossier(s) produit.`);
  console.log(`\nArborescence dans :\n   ${RACINE}`);
  console.log(`\nLes références figurent dans les trois niveaux de _LISEZ-MOI.md.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());