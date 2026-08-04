import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "Ergonomie";

// Teintes métal
const M3 = [
  { nom: "Aluminium",   couleur: "#9a9a94", ordre: 0 },
  { nom: "Noir métal",  couleur: "#23262a", ordre: 1 },
  { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 2 },
];
const M_NOIR = [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }];

// 7 accessoires à référence unique (prix = tarif fournisseur Buronomic)
const ACCESSOIRES = [
  { nom: "Bras support 1 écran - simple extension",              prix: "273", ref: "DL06", metal: M3 },
  { nom: "Bras support écran double - 2 bras simple extension",  prix: "493", ref: "DL08", metal: M3 },
  { nom: "Bras support 1 écran - double extension",              prix: "143", ref: "EE41", metal: M_NOIR },
  { nom: "Bras support 2 écrans - simple extension",             prix: "524", ref: "EE95", metal: M3 },
  { nom: "Poignée de déplacement",                               prix: "61",  ref: "EE96", metal: M_NOIR },
  { nom: "Lampe de bureau 108 LEDs",                             prix: "596", ref: "EE98", metal: M3 },
  { nom: "Lampe de bureau 49 LEDs",                              prix: "576", ref: "EE99", metal: M3 },
];

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`);
    console.error(gammes.map((g) => ` - ${g.nom}`).join("\n"));
    process.exit(1);
  }

  const produits = await prisma.produitVitrine.findMany({
    where: { gammeId: gamme.id },
    select: { id: true, nom: true },
  });

  let ok = 0;
  const manquants = [];

  for (const acc of ACCESSOIRES) {
    const vitrine = produits.find((p) => norm(p.nom) === norm(acc.nom));
    if (!vitrine) {
      manquants.push(acc.nom);
      continue;
    }

    // Accessoire à référence unique : aucun axe, une seule déclinaison
    await prisma.produitVitrine.update({
      where: { id: vitrine.id },
      data: {
        axesDeclinaisons: [],
        declinaisons: [
          {
            id: uid(),
            valeurs: {},
            prixTarifHT: acc.prix,
            prixVenteHT: "",
            prixVerrouille: false,
            referenceFournisseur: acc.ref,
          },
        ],
      },
    });

    // Finitions (structure métal, sans impact prix)
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
    await prisma.groupeFinition.create({
      data: {
        nom: "Structure métal",
        vitrineId: vitrine.id,
        ordre: 0,
        finitions: { create: acc.metal },
      },
    });

    ok++;
    console.log(`  ✓ ${acc.nom} (${acc.ref}, ${acc.prix}€)`);
  }

  if (manquants.length) {
    console.error(`\n⚠ ${manquants.length} produit(s) introuvable(s) dans la gamme "${gamme.nom}" — crée-les d'abord avec le nom exact :`);
    console.error(manquants.map((n) => ` - ${n}`).join("\n"));
    console.error(`\nProduits actuellement présents dans la gamme :`);
    console.error(produits.map((p) => ` - ${p.nom}`).join("\n"));
  }

  console.log(`\n✓ ${ok}/${ACCESSOIRES.length} accessoires enregistrés sur la gamme "${gamme.nom}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
