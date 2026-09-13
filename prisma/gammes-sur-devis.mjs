import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Bascule des gammes en vente sur devis.
//
// Les cabines Essentielle et les gradins Modul'Up n'ont pas de tarif au
// catalogue : le prix dépend de la configuration et se négocie au cas
// par cas. Leur fiche doit donc afficher une demande de devis plutôt
// qu'un montant et un bouton d'achat.
//
// Le drapeau se pose sur la gamme : le code des fiches vérifie
// « gamme.venteSurDevis || produit.venteSurDevis », ce qui couvre tous
// les produits présents et à venir.

const APPLIQUER = process.argv.includes("--appliquer");

const GAMMES = ["Essentielle", "Modul Up"];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  for (const nom of GAMMES) {
    const gamme = await prisma.gamme.findFirst({
      where: { nom },
      select: {
        id: true, nom: true, venteSurDevis: true,
        _count: { select: { vitrines: true } },
      },
    });

    if (!gamme) { console.log(`✗ ${nom} — gamme introuvable`); continue; }

    if (gamme.venteSurDevis) {
      console.log(`   ${gamme.nom} — déjà en vente sur devis`);
      continue;
    }

    console.log(`▸ ${gamme.nom} — ${gamme._count.vitrines} produit(s) passent en vente sur devis`);

    if (!APPLIQUER) continue;

    await prisma.gamme.update({
      where: { id: gamme.id },
      data: { venteSurDevis: true },
    });
  }

  if (!APPLIQUER) {
    console.log("\nnode prisma\\gammes-sur-devis.mjs --appliquer");
  } else {
    console.log("\nRelancer ensuite : node prisma\\publier-buronomic.mjs --appliquer");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());