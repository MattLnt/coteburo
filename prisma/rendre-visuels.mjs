// Rend à leur produit les visuels restés sur une fiche dépubliée.
//
//   node prisma/rendre-visuels.mjs
//   node prisma/rendre-visuels.mjs --appliquer
//   node prisma/rendre-visuels.mjs --gamme=Klik
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Mes regroupements avaient rassemblé les visuels de plusieurs fiches sur
//   une seule. En redécoupant, deux des cinq scripts — Eman et Klik — ont
//   remis les produits en ligne sans ramener les photos : soixante-cinq
//   visuels sont restés attachés à des fiches que plus personne ne voit.
//
// COMMENT ON SAIT OÙ CHACUN VA
//   L'adresse Cloudinary garde le nom du fichier d'origine, et ce nom porte
//   la racine de la référence : « nr16-01-jpg.jpg » vient de NR16,
//   « klst-01-jpg.jpg » de KLST. On cherche cette racine parmi les
//   combinaisons des fiches publiées de la gamme.
//
//   Une racine que deux produits partagent — chez Klik, KLA0 désigne la
//   chaise ordinaire ET la version recyclée — est départagée par le dossier
//   de l'adresse, qui garde le nom de la fiche d'alors. Si le doute
//   subsiste, on ne pose rien et on le dit.
//
// CE QU'IL NE FAIT PAS
//   Déplacer un fichier sur le disque ni rien envoyer : ces visuels sont
//   déjà chez Cloudinary. Il ne change que la fiche à laquelle ils sont
//   rattachés.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const FILTRE = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

/** La racine de référence portée par le nom de fichier d'une adresse. */
function racineDe(url) {
  const fichier = (url.split("/").pop() || "").toLowerCase();
  const m = /^([a-z0-9]{4})/.exec(fichier);
  return m ? m[1].toUpperCase() : null;
}

/** Le dossier de l'adresse : le nom de la fiche d'alors, en slug tronqué. */
const dossierDe = (url) => (url.split("/").slice(-2, -1)[0] || "").toLowerCase();

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gammes = await prisma.gamme.findMany({
    where: FILTRE ? { nom: { contains: FILTRE, mode: "insensitive" } } : {},
    select: {
      nom: true,
      vitrines: {
        select: {
          id: true, nom: true, publie: true,
          visuels: { select: { id: true, url: true, role: true, ordre: true } },
          combinaisons: { select: { referenceBase: true } },
        },
      },
    },
  });

  let totalAPoser = 0;
  const rapports = [];

  for (const g of gammes) {
    const publiees = g.vitrines.filter((v) => v.publie);
    const bloques = g.vitrines.filter((v) => !v.publie && v.visuels.length);
    if (!publiees.length || !bloques.length) continue;

    // Quelle fiche publiée porte quelle racine.
    const parRacine = new Map();
    for (const v of publiees) {
      for (const c of v.combinaisons) {
        const r = String(c.referenceBase || "").trim().toUpperCase().split("/")[0].slice(0, 4);
        if (!r) continue;
        if (!parRacine.has(r)) parRacine.set(r, new Set());
        parRacine.get(r).add(v);
      }
    }

    const aPoser = new Map();
    const perdus = [];
    for (const source of bloques) {
      for (const img of source.visuels) {
        const racine = racineDe(img.url);
        const candidats = racine ? [...(parRacine.get(racine) || [])] : [];
        let cible = candidats.length === 1 ? candidats[0] : null;

        // Racine partagée : le dossier de l'adresse garde le nom d'alors.
        if (!cible && candidats.length > 1) {
          const dossier = dossierDe(img.url);
          const proches = candidats.filter((v) => nu(v.nom).startsWith(dossier.slice(0, 30))
            || dossier.startsWith(nu(v.nom).slice(0, 30)));
          if (proches.length === 1) [cible] = proches;
        }

        if (!cible) { perdus.push({ url: img.url, racine, nb: candidats.length }); continue; }
        if (!aPoser.has(cible.id)) aPoser.set(cible.id, { vitrine: cible, images: [] });
        aPoser.get(cible.id).images.push(img);
      }
    }

    if (!aPoser.size && !perdus.length) continue;
    const n = [...aPoser.values()].reduce((s, x) => s + x.images.length, 0);
    totalAPoser += n;
    rapports.push({ gamme: g.nom, aPoser, perdus, n });
  }

  for (const r of rapports) {
    titre(`${r.gamme} — ${r.n} visuels à rendre`);
    for (const { vitrine, images } of [...r.aPoser.values()].sort((a, b) => a.vitrine.nom.localeCompare(b.vitrine.nom))) {
      console.log(`\n   ${vitrine.nom}`);
      for (const img of images) console.log(`      ${img.url.split("/").pop()}`);
    }
    if (r.perdus.length) {
      console.log("\n   ── qu'on ne sait pas router :");
      for (const p of r.perdus) {
        console.log(`      ${p.url.split("/").pop()}  racine ${p.racine || "illisible"} · ${p.nb} produit(s) candidat(s)`);
      }
    }
  }

  titre("LE COMPTE");
  console.log(`   ${totalAPoser} visuels à rendre · ${rapports.reduce((s, r) => s + r.perdus.length, 0)} sans destination sûre`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const r of rapports) {
    for (const { vitrine, images } of r.aPoser.values()) {
      // On place à la suite de ce que la fiche porte déjà.
      let rang = vitrine.visuels.length;
      for (const img of images) {
        await prisma.visuel.update({
          where: { id: img.id },
          data: { vitrineId: vitrine.id, ordre: rang },
        });
        rang += 1;
      }
      // La vignette de l'ancien modèle reste alimentée.
      const tous = await prisma.visuel.findMany({
        where: { vitrineId: vitrine.id }, orderBy: { ordre: "asc" }, select: { url: true },
      });
      await prisma.produitVitrine.update({
        where: { id: vitrine.id },
        data: { imageUrl: tous[0]?.url || null, images: tous.slice(1).map((x) => x.url) },
      });
    }
    console.log(`   ${r.gamme} : ${r.n} visuels rendus.`);
  }

  titre("CONTRÔLE");
  for (const r of rapports) {
    const illustres = await prisma.produitVitrine.count({
      where: { gamme: { nom: r.gamme }, publie: true, visuels: { some: {} } },
    });
    const total = await prisma.produitVitrine.count({ where: { gamme: { nom: r.gamme }, publie: true } });
    console.log(`   ${r.gamme.padEnd(8)} ${illustres} / ${total} produits illustrés`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
