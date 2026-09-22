// Retire les visuels en double sur une même fiche.
//
//   node prisma/deduper-visuels.mjs
//   node prisma/deduper-visuels.mjs --appliquer
//
// En simulation par défaut. --appliquer supprime les lignes en trop.
//
// D'OÙ VIENNENT CES DOUBLONS
//   prisma/appliquer-visuels.mjs a été lancé deux fois en parallèle. Chaque
//   exécution lit d'abord les visuels déjà posés sur la fiche pour ne pas
//   reposer les mêmes ; les deux ont lu avant que l'autre n'écrive, ont vu la
//   même fiche vide, et ont créé chacune leur ligne. La garde existe, elle ne
//   protège simplement pas de deux processus simultanés.
//
// CE QU'ON SUPPRIME
//   La ligne Visuel en trop, jamais l'image : l'adresse Cloudinary est la
//   même des deux côtés, et le fichier reste où il est. On garde celle qui a
//   le plus petit ordre — celle que la galerie montrait déjà — et l'on
//   conserve ses rattachements aux valeurs de finition s'il y en a.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les lignes en trop sont supprimées ═══\n"
    : "═══ SIMULATION — rien n'est supprimé ═══\n");

  const visuels = await prisma.visuel.findMany({
    orderBy: [{ vitrineId: "asc" }, { ordre: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, url: true, ordre: true, role: true,
      vitrine: { select: { id: true, nom: true } },
      _count: { select: { valeurs: true } },
    },
  });

  const gardes = new Map();     // vitrineId|url -> le visuel conservé
  const enTrop = [];
  for (const v of visuels) {
    const cle = `${v.vitrine.id}|${v.url}`;
    if (!gardes.has(cle)) { gardes.set(cle, v); continue; }
    enTrop.push({ ...v, garde: gardes.get(cle) });
  }

  if (!enTrop.length) {
    console.log("Aucun doublon. Rien à faire.");
    return;
  }

  titre(`${enTrop.length} VISUELS EN DOUBLE`);
  const parFiche = new Map();
  for (const v of enTrop) {
    if (!parFiche.has(v.vitrine.nom)) parFiche.set(v.vitrine.nom, []);
    parFiche.get(v.vitrine.nom).push(v);
  }
  for (const [nom, liste] of parFiche) {
    console.log(`\n   ${nom}`);
    for (const v of liste) {
      const perte = v._count.valeurs ? `  ⚠ porte ${v._count.valeurs} rattachement(s)` : "";
      console.log(`      ${v.url.split("/").pop().slice(0, 46).padEnd(48)} ordre ${v.ordre} → on garde l'ordre ${v.garde.ordre}${perte}`);
    }
  }

  // Un doublon qui porte des rattachements à des valeurs de finition n'est
  // pas un simple doublon : le supprimer perdrait du travail éditorial.
  const precieux = enTrop.filter((v) => v._count.valeurs > 0 && v.garde._count.valeurs === 0);
  if (precieux.length) {
    titre("DES DOUBLONS PORTENT UN TRAVAIL QUE L'ORIGINAL N'A PAS");
    console.log("\n   Rien ne sera supprimé : à regarder à la main.\n");
    for (const v of precieux) console.log(`   ${v.vitrine.nom} · ${v.url.split("/").pop()}`);
    process.exitCode = 1;
    return;
  }

  titre("LE COMPTE");
  console.log(`   ${enTrop.length} lignes en trop, sur ${parFiche.size} fiches`);
  console.log("   aucune image n'est supprimée : l'adresse est la même des deux côtés");

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour supprimer.");
    return;
  }

  titre("SUPPRESSION");
  const { count } = await prisma.visuel.deleteMany({ where: { id: { in: enTrop.map((v) => v.id) } } });
  console.log(`   ${count} lignes supprimées.`);

  // Les fiches touchées voient leur ordre resserré et leur vignette refaite.
  const touchees = [...new Set(enTrop.map((v) => v.vitrine.id))];
  for (const id of touchees) {
    const restants = await prisma.visuel.findMany({
      where: { vitrineId: id }, orderBy: { ordre: "asc" }, select: { id: true, url: true },
    });
    await prisma.$transaction(restants.map((v, i) => prisma.visuel.update({ where: { id: v.id }, data: { ordre: i } })));
    await prisma.produitVitrine.update({
      where: { id },
      data: { imageUrl: restants[0]?.url || null, images: restants.slice(1).map((v) => v.url) },
    });
  }
  console.log(`   ${touchees.length} fiches remises en ordre.`);

  titre("CONTRÔLE");
  const tous = await prisma.visuel.findMany({ select: { vitrineId: true, url: true } });
  const vus = new Set();
  let reste = 0;
  for (const v of tous) {
    const c = `${v.vitrineId}|${v.url}`;
    if (vus.has(c)) reste += 1;
    vus.add(c);
  }
  console.log(`   doublons restants : ${reste}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
