// Purge des images produit sur Cloudinary.
//
// En simulation par défaut. Il faut --appliquer pour supprimer.
//
//   node prisma/purge-cloudinary.mjs
//   node prisma/purge-cloudinary.mjs --appliquer
//
// POURQUOI PAR LISTE ET NON PAR DOSSIER
//   Quatre cent vingt-cinq visuels produit sont posés à la racine du
//   compte, au milieu de huit images du site — six réalisations et deux
//   articles. Supprimer le dossier racine les emporterait ; ne supprimer
//   que coteburo/* les laisserait. On construit donc la liste exacte des
//   public_id à détruire, et on protège nommément ceux du site.
//
// LA RÈGLE
//   part      tout le reste du compte, y compris le dossier samples livré
//             par Cloudinary à la création et les milliers d'images
//             orphelines laissées par les imports successifs
//   reste     les seules images référencées par une réalisation, un
//             article ou un logo de marque
//
// La liste des images du site est relue dans la base À CHAQUE EXÉCUTION :
// si le script tourne après la purge en base, plus rien ne les protège.
// D'où le garde-fou en tête de main().
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`;
const dossierDe = (p) => (p.includes("/") ? p.slice(0, p.indexOf("/")) : "(racine)");

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

/** Les images que le site utilise : réalisations, articles, logos. */
async function imagesDuSite() {
  const set = new Set();
  const note = (url) => {
    const p = publicId(url);
    if (p) set.add(p);
  };
  for (const m of await prisma.marque.findMany({ select: { logoUrl: true } })) note(m.logoUrl);
  for (const r of await prisma.realisation.findMany({
    select: { imageUrl: true, avantImageUrl: true, apresImageUrl: true, galerie: true },
  })) {
    note(r.imageUrl);
    note(r.avantImageUrl);
    note(r.apresImageUrl);
    if (Array.isArray(r.galerie)) {
      r.galerie.forEach((x) => note(typeof x === "string" ? x : x?.url));
    }
  }
  for (const a of await prisma.article.findMany({ select: { imageUrl: true } })) note(a.imageUrl);
  return set;
}

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

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les images seront supprimées ═══\n"
    : "═══ SIMULATION — rien n'est supprimé ═══\n");

  const site = await imagesDuSite();

  // Garde-fou : si la base a déjà été purgée, cette liste est vide et la
  // protection ne protège plus rien. On refuse alors d'agir.
  if (site.size === 0) {
    console.error("La base ne référence AUCUNE image de site.");
    console.error("Impossible de distinguer ce qu'il faut épargner — on s'arrête.");
    console.error("Lancer cette purge AVANT purge-catalogue.mjs, ou fournir la");
    console.error("liste des public_id à conserver.");
    process.exitCode = 1;
    return;
  }

  const ressources = await toutesLesRessources();
  const aPurger = ressources.filter((r) => !site.has(r.public_id));
  const epargnees = ressources.filter((r) => site.has(r.public_id));

  console.log(`compte : ${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}`);
  console.log(`${ressources.length} images au total, ${mo(ressources.reduce((a, r) => a + (r.bytes || 0), 0))}\n`);

  console.log("── À SUPPRIMER, PAR DOSSIER ──\n");
  const parDossier = new Map();
  for (const r of aPurger) {
    const d = dossierDe(r.public_id);
    if (!parDossier.has(d)) parDossier.set(d, { n: 0, octets: 0 });
    const e = parDossier.get(d);
    e.n += 1;
    e.octets += r.bytes || 0;
  }
  for (const [d, e] of [...parDossier].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`   ${d.padEnd(26)} ${String(e.n).padStart(6)}   ${mo(e.octets)}`);
  }
  console.log(`   ${"─".repeat(44)}`);
  console.log(`   ${"total".padEnd(26)} ${String(aPurger.length).padStart(6)}   `
    + `${mo(aPurger.reduce((a, r) => a + (r.bytes || 0), 0))}`);

  console.log("\n── ÉPARGNÉ ──\n");
  for (const r of epargnees.sort((a, b) => a.public_id.localeCompare(b.public_id))) {
    console.log(`   ${r.public_id}`);
  }
  console.log(`
   ${epargnees.length} images conservées, tout le reste part.`);

  // La liste part sur disque : elle sert de trace, et de secours si la
  // suppression s'interrompt en route.
  const liste = "prisma/sauvegardes/cloudinary-a-purger.txt";
  await writeFile(liste, aPurger.map((r) => r.public_id).join("\n") + "\n", "utf8");
  console.log(`\nListe écrite → ${liste}`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour supprimer.");
    return;
  }

  console.log("\n── SUPPRESSION ──\n");
  // L'API accepte cent identifiants par appel.
  const ids = aPurger.map((r) => r.public_id);
  let faits = 0;
  const echecs = [];
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100);
    const r = await cloudinary.api.delete_resources(lot, { resource_type: "image" });
    for (const [id, etat] of Object.entries(r.deleted || {})) {
      if (etat === "deleted" || etat === "not_found") faits += 1;
      else echecs.push(`${id} : ${etat}`);
    }
    process.stdout.write(`\r   ${Math.min(i + 100, ids.length)} / ${ids.length}`);
  }
  console.log(`\n   ${faits} supprimées, ${echecs.length} en échec`);
  for (const e of echecs.slice(0, 20)) console.log(`      ${e}`);

  // Les dossiers vides restent visibles dans la console Cloudinary.
  for (const d of ["coteburo", "sokoa-tissus", "samples"]) {
    const ok = await cloudinary.api.delete_folder(d).catch(() => null);
    if (ok) console.log(`   dossier ${d} retiré`);
  }

  console.log("\n── CONTRÔLE ──\n");
  const apres = await toutesLesRessources();
  const restantes = apres.filter((r) => !site.has(r.public_id));
  console.log(`   images restantes hors site : ${restantes.length}`);
  const survivantes = apres.filter((r) => site.has(r.public_id));
  console.log(`   images du site retrouvées : ${survivantes.length} / ${site.size}`);
  if (survivantes.length < site.size) {
    console.log("   ⚠ une image du site manque à l'appel");
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
