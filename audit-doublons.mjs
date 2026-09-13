import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Avant de fusionner quoi que ce soit, il faut voir ce que chaque fiche
// apporte. Les anciennes portent souvent les photos, les nouvelles la
// structure — l'une ne remplace pas l'autre.
//
// Ce rapport liste, gamme par gamme, ce que contient chaque produit.

async function main() {
  const lignes = [];
  const dire = (s = "") => lignes.push(s);

  const marques = await prisma.marque.findMany({
    where: { slug: { in: ["buronomic", "sokoa"] } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  for (const m of marques) {
    dire(`\n\n# ${m.nom.toUpperCase()}`);

    const gammes = await prisma.gamme.findMany({
      where: { marqueId: m.id },
      orderBy: { nom: "asc" },
      include: {
        vitrines: {
          orderBy: { nom: "asc" },
          include: {
            optionsLiees: { select: { id: true } },
            optionPour: { select: { nom: true } },
            groupesFinition: { select: { nom: true, _count: { select: { finitions: true } } } },
            categories: { select: { nom: true, estOption: true } },
          },
        },
      },
    });

    for (const g of gammes) {
      if (!g.vitrines.length) continue;

      dire(`\n## ${g.nom}${g.publie ? "" : "  (gamme non publiée)"}`);

      for (const v of g.vitrines) {
        const decl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
        const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
        const sections = Array.isArray(v.sectionsDevis) ? v.sectionsDevis.length : 0;
        const images = (v.images?.length || 0) + (v.imageUrl && !v.images?.includes(v.imageUrl) ? 1 : 0);
        const estOption = v.categories.some((c) => c.estOption);

        dire(`\n### ${v.nom}`);
        dire(`- publié : ${v.publie}${estOption ? " · accessoire" : ""}`);

        if (v.sansDeclinaisons) {
          dire(`- prix unique : tarif ${v.prixUnitaireTarifHT ?? "—"} · vente ${v.prixUnitaireHT ?? "—"}`);
        } else {
          dire(`- ${decl} déclinaison(s) sur ${axes.length} axe(s) : ${axes.map((a) => a.nom).join(", ") || "aucun"}`);
        }

        dire(`- ${sections} section(s) descriptive(s) · ${v.descriptif ? "descriptif rempli" : "pas de descriptif"}`);
        dire(`- ${images} image(s)`);
        dire(`- ${v.optionsLiees.length} accessoire(s) rattaché(s)`);

        if (v.optionPour.length) {
          dire(`- utilisé comme accessoire par : ${v.optionPour.map((p) => p.nom).join(", ")}`);
        }

        if (v.groupesFinition.length) {
          const gf = v.groupesFinition.map((x) => `${x.nom} (${x._count.finitions})`).join(", ");
          dire(`- finitions : ${gf}`);
        }

        // Les finitions rattachées aux valeurs d'axe ne sont pas en table.
        const parValeur = axes.filter((a) => a.finitionsParValeur);
        if (parValeur.length) {
          const d = parValeur
            .map((a) => `${a.nom} → ${Object.keys(a.finitionsParValeur).length} nuancier(s)`)
            .join(", ");
          dire(`- nuanciers par valeur : ${d}`);
        }

        dire(`- dimensions : L ${v.largeurMin ?? "—"}-${v.largeurMax ?? "—"} · H ${v.hauteurMin ?? "—"}-${v.hauteurMax ?? "—"} · P ${v.profondeurMin ?? "—"}-${v.profondeurMax ?? "—"}`);
      }
    }
  }

  await writeFile("audit-doublons.md", lignes.join("\n"), "utf8");
  console.log("Écrit dans audit-doublons.md");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());