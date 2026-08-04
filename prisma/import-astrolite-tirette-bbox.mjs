import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 9); }

async function main() {
  const vitrine = await prisma.produitVitrine.findFirst({
    where: { nom: "Tirette plumier B-Box", gamme: { nom: "Astrolite" } },
  });

  if (!vitrine) {
    console.error('Produit introuvable — vérifie que le nom est bien exactement "Tirette plumier B-Box" dans la gamme "Astrolite".');
    process.exit(1);
  }

  // ─── 1. Déclinaison + prix + référence ───
  // Référence unique (BF90), pas d'axe de déclinaison — accessoire sans variante.
  const declinaisons = [
    { id: uid(), valeurs: {}, prixTarifHT: "55", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "BF90" },
  ];

  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: {
      axesDeclinaisons: [],
      declinaisons,
    },
  });

  // ─── 2. Finitions (Aluminium/plastique — matériau fixe, pas de choix couleur) ───
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });

  console.log(`✓ ${declinaisons.length} déclinaison enregistrée sur "${vitrine.nom}" (pas de finitions à créer).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
