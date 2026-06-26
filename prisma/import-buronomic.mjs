import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";

const prisma = new PrismaClient();

function slugMarque(nom) {
  return nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const raw = await readFile(new URL("./buronomic_import.json", import.meta.url), "utf-8");
  const produits = JSON.parse(raw);
  console.log(`📦 ${produits.length} produits à importer…`);

  // 1) Marque Buronomic
  const marque = await prisma.marque.upsert({
    where: { nom: "Buronomic" },
    update: {},
    create: { nom: "Buronomic", slug: slugMarque("Buronomic"), remise: 0.2, actif: true },
  });
  console.log(`✅ Marque : ${marque.nom}`);

  let okProduits = 0, okVariantes = 0;

  for (const p of produits) {
    await prisma.produit.upsert({
      where: { codeRacine: p.codeRacine },
      update: {
        gamme: p.gamme, designation: p.designation, slug: p.slug,
        categorie: p.categorie, prixPublicHT: p.prixPublicHT, marqueId: marque.id,
      },
      create: {
        codeRacine: p.codeRacine, marqueId: marque.id, gamme: p.gamme,
        designation: p.designation, slug: p.slug, categorie: p.categorie,
        prixPublicHT: p.prixPublicHT, publie: false,
      },
    });
    okProduits++;

    for (const v of p.variantes) {
      await prisma.variante.upsert({
        where: { codeArticle: v.codeArticle },
        update: {
          finition: v.finition, ean: v.ean, poids: v.poids,
          prixPublicHT: v.prixPublicHT, ecoContribution: v.ecoContribution, codeRacine: p.codeRacine,
        },
        create: {
          codeArticle: v.codeArticle, codeRacine: p.codeRacine,
          finition: v.finition, ean: v.ean, poids: v.poids,
          prixPublicHT: v.prixPublicHT, ecoContribution: v.ecoContribution,
        },
      });
      okVariantes++;
    }
    if (okProduits % 25 === 0) console.log(`  … ${okProduits}/${produits.length} produits`);
  }

  console.log(`\n✅ Import terminé : ${okProduits} produits, ${okVariantes} variantes.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());