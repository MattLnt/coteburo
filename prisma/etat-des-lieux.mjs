// État des lieux du catalogue avant purge.
//
// Lecture seule : ce script ne modifie rien. Il compte ce qui existe et
// signale ce qui empêcherait une suppression — commandes, devis, favoris
// et promotions pointent sur des produits, et une purge les casserait.
//
//   node prisma/etat-des-lieux.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const titre = (t) => console.log(`\n${"═".repeat(62)}\n${t}\n${"═".repeat(62)}`);

async function main() {
  titre("CATALOGUE PRODUIT");

  const marques = await prisma.marque.findMany({
    orderBy: { nom: "asc" },
    include: {
      _count: { select: { categories: true, gammes: true, produits: true } },
    },
  });
  console.log(`\n${marques.length} marques`);
  for (const m of marques) {
    console.log(`   ${m.nom.padEnd(14)} ${String(m._count.categories).padStart(3)} catégories · `
      + `${String(m._count.gammes).padStart(3)} gammes · `
      + `${String(m._count.produits).padStart(5)} produits tarifaires`);
  }

  const compte = {
    "catégories": await prisma.categorie.count(),
    "sous-catégories": await prisma.sousCategorie.count(),
    "gammes": await prisma.gamme.count(),
    "fiches vitrine": await prisma.produitVitrine.count(),
    "produits (tarif)": await prisma.produit.count(),
    "variantes": await prisma.variante.count(),
    "groupes de finition": await prisma.groupeFinition.count(),
    "finitions": await prisma.finition.count(),
    "palettes de finition": await prisma.paletteFinition.count(),
    "modèles de finition": await prisma.finitionModele.count(),
  };
  console.log("");
  for (const [k, v] of Object.entries(compte)) {
    console.log(`   ${k.padEnd(22)} ${String(v).padStart(6)}`);
  }

  // Les déclinaisons vivent en JSON sur la fiche : on les compte à la main.
  const vitrines = await prisma.produitVitrine.findMany({
    select: { declinaisons: true, images: true, imageUrl: true, publie: true },
  });
  const declinaisons = vitrines.reduce(
    (n, v) => n + (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0), 0);
  const publiees = vitrines.filter((v) => v.publie).length;
  console.log(`   ${"déclinaisons (JSON)".padEnd(22)} ${String(declinaisons).padStart(6)}`);
  console.log(`   ${"dont fiches publiées".padEnd(22)} ${String(publiees).padStart(6)}`);

  titre("GAMMES PAR MARQUE");
  const gammes = await prisma.gamme.findMany({
    orderBy: [{ marque: { nom: "asc" } }, { nom: "asc" }],
    include: {
      marque: { select: { nom: true } },
      _count: { select: { vitrines: true, produits: true, groupesFinition: true } },
    },
  });
  let marqueCourante = null;
  for (const g of gammes) {
    if (g.marque.nom !== marqueCourante) {
      marqueCourante = g.marque.nom;
      console.log(`\n── ${marqueCourante} ──`);
    }
    console.log(`   ${g.nom.padEnd(28)} ${String(g._count.vitrines).padStart(3)} fiches · `
      + `${String(g._count.produits).padStart(4)} produits · `
      + `${String(g._count.groupesFinition).padStart(2)} groupes finition`);
  }

  titre("CATÉGORIES ET SOUS-CATÉGORIES");
  const cats = await prisma.categorie.findMany({
    orderBy: [{ marqueId: "asc" }, { ordre: "asc" }],
    include: {
      marque: { select: { nom: true } },
      sousCategories: { orderBy: { ordre: "asc" } },
      _count: { select: { vitrines: true } },
    },
  });
  for (const c of cats) {
    console.log(`\n   ${c.marque.nom} · ${c.nom}  (${c._count.vitrines} fiches`
      + `${c.estOption ? ", option" : ""})`);
    for (const s of c.sousCategories) {
      console.log(`      └ ${s.nom}`);
    }
  }

  titre("IMAGES RÉFÉRENCÉES EN BASE");
  const dossier = (url) => {
    const m = String(url || "").match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    if (!m) return null;
    const parts = m[1].split("/");
    return parts.slice(0, Math.min(2, parts.length - 1)).join("/") || "(racine)";
  };
  const parDossier = new Map();
  const ajoute = (url, source) => {
    const d = dossier(url);
    if (!d) return;
    if (!parDossier.has(d)) parDossier.set(d, new Map());
    const m = parDossier.get(d);
    m.set(source, (m.get(source) || 0) + 1);
  };
  for (const v of vitrines) {
    ajoute(v.imageUrl, "fiches");
    (v.images || []).forEach((u) => ajoute(u, "fiches"));
  }
  for (const g of await prisma.gamme.findMany({ select: { imageUrl: true, images: true } })) {
    ajoute(g.imageUrl, "gammes");
    (g.images || []).forEach((u) => ajoute(u, "gammes"));
  }
  for (const f of await prisma.finition.findMany({ select: { imageUrl: true } })) {
    ajoute(f.imageUrl, "finitions");
  }
  for (const f of await prisma.finitionModele.findMany({ select: { imageUrl: true } })) {
    ajoute(f.imageUrl, "modèles finition");
  }
  for (const m of await prisma.marque.findMany({ select: { logoUrl: true } })) {
    ajoute(m.logoUrl, "logos marque");
  }
  // Une réalisation porte son visuel principal, un avant/après et une
  // galerie JSON : tout cela vit hors du catalogue et doit être épargné.
  for (const r of await prisma.realisation.findMany({
    select: { imageUrl: true, avantImageUrl: true, apresImageUrl: true, galerie: true },
  })) {
    ajoute(r.imageUrl, "réalisations");
    ajoute(r.avantImageUrl, "réalisations");
    ajoute(r.apresImageUrl, "réalisations");
    const g = r.galerie;
    if (Array.isArray(g)) {
      g.forEach((x) => ajoute(typeof x === "string" ? x : x?.url, "réalisations"));
    }
  }
  for (const a of await prisma.article.findMany({ select: { imageUrl: true } })) {
    ajoute(a.imageUrl, "articles");
  }
  console.log("\n   dossier Cloudinary                   images   d'où elles viennent");
  for (const [d, sources] of [...parDossier].sort()) {
    const total = [...sources.values()].reduce((a, b) => a + b, 0);
    const detail = [...sources].map(([s, n]) => `${s} ${n}`).join(", ");
    console.log(`   ${d.padEnd(36)} ${String(total).padStart(6)}   ${detail}`);
  }

  titre("CE QUI DÉPEND DU CATALOGUE");
  const liens = {
    "commandes": await prisma.commande.count(),
    "lignes de commande": await prisma.ligneCommande.count(),
    "devis": await prisma.devis.count(),
    "lignes de devis": await prisma.ligneDevis.count(),
    "favoris": await prisma.favori.count(),
    "promotions": await prisma.promotion.count(),
    "promotions ↔ fiches": await prisma.promotionVitrine.count(),
    "promotions ↔ produits": await prisma.promotionProduit.count(),
    "réalisations": await prisma.realisation.count(),
    "paliers d'installation": await prisma.palierInstallation.count(),
  };
  for (const [k, v] of Object.entries(liens)) {
    const alerte = v > 0 && !k.startsWith("réalisations") && !k.startsWith("paliers");
    console.log(`   ${k.padEnd(24)} ${String(v).padStart(6)}${alerte ? "  ⚠ à vérifier avant purge" : ""}`);
  }

  titre("HORS CATALOGUE — À NE PAS TOUCHER");
  console.log(`   articles de blog        ${String(await prisma.article.count()).padStart(6)}`);
  console.log(`   utilisateurs            ${String(await prisma.user.count()).padStart(6)}`);
  console.log(`   réalisations            ${String(liens["réalisations"]).padStart(6)}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
