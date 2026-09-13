import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Retire définitivement des produits du catalogue.
//
// La suppression efface la fiche, ses déclinaisons, ses prix et ses
// liens avec les accessoires. Elle est irréversible.
//
// Avant de supprimer, le script affiche les références du produit et
// cherche d'autres fiches qui les partagent : c'est ce qui distingue un
// vrai doublon d'un produit distinct au nom voisin.

const APPLIQUER = process.argv.includes("--appliquer");

const A_SUPPRIMER = [
  // Doublon de « Coussin d'assise pour caisson », qui porte les mêmes
  // références Comfort et a récupéré dix visuels à l'import. Celui-ci
  // n'est rattaché à aucun produit et occupe une carte au catalogue.
  "Coussin d'assise",
];

const refsDe = (v) => {
  const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
  return [
    ...(v.referenceUnitaire ? [v.referenceUnitaire] : []),
    ...decl.map((d) => d.referenceFournisseur).filter(Boolean),
  ].map((r) => String(r).trim().toUpperCase());
};

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — suppression définitive ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  for (const nom of A_SUPPRIMER) {
    // Le nom doit correspondre exactement : « Coussin d'assise » ne doit
    // pas attraper « Coussin d'assise pour caisson ».
    const v = await prisma.produitVitrine.findFirst({
      where: { nom: { equals: nom } },
      include: {
        gamme: { select: { nom: true, marque: { select: { id: true, nom: true } } } },
        optionPour: { select: { nom: true } },
      },
    });

    if (!v) { console.log(`✗ ${nom} — introuvable`); continue; }

    const decl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
    const refs = refsDe(v);
    const nbImages = (Array.isArray(v.images) ? v.images.length : 0) + (v.imageUrl ? 1 : 0);

    console.log(`▸ ${v.nom}`);
    console.log(`   ${v.gamme.marque?.nom} · ${v.gamme.nom} · ${decl} déclinaison(s) · ${v.publie ? "publié" : "brouillon"}`);
    console.log(`   ${nbImages} image(s) · références : ${refs.join(", ") || "aucune"}`);

    if (v.optionPour.length) {
      console.log(`   option de : ${v.optionPour.map((p) => p.nom).slice(0, 3).join(", ")}`);
    } else {
      console.log(`   rattaché à aucun produit`);
    }

    // Recherche des fiches qui partagent ses références : un doublon les
    // reprend toutes, un produit distinct n'en partage aucune.
    if (refs.length) {
      const autres = await prisma.produitVitrine.findMany({
        where: {
          gamme: { marqueId: v.gamme.marque.id },
          id: { not: v.id },
        },
        select: {
          nom: true, referenceUnitaire: true, declinaisons: true,
          imageUrl: true, images: true,
        },
      });

      const jumeaux = autres.filter((a) => {
        const r = refsDe(a);
        return refs.some((x) => r.includes(x));
      });

      if (jumeaux.length) {
        console.log(`\n   Fiche(s) partageant ses références :`);
        for (const j of jumeaux) {
          const n = (Array.isArray(j.images) ? j.images.length : 0) + (j.imageUrl ? 1 : 0);
          console.log(`      ${j.nom} — ${n} image(s)`);
        }
        console.log(`   → doublon confirmé`);
      } else {
        console.log(`\n   ⚠ aucune autre fiche ne porte ses références — ce n'est pas un doublon`);
      }
    }

    if (!APPLIQUER) { console.log(""); continue; }

    await prisma.produitVitrine.delete({ where: { id: v.id } });
    console.log(`\n   ✓ supprimé\n`);
  }

  if (!APPLIQUER) {
    console.log("node prisma\\supprimer-produits.mjs --appliquer");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());