import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Nettoyage du catalogue après les imports en masse.
//
// Constat de l'audit : pour chaque gamme, deux générations de fiches
// coexistent. Les anciennes portent les photos mais une seule section
// descriptive, pas d'accessoires et pas de dimensions. Les nouvelles ont
// la structure complète mais aucune image.
//
// On garde les nouvelles, on leur transfère les photos de leur gamme,
// on supprime les anciennes, puis on retire les suffixes « - NEW ».
//
// Les listes sont explicites plutôt que devinées : un score automatique
// se trompait sur les cas où les deux fiches se complètent.

const APPLIQUER = process.argv.includes("--appliquer");
const SUFFIXE = " - NEW";

// Fiches à supprimer, nom exact. Ce sont les anciennes saisies, rendues
// obsolètes par l'import.
const A_SUPPRIMER = [
  // ── Sokoa ──
  "Chaise Adela", "Fauteuil Adela", "Tabouret Adela",
  "Siège haut Alaia",
  "Niveau supplémentaire Archikit", "Rayonnage niveaux ajourés Archikit", "Rayonnage niveaux pleins Archikit",
  "Pouf Batbi",
  "Chaise Bero", "Fauteuil Bero",
  "Fauteuil de direction - Eman", "Siège opérateur Eman",
  "Canapé Emeki", "Fauteuil Emeki", "Pouf Emeki",
  "Fauteuil lounge Ildo",
  "Chaise Kanpoa", "Fauteuil Kanpoa", "Fauteuil lounge Kanpoa",
  "Table cafétéria Kanpoa", "Table mange-debout Kanpoa", "Tabouret Kanpoa",
  "Chaise giratoire Klik", "Chaise Klik", "Siège étudiant Klik", "Tabouret Klik",
  "Meuble de rangement Kulbu", "Pouf Kulbu",
  "Chaise Loria", "Fauteuil Loria", "Tabouret Loria",
  "Fauteuil visiteur Luma",
  "Siège opérateur Luz",
  "Chaise Maike", "Tabouret Maike",
  "Canapé Punta", "Fauteuil Punta", "Table basse Punta",
  "Canapé Rhune", "Fauteuil Rhune", "Méridienne Rhune", "Table basse Rhune",
  "Siège haut Tertio",
  "Siège haut Torino",
  "Siège opérateur Wimax",
  "Siège ergonomique Wimax Ergo",

  // ── Buronomic ──
  // Sur Rétro, l'ancienne fiche est publiée avec ses photos et vaut mieux
  // que la nouvelle : c'est elle qu'on garde, donc on efface l'importée.
  "Bureau plan droit - Rétro - NEW",
  "Bureau plan compact 90° - Rétro - NEW",
  // Les accessoires anciens portent un prix que les importés n'ont pas.
  "Obturateur électrifié simple - NEW",
  "Goulotte simple d'électrification - NEW",
];

// Gammes vidées par les suppressions ci-dessus. Leurs produits vivent
// désormais dans « Sièges Hauts » ou dans les gammes Wi-Max.
const GAMMES_A_SUPPRIMER = ["Alaia", "Tertio", "Torino", "Wimax", "Wimax Ergo"];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer pour exécuter ═══\n");

  // ── 1. Récupération des images, gamme par gamme ──
  // Les anciennes fiches d'une même gamme partagent le même jeu de photos.
  // On le reconstitue pour le poser sur les fiches conservées.
  const anciennes = await prisma.produitVitrine.findMany({
    where: { nom: { in: A_SUPPRIMER } },
    include: { gamme: { select: { id: true, nom: true } }, optionPour: { select: { id: true, nom: true } } },
  });

  console.log(`${anciennes.length} fiche(s) trouvée(s) sur ${A_SUPPRIMER.length} demandée(s).`);

  const introuvables = A_SUPPRIMER.filter((n) => !anciennes.some((a) => a.nom === n));
  if (introuvables.length) {
    console.log(`\n⚠ Introuvables : ${introuvables.join(", ")}`);
  }

  const imagesParGamme = new Map();
  for (const a of anciennes) {
    if (!imagesParGamme.has(a.gamme.nom)) imagesParGamme.set(a.gamme.nom, new Set());
    const pool = imagesParGamme.get(a.gamme.nom);
    if (a.imageUrl) pool.add(a.imageUrl);
    (a.images || []).forEach((u) => pool.add(u));
  }

  console.log(`\n── Photos récupérées ──`);
  for (const [gamme, pool] of imagesParGamme) {
    if (pool.size) console.log(`   ${gamme} : ${pool.size} image(s)`);
  }

  // On archive les URL : si le transfert ne convient pas, elles restent
  // récupérables sans repasser par Cloudinary.
  const archive = {};
  for (const [gamme, pool] of imagesParGamme) archive[gamme] = [...pool];
  await writeFile("images-recuperees.json", JSON.stringify(archive, null, 2), "utf8");
  console.log(`\n   archivées dans images-recuperees.json`);

  // ── 2. Fiches conservées qui n'ont aucune image ──
  const aPhotographier = await prisma.produitVitrine.findMany({
    where: {
      gamme: { nom: { in: [...imagesParGamme.keys()] } },
      NOT: { nom: { in: A_SUPPRIMER } },
      imageUrl: null,
    },
    include: { gamme: { select: { nom: true } } },
  });

  console.log(`\n── Transfert des photos ──`);
  for (const v of aPhotographier) {
    const pool = imagesParGamme.get(v.gamme.nom);
    if (!pool?.size) continue;
    console.log(`   ${v.nom} ← ${pool.size} image(s) de la gamme`);
  }

  // ── 3. Renommages ──
  const aRenommer = await prisma.produitVitrine.findMany({
    where: {
      nom: { contains: SUFFIXE },
      NOT: { nom: { in: A_SUPPRIMER } },
    },
    select: { id: true, nom: true },
  });
  console.log(`\n── ${aRenommer.length} renommage(s) ──`);

  // ── 4. Liaisons à reporter ──
  // Un accessoire supprimé qui servait à des produits doit voir ses
  // liaisons basculer sur la fiche équivalente conservée.
  const reports = [];
  for (const a of anciennes) {
    if (!a.optionPour.length) continue;

    // Les noms ne coïncident pas toujours entre les deux générations :
    // « Goulotte simple d'électrification » face à « Goulotte simple
    // électrification ». On déclare les correspondances qui échappent
    // à la comparaison par préfixe.
    const EQUIVALENCES = {
      "Goulotte simple d'électrification - NEW": "Goulotte simple électrification",
    };

    const nomCible = EQUIVALENCES[a.nom] || a.nom.replace(SUFFIXE, "");

    const remplacant = await prisma.produitVitrine.findFirst({
      where: {
        gammeId: a.gamme.id,
        nom: { startsWith: nomCible },
        NOT: { id: a.id },
      },
      select: { id: true, nom: true },
    });

    if (remplacant) {
      reports.push({ de: a, vers: remplacant });
      console.log(`\n   « ${a.nom} » → « ${remplacant.nom} » sur ${a.optionPour.length} produit(s)`);
    } else {
      console.log(`\n   ⚠ « ${a.nom} » est lié à ${a.optionPour.length} produit(s) sans remplaçant :`);
      a.optionPour.forEach((p) => console.log(`      ${p.nom}`));
    }
  }

  if (!APPLIQUER) {
    console.log(`\n═══ ${anciennes.length} suppression(s) · ${aRenommer.length} renommage(s) · ${aPhotographier.length} transfert(s) ═══`);
    console.log("\nnode prisma\\nettoyage-final.mjs --appliquer");
    return;
  }

  // ── Exécution ──
  console.log("\n── Exécution ──");

  for (const { de, vers } of reports) {
    for (const parent of de.optionPour) {
      await prisma.produitVitrine.update({
        where: { id: parent.id },
        data: { optionsLiees: { connect: { id: vers.id } } },
      });
    }
  }
  console.log(`${reports.length} liaison(s) reportée(s).`);

  for (const v of aPhotographier) {
    const pool = imagesParGamme.get(v.gamme.nom);
    if (!pool?.size) continue;
    const urls = [...pool];
    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { imageUrl: urls[0], images: urls },
    });
  }
  console.log(`${aPhotographier.length} fiche(s) photographiée(s).`);

  const sup = await prisma.produitVitrine.deleteMany({
    where: { id: { in: anciennes.map((a) => a.id) } },
  });
  console.log(`${sup.count} fiche(s) supprimée(s).`);

  for (const r of aRenommer) {
    await prisma.produitVitrine.update({
      where: { id: r.id },
      data: { nom: r.nom.replace(SUFFIXE, "") },
    });
  }
  console.log(`${aRenommer.length} fiche(s) renommée(s).`);

  // Les gammes devenues vides n'ont plus lieu d'être.
  for (const nom of GAMMES_A_SUPPRIMER) {
    const g = await prisma.gamme.findFirst({
      where: { nom },
      include: { _count: { select: { vitrines: true } } },
    });
    if (!g) continue;
    if (g._count.vitrines > 0) {
      console.log(`⚠ Gamme « ${nom} » conservée — ${g._count.vitrines} produit(s) restant(s).`);
      continue;
    }
    await prisma.gamme.delete({ where: { id: g.id } });
    console.log(`Gamme « ${nom} » supprimée.`);
  }

  const restants = await prisma.produitVitrine.count({ where: { nom: { contains: SUFFIXE } } });
  console.log(`\n${restants} suffixe(s) « - NEW » restant(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());