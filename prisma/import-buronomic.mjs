import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const SHEET = "Kits 2026";
const COL_PRIX = "New Prix Public HT\n06 2026";
const round2 = (n) => Math.round(Number(n) * 100) / 100;

const file = process.argv[2];
if (!file) {
  console.error("Usage : node prisma/import-buronomic.mjs <fichier.xlsx>");
  process.exit(1);
}

async function main() {
  // 1. Marque Buronomic (remise -20 %)
  const marque = await prisma.marque.upsert({
    where: { slug: "buronomic" },
    update: {},
    create: { nom: "Buronomic", slug: "buronomic", remise: 0.2, actif: true },
  });
  const REMISE = marque.remise;

  // 2. Réglages (singleton)
  await prisma.reglages.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, tva: 0.2, remiseGlobale: 0.2 },
  });

  // 3. Lire le fichier
  const wb = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { defval: null });
  console.log(`${rows.length} lignes lues dans « ${SHEET} »`);

  // Grouper par code racine
  const parRacine = new Map();
  for (const r of rows) {
    const prix = Number(r[COL_PRIX]);
    if (!r["Code racine"] || !r["Code article"] || !Number.isFinite(prix)) continue;
    const rac = String(r["Code racine"]);
    if (!parRacine.has(rac)) parRacine.set(rac, []);
    parRacine.get(rac).push(r);
  }

  const produits = [];
  const variantes = [];
  for (const [codeRacine, lignes] of parRacine) {
    const prix = lignes.map((l) => Number(l[COL_PRIX]));
    const prixVarie = new Set(prix).size > 1;
    const prixPublicMin = Math.min(...prix);
    const first = lignes[0];

    produits.push({
      codeRacine,
      marqueId: marque.id,
      gamme: String(first["Gamme"] ?? ""),
      designation: String(first["Désignation"] ?? ""),
      prixPublicHT: round2(prixPublicMin),
      prixVenteHT: round2(prixPublicMin * (1 - REMISE)),
      prixVarieSelonFinition: prixVarie,
      publie: false,
    });

    for (const l of lignes) {
      const pub = Number(l[COL_PRIX]);
      variantes.push({
        codeArticle: String(l["Code article"]),
        codeRacine,
        finition: l["Finition"] != null ? String(l["Finition"]) : null,
        ean: l["Code EAN"] != null ? String(l["Code EAN"]) : null,
        poids: l["Poids (kg)"] != null ? Number(l["Poids (kg)"]) : null,
        prixPublicHT: round2(pub),
        ecoContribution: l["Eco-contribution unitaire"] != null ? Number(l["Eco-contribution unitaire"]) : 0,
        prixVenteHT: round2(pub * (1 - REMISE)),
      });
    }
  }

  console.log(`Insertion : ${produits.length} produits, ${variantes.length} variantes…`);
  await prisma.produit.createMany({ data: produits, skipDuplicates: true });

  const CHUNK = 2000;
  for (let i = 0; i < variantes.length; i += CHUNK) {
    await prisma.variante.createMany({ data: variantes.slice(i, i + CHUNK), skipDuplicates: true });
    console.log(`  …${Math.min(i + CHUNK, variantes.length)}/${variantes.length}`);
  }

  console.log(`✓ Import terminé (remise ${REMISE * 100} %).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());