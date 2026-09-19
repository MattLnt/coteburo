// Inventaire du compte Cloudinary, confronté à ce que la base référence.
//
// Lecture seule : aucune suppression. Le but est de voir trois choses que
// la base seule ne montre pas — les dossiers réels, les images qu'aucune
// fiche ne référence plus (orphelines), et le poids de tout cela.
//
//   node prisma/cloudinary-inventaire.mjs
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const titre = (t) => console.log(`\n${"═".repeat(66)}\n${t}\n${"═".repeat(66)}`);
const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`;

/** Toutes les ressources du compte, page par page. */
async function toutesLesRessources() {
  const out = [];
  for (const type of ["upload", "private", "authenticated"]) {
    let cursor;
    do {
      const r = await cloudinary.api.resources({
        type, max_results: 500, next_cursor: cursor,
        resource_type: "image", context: false, tags: false,
      });
      out.push(...r.resources);
      cursor = r.next_cursor;
    } while (cursor);
  }
  return out;
}

/** Le public_id référencé par une URL Cloudinary, ou null.
 *
 * L'URL encode les accents — « Chêne » s'y écrit « Ch%C3%AAne » — alors que
 * l'API Admin rend le public_id en clair. Sans décodage, quatre cents
 * images passeraient pour absentes du compte et seraient traitées comme
 * des orphelines.
 */
function publicId(url) {
  const m = String(url || "").match(/\/upload\/(.+)$/);
  if (!m) return null;
  const brut = m[1].replace(/^v\d+\//, "").replace(/\.[a-z0-9]+$/i, "");
  try {
    return decodeURIComponent(brut);
  } catch {
    return brut;
  }
}

async function referencesEnBase() {
  const catalogue = new Set();
  const site = new Set();
  const note = (url, set) => {
    const p = publicId(url);
    if (p) set.add(p);
  };

  for (const v of await prisma.produitVitrine.findMany({ select: { imageUrl: true, images: true } })) {
    note(v.imageUrl, catalogue);
    (v.images || []).forEach((u) => note(u, catalogue));
  }
  for (const g of await prisma.gamme.findMany({ select: { imageUrl: true, images: true } })) {
    note(g.imageUrl, catalogue);
    (g.images || []).forEach((u) => note(u, catalogue));
  }
  for (const f of await prisma.finition.findMany({ select: { imageUrl: true } })) note(f.imageUrl, catalogue);
  for (const f of await prisma.finitionModele.findMany({ select: { imageUrl: true } })) note(f.imageUrl, catalogue);

  // Le site : à épargner quoi qu'il arrive.
  for (const m of await prisma.marque.findMany({ select: { logoUrl: true } })) note(m.logoUrl, site);
  for (const r of await prisma.realisation.findMany({
    select: { imageUrl: true, avantImageUrl: true, apresImageUrl: true, galerie: true },
  })) {
    note(r.imageUrl, site);
    note(r.avantImageUrl, site);
    note(r.apresImageUrl, site);
    if (Array.isArray(r.galerie)) {
      r.galerie.forEach((x) => note(typeof x === "string" ? x : x?.url, site));
    }
  }
  for (const a of await prisma.article.findMany({ select: { imageUrl: true } })) note(a.imageUrl, site);

  // Une image servant au site n'est jamais du catalogue, même si une
  // fiche la référence aussi : le doute profite à la conservation.
  for (const p of site) catalogue.delete(p);
  return { catalogue, site };
}

const dossierDe = (p) => (p.includes("/") ? p.slice(0, p.indexOf("/")) : "(racine)");

async function main() {
  console.log(`compte : ${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}`);
  const usage = await cloudinary.api.usage().catch(() => null);
  if (usage) {
    console.log(`ressources : ${usage.resources} · stockage ${mo(usage.storage?.usage || 0)}`);
  }

  const ressources = await toutesLesRessources();
  const { catalogue, site } = await referencesEnBase();
  const surCloud = new Map(ressources.map((r) => [r.public_id, r]));

  titre("DOSSIERS RÉELS DU COMPTE");
  const parDossier = new Map();
  for (const r of ressources) {
    const d = dossierDe(r.public_id);
    if (!parDossier.has(d)) parDossier.set(d, { n: 0, octets: 0, cat: 0, site: 0, orph: 0 });
    const e = parDossier.get(d);
    e.n += 1;
    e.octets += r.bytes || 0;
    if (site.has(r.public_id)) e.site += 1;
    else if (catalogue.has(r.public_id)) e.cat += 1;
    else e.orph += 1;
  }
  console.log("\n   dossier                    images     poids   catalogue   site   orphelines");
  for (const [d, e] of [...parDossier].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`   ${d.padEnd(26)}${String(e.n).padStart(6)}  ${mo(e.octets).padStart(9)}`
      + `${String(e.cat).padStart(10)}${String(e.site).padStart(7)}${String(e.orph).padStart(12)}`);
  }
  const tot = ressources.reduce((a, r) => a + (r.bytes || 0), 0);
  console.log(`   ${"TOTAL".padEnd(26)}${String(ressources.length).padStart(6)}  ${mo(tot).padStart(9)}`);

  // Le dossier samples est la démonstration livrée par Cloudinary : ni
  // catalogue, ni site. On le laisse hors de la purge.
  const DEMO = "samples";
  titre("CE QUE LA PURGE VISERAIT");
  const aPurger = ressources.filter(
    (r) => !site.has(r.public_id) && dossierDe(r.public_id) !== DEMO);
  const aGarder = ressources.filter((r) => site.has(r.public_id));
  const orphelines = aPurger.filter((r) => !catalogue.has(r.public_id));
  console.log(`\n   images du catalogue référencées    ${String(aPurger.length - orphelines.length).padStart(6)}`);
  console.log(`   images orphelines (plus référencées) ${String(orphelines.length).padStart(4)}`);
  console.log(`   ${"─".repeat(44)}`);
  console.log(`   total à supprimer                  ${String(aPurger.length).padStart(6)}  `
    + `${mo(aPurger.reduce((a, r) => a + (r.bytes || 0), 0))}`);
  console.log(`   à conserver (site)                 ${String(aGarder.length).padStart(6)}`);
  const demo = ressources.filter((r) => dossierDe(r.public_id) === DEMO);
  console.log(`   dossier samples, hors purge        ${String(demo.length).padStart(6)}`);

  titre("LES IMAGES DU SITE, À ÉPARGNER");
  for (const r of aGarder.sort((a, b) => a.public_id.localeCompare(b.public_id))) {
    console.log(`   ${r.public_id}`);
  }

  titre("ORPHELINES — PLUS AUCUNE FICHE NE LES RÉFÉRENCE");
  const parDossierOrph = new Map();
  for (const r of orphelines) {
    const d = dossierDe(r.public_id);
    parDossierOrph.set(d, (parDossierOrph.get(d) || 0) + 1);
  }
  for (const [d, n] of [...parDossierOrph].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${d.padEnd(30)} ${String(n).padStart(5)}`);
  }
  console.log("\n   échantillon :");
  for (const r of orphelines.slice(0, 12)) console.log(`      ${r.public_id}`);

  titre("RÉFÉRENCÉ EN BASE MAIS ABSENT DE CLOUDINARY");
  const manquantes = [...catalogue, ...site].filter((p) => !surCloud.has(p));
  console.log(`\n   ${manquantes.length} URL pointent sur une image qui n'existe plus`);
  for (const p of manquantes.slice(0, 12)) console.log(`      ${p}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
