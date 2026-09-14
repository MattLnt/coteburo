// Aucune mise en situation en première position.
//
// La première image sert de vignette partout où le produit apparaît hors de sa
// fiche : catalogue, recherche, carrousels, panier, devis. Une ambiance y
// montre une pièce meublée, pas le produit — le client ne voit pas ce qu'il
// achète.
//
// Le nom de fichier ne suffit pas à reconnaître une ambiance : les visuels
// OfficePro s'appellent « IMG_0034.jpg » ou « 01 (7).jpg », et la recherche par
// mots-clés n'en trouve aucune. On mesure donc le contenu — un packshot est
// posé sur fond blanc, une mise en situation ne l'est pas.
//
// Le critère est volontairement strict : on ne bouge une galerie que si sa
// première image est nettement chargée ET qu'une autre est franchement un
// packshot. Mieux vaut laisser une vignette discutable que d'en casser une
// bonne.
//
// Les ambiances ne sont pas supprimées, seulement renvoyées en fin de galerie.
//
//   node prisma/reordonner-ambiances.mjs
//   node prisma/reordonner-ambiances.mjs --appliquer
import { writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const SEUIL_BLANC = 245;   // au-delà, le pixel est du fond
const TAILLE = 48;         // suffit pour une proportion
const SCENE = 0.40;        // en dessous, l'image est chargée
const PACKSHOT = 0.70;     // au-dessus, le produit est détouré sur blanc
const RANG = 0.60;         // seuil de tri entre packshots et le reste

const cache = new Map();

// Proportion de pixels blancs. Une photo d'ambiance en a peu, un packshot
// beaucoup — c'est le signal le plus fiable dont on dispose ici.
async function partBlanche(url) {
  if (cache.has(url)) return cache.get(url);
  let v = null;
  try {
    const rep = await fetch(url);
    const buf = Buffer.from(await rep.arrayBuffer());
    const { data, info } = await sharp(buf).removeAlpha()
      .resize(TAILLE, TAILLE, { fit: "contain", background: "#ffffff" })
      .raw().toBuffer({ resolveWithObject: true });
    const total = info.width * info.height;
    let blancs = 0;
    for (let k = 0; k < total; k++) {
      const o = k * info.channels;
      if (data[o] > SEUIL_BLANC && data[o + 1] > SEUIL_BLANC && data[o + 2] > SEUIL_BLANC) blancs++;
    }
    v = blancs / total;
  } catch { v = null; }
  cache.set(url, v);
  return v;
}

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    where: { images: { isEmpty: false } },
    select: { id: true, nom: true, images: true, imageUrl: true, gamme: { select: { marque: { select: { nom: true } } } } },
  });

  const aFaire = [];
  let examinees = 0;

  for (const v of vitrines) {
    if (v.images.length < 2) continue;
    examinees++;

    const b0 = await partBlanche(v.images[0]);
    if (b0 == null || b0 >= SCENE) continue;

    const mesures = [];
    for (const u of v.images) mesures.push({ u, b: await partBlanche(u) });
    const meilleure = Math.max(...mesures.map((m) => m.b ?? 0));
    if (meilleure <= PACKSHOT) continue;

    // Partition stable : packshots d'abord, dans leur ordre d'origine.
    const packshots = mesures.filter((m) => (m.b ?? 0) >= RANG).map((m) => m.u);
    const reste = mesures.filter((m) => (m.b ?? 0) < RANG).map((m) => m.u);
    aFaire.push({ v, ordre: [...packshots, ...reste], b0, meilleure });
  }

  console.log(`${vitrines.length} vitrines avec images · ${examinees} à deux images ou plus`);
  console.log(`${aFaire.length} commencent par une mise en situation\n`);

  const parMarque = new Map();
  for (const { v } of aFaire) {
    const m = v.gamme?.marque?.nom || "?";
    parMarque.set(m, (parMarque.get(m) || 0) + 1);
  }
  for (const [m, n] of [...parMarque.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${m.padEnd(12)} ${n}`);

  console.log("\ndétail :");
  const nom = (u) => decodeURIComponent(u).replace(/^.*\/upload\/v\d+\//, "").slice(0, 56);
  for (const { v, ordre, b0, meilleure } of aFaire) {
    console.log(`   ${v.nom.slice(0, 46)}`);
    console.log(`      avant : ${nom(v.images[0])}  (${Math.round(b0 * 100)} % blanc)`);
    console.log(`      après : ${nom(ordre[0])}  (${Math.round(meilleure * 100)} % blanc)`);
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer."); return; }
  if (!aFaire.length) { console.log("\nRien à faire."); return; }

  await mkdir("prisma/sauvegardes", { recursive: true });
  const f = `prisma/sauvegardes/galeries-avant-reordre-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(f, JSON.stringify(aFaire.map(({ v }) => ({ id: v.id, nom: v.nom, images: v.images, imageUrl: v.imageUrl })), null, 2), "utf8");
  console.log(`\nSauvegarde : ${f}`);

  for (const { v, ordre } of aFaire) {
    // La vignette suit la galerie : c'est elle que le catalogue affiche.
    await prisma.produitVitrine.update({ where: { id: v.id }, data: { images: ordre, imageUrl: ordre[0] } });
  }
  console.log(`${aFaire.length} galeries réordonnées.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
