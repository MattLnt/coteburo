// Détail des deux points qui décident de la purge : ce que contiennent
// les commandes et devis, et ce qui traîne à la racine de Cloudinary.
//
// Lecture seule.
//   node prisma/etat-des-lieux-detail.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(62)}\n${t}\n${"═".repeat(62)}`);

async function main() {
  titre("COMMANDES ET DEVIS");
  const commandes = await prisma.commande.findMany({
    orderBy: { createdAt: "desc" },
    include: { lignes: true },
  });
  console.log(`\n${commandes.length} commandes :`);
  for (const c of commandes) {
    const d = c.createdAt.toISOString().slice(0, 10);
    const total = c.total ?? c.montantTotal ?? "?";
    console.log(`   ${d}  ${String(c.statut || "?").padEnd(12)} ${String(total).padStart(9)} €  `
      + `${c.lignes.length} ligne(s)  ${c.email || c.clientEmail || ""}`);
  }

  const devis = await prisma.devis.findMany({
    orderBy: { createdAt: "desc" }, include: { lignes: true },
  });
  console.log(`\n${devis.length} devis :`);
  for (const d of devis) {
    console.log(`   ${d.createdAt.toISOString().slice(0, 10)}  `
      + `${String(d.statut || "?").padEnd(12)} ${d.lignes.length} ligne(s)  `
      + `${d.email || d.clientEmail || ""}`);
  }

  const promos = await prisma.promotion.findMany();
  console.log(`\n${promos.length} promotion(s) :`);
  for (const p of promos) console.log(`   ${p.nom || p.id} · ${p.pourcentage ?? "?"} %`);

  titre("IMAGES À LA RACINE DE CLOUDINARY");
  // Le dossier racine mélange des visuels produit et des visuels de site.
  // Une purge par dossier ne peut pas les distinguer : il faut la liste.
  const id = (url) => {
    const m = String(url || "").match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    return m && !m[1].includes("/") ? m[1] : null;
  };
  const racine = new Map();
  const note = (url, source) => {
    const p = id(url);
    if (!p) return;
    if (!racine.has(p)) racine.set(p, new Set());
    racine.get(p).add(source);
  };

  for (const v of await prisma.produitVitrine.findMany({
    select: { nom: true, imageUrl: true, images: true },
  })) {
    note(v.imageUrl, "fiche produit");
    (v.images || []).forEach((u) => note(u, "fiche produit"));
  }
  for (const f of await prisma.finition.findMany({ select: { imageUrl: true } })) {
    note(f.imageUrl, "finition");
  }
  for (const f of await prisma.finitionModele.findMany({ select: { imageUrl: true } })) {
    note(f.imageUrl, "modèle de finition");
  }
  for (const g of await prisma.gamme.findMany({ select: { imageUrl: true, images: true } })) {
    note(g.imageUrl, "gamme");
    (g.images || []).forEach((u) => note(u, "gamme"));
  }
  for (const m of await prisma.marque.findMany({ select: { logoUrl: true } })) {
    note(m.logoUrl, "logo de marque");
  }
  for (const r of await prisma.realisation.findMany({
    select: { imageUrl: true, avantImageUrl: true, apresImageUrl: true, galerie: true },
  })) {
    note(r.imageUrl, "réalisation");
    note(r.avantImageUrl, "réalisation");
    note(r.apresImageUrl, "réalisation");
    const g = r.galerie;
    if (Array.isArray(g)) g.forEach((x) => note(typeof x === "string" ? x : x?.url, "réalisation"));
  }
  for (const a of await prisma.article.findMany({ select: { imageUrl: true } })) {
    note(a.imageUrl, "article");
  }

  const produit = [...racine].filter(([, s]) =>
    [...s].every((x) => ["fiche produit", "finition", "modèle de finition", "gamme"].includes(x)));
  const site = [...racine].filter(([, s]) =>
    [...s].some((x) => ["réalisation", "article", "logo de marque"].includes(x)));

  console.log(`\n   ${racine.size} images distinctes à la racine`);
  console.log(`     rattachées au CATALOGUE  ${String(produit.length).padStart(4)}  → à purger`);
  console.log(`     rattachées au SITE       ${String(site.length).padStart(4)}  → à conserver`);
  console.log("\n   Les images du SITE, à la racine, qu'une purge du dossier détruirait :");
  for (const [p, s] of site) console.log(`      ${p}   (${[...s].join(", ")})`);

  const mixtes = [...racine].filter(([, s]) => s.size > 1);
  if (mixtes.length) {
    console.log("\n   Images servant à la fois au catalogue et au site :");
    for (const [p, s] of mixtes) console.log(`      ${p}   (${[...s].join(", ")})`);
  }

  titre("AUTRES DOSSIERS PRODUIT NON CITÉS");
  const dossier = (url) => {
    const m = String(url || "").match(/\/upload\/(?:v\d+\/)?(.+)\/[^/]+\.[a-z0-9]+$/i);
    return m ? m[1] : null;
  };
  const cites = ["coteburo/buronomic", "coteburo/sokoa", "coteburo/officepro", "coteburo/cadre"];
  const autres = new Map();
  for (const f of await prisma.finitionModele.findMany({ select: { imageUrl: true } })) {
    const d = dossier(f.imageUrl);
    if (d && !cites.includes(d)) autres.set(d, (autres.get(d) || 0) + 1);
  }
  for (const f of await prisma.finition.findMany({ select: { imageUrl: true } })) {
    const d = dossier(f.imageUrl);
    if (d && !cites.includes(d)) autres.set(d, (autres.get(d) || 0) + 1);
  }
  for (const [d, n] of autres) {
    console.log(`   ${d.padEnd(30)} ${String(n).padStart(4)} images de finition`);
  }
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
