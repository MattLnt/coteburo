import { PrismaClient } from "@prisma/client";
import xlsx from "xlsx";

const prisma = new PrismaClient();
const CHEMIN = "C:\\Users\\akeys\\Documents\\COTEBURO\\buronomic_tarif_catalogue_06_2026_kits__colis__nomenclature_fr_hr270426 (1).xlsx";

const CATALOGUE = {
  "Confidentialité": ["BEWALL CLOISONS", "ESSENTIELLE"],
  "Coworking": ["COHESION", "COHESION HAUTE", "ASTROLITE HAUTE"],
  "Bureaux ergonomiques": ["ENVOL ONE", "ASTROLITE", "ALTO RH"],
  "Bureaux collaboratifs": ["ASTRO", "PARTAGE"],
  "Compléments et accessoires": ["BEWALL", "BEWALL WOOD", "ERGONOMIE"],
  "Bureaux classiques": ["RETRO", "ESSENTIEL"],
  "Bureaux direction": ["ASTRO DIRECTION", "STRICTO DIRECTION"],
  "Rangements": ["COMFORT", "QUIETUDE", "CLASSIF", "ALTO RANGEMENT", "SOLUTION ABATTANTE"],
  "Réunion": ["PRESTIGE", "ALTO REUNION", "RENCONTRE"],
  "Accueil": ["FIFTY-FIFTY", "FIFTY-FULL"],
  "Sièges": ["GALET", "GUEST"],
};

const slugify = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function main() {
  console.log("📖 Lecture du fichier tarifaire...");
  const wb = xlsx.readFile(CHEMIN);
  const rows = xlsx.utils.sheet_to_json(wb.Sheets["Kits 2026"], { header: 1, defval: null });

  const gammeVersCategorie = {};
  for (const [cat, gammes] of Object.entries(CATALOGUE)) {
    for (const g of gammes) gammeVersCategorie[g.toUpperCase()] = cat;
  }

  // ─── Marque ───
  const marque = await prisma.marque.upsert({
    where: { slug: "buronomic" }, update: {},
    create: { nom: "Buronomic", slug: "buronomic" },
  });

  // ─── NETTOYAGE des données Buronomic précédentes (repartir propre) ───
  console.log("🧹 Nettoyage import précédent...");
  const anciennesGammes = await prisma.gamme.findMany({ where: { marqueId: marque.id }, select: { id: true } });
  const anciensProduits = await prisma.produit.findMany({ where: { gammeId: { in: anciennesGammes.map(g => g.id) } }, select: { codeRacine: true } });
  const codesRacines = anciensProduits.map(p => p.codeRacine);
  if (codesRacines.length) {
    await prisma.variante.deleteMany({ where: { codeRacine: { in: codesRacines } } });
    await prisma.produit.deleteMany({ where: { codeRacine: { in: codesRacines } } });
  }
  await prisma.gamme.deleteMany({ where: { marqueId: marque.id } });
  console.log("   Nettoyé.");

  // ─── Catégories ───
  const categorieParNom = {};
  let ordre = 0;
  for (const catNom of Object.keys(CATALOGUE)) {
    const cat = await prisma.categorie.upsert({
      where: { marqueId_slug: { marqueId: marque.id, slug: slugify(catNom) } },
      update: {},
      create: { nom: catNom, slug: slugify(catNom), ordre: ordre++, marqueId: marque.id },
    });
    categorieParNom[catNom] = cat;
  }
  console.log(`✅ ${Object.keys(categorieParNom).length} catégories`);

  // ─── Regroupement en mémoire ───
  const gammes = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const gammeNom = r[1], codeArticle = r[2], codeRacine = r[3];
    const designation = r[4], finition = r[5], prix = r[6], eco = r[7], poids = r[8], ean = r[11];
    if (!gammeNom || !codeArticle || !codeRacine) continue;
    const gKey = String(gammeNom).trim().toUpperCase();
    if (!gammeVersCategorie[gKey]) continue;

    if (!gammes[gKey]) gammes[gKey] = { nom: String(gammeNom).trim(), produits: {} };
    const g = gammes[gKey];
    if (!g.produits[codeRacine]) g.produits[codeRacine] = { designation: String(designation || "").trim(), variantes: [] };
    g.produits[codeRacine].variantes.push({
      codeArticle: String(codeArticle).trim(),
      finition: finition ? String(finition).trim() : null,
      prix: Number(prix) || 0, eco: Number(eco) || 0,
      poids: Number(poids) || null, ean: ean ? String(ean).trim() : null,
    });
  }
  console.log(`📦 ${Object.keys(gammes).length} gammes à importer`);

  // ─── Création GROUPÉE (rapide) ───
  const slugsVus = new Set();
  let nbG = 0, nbP = 0, nbV = 0;

  for (const [gKey, g] of Object.entries(gammes)) {
    const cat = categorieParNom[gammeVersCategorie[gKey]];

    // slug unique pour la gamme
    let gslug = slugify(g.nom);
    while (slugsVus.has(gslug)) gslug += "-x";
    slugsVus.add(gslug);

    const gamme = await prisma.gamme.create({
      data: { nom: g.nom, slug: gslug, marqueId: marque.id, categorieId: cat.id, publie: false },
    });
    nbG++;

    // Prépare les produits + variantes en lots
    const produitsData = [];
    const variantesData = [];
    for (const [codeRacine, p] of Object.entries(g.produits)) {
      const prixValides = p.variantes.map(v => v.prix).filter(x => x > 0);
      const prixMini = prixValides.length ? Math.min(...prixValides) : 0;
      const prixVarie = new Set(p.variantes.map(v => v.prix)).size > 1;

      let pslug = slugify(`${g.nom}-${codeRacine}`);
      while (slugsVus.has(pslug)) pslug += "-x";
      slugsVus.add(pslug);

      produitsData.push({
        codeRacine, gammeId: gamme.id, gamme: g.nom, designation: p.designation,
        marqueId: marque.id, slug: pslug, prixPublicHT: prixMini, prixVarieSelonFinition: prixVarie, publie: false,
      });
      for (const v of p.variantes) {
        variantesData.push({
          codeArticle: v.codeArticle, codeRacine, finition: v.finition,
          prixPublicHT: v.prix, ecoContribution: v.eco, poids: v.poids, ean: v.ean,
        });
      }
    }

    // Insertions groupées
    await prisma.produit.createMany({ data: produitsData, skipDuplicates: true });
    await prisma.variante.createMany({ data: variantesData, skipDuplicates: true });
    nbP += produitsData.length;
    nbV += variantesData.length;
    console.log(`  ✅ ${g.nom} : ${produitsData.length} produits, ${variantesData.length} variantes`);
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`✅ ${nbG} gammes · ${nbP} produits · ${nbV} variantes`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });