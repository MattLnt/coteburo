// Recrée les palettes de finition et leurs nuanciers.
//
// En simulation par défaut. Il faut --appliquer pour écrire.
//
//   node prisma/recreer-palettes.mjs
//   node prisma/recreer-palettes.mjs --appliquer
//
// D'OÙ VIENNENT LES PALETTES
//   Du classeur, de nulle part : il décrit des références et des prix, pas
//   des nuanciers. La seule source est la SAUVEGARDE d'avant-purge, qui
//   garde les quinze palettes et leurs deux cent dix-neuf modèles avec leur
//   nom, leur couleur et leur ordre. On les remonte tels quels.
//
// D'OÙ VIENNENT LES IMAGES
//   Les URL de la sauvegarde pointent toutes sur Cloudinary, qui a été vidé :
//   elles sont mortes. On repart donc des fichiers locaux.
//
//     sokoa_swatches/        144 pastilles, avec un manifeste qui donne
//                            « label » — exactement le nom du modèle — et le
//                            fichier correspondant. Le rapprochement est donc
//                            une lecture, pas une devinette.
//     Finitions/BeSoft/        6 fichiers nommés par leur teinte
//     Finitions/Step Melange/  9 idem
//
//   Pour ces deux derniers, le nom du fichier est la teinte en minuscules et
//   sans accent : « foret.jpg » pour « Forêt ».
//
// CE QUE CE SCRIPT NE FAIT PAS
//   Il ne téléverse rien. « imageUrl » reste vide : la pastille sera remplie
//   à l'envoi sur Cloudinary, que tu as réservé pour après ta vérification.
//   Les fichiers appariés sont rassemblés dans CATALOGUE-2026/_NUANCIERS/ et
//   la correspondance écrite en CSV, pour que cet envoi n'ait plus qu'à
//   suivre la liste.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdir, mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const SAUVEGARDE = "prisma/sauvegardes/catalogue-avant-purge-2026-09-19T08-20-15.json";
const MEDIAS = ["C:", "Users", "akeys", "Desktop", "Matt", "COTEBURO-MEDIAS"].join("/");
const NUANCIERS = `${MEDIAS}/CATALOGUE-2026/_NUANCIERS`;
const SWATCHES = "sokoa_swatches";
const FINITIONS_LOCALES = {
  BeSoft: `${MEDIAS}/Finitions/BeSoft`,
  "Step Mélange": `${MEDIAS}/Finitions/Step Melange`,
};

const titre = (t) => console.log(`\n${"═".repeat(66)}\n${t}\n${"═".repeat(66)}`);

const slug = (s) => String(s ?? "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const nomSain = (s) => String(s ?? "")
  .replace(/[<>:"/\\|?*]|[\p{Cc}]/gu, "-").replace(/\s+/g, " ").trim().slice(0, 60);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les palettes sont écrites ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const sauvegarde = JSON.parse(await readFile(SAUVEGARDE, "utf8"));
  const palettes = sauvegarde.palettes || [];
  const modeles = palettes.reduce((n, p) => n + p.finitions.length, 0);
  console.log(`${palettes.length} palettes · ${modeles} modèles dans la sauvegarde`);

  // ── Les sources d'images ──
  const parLabel = new Map();   // nom de modèle → chemin du fichier
  let manifeste = [];
  try {
    manifeste = JSON.parse(await readFile(join(SWATCHES, "manifest.json"), "utf8"));
  } catch {
    console.log("⚠ manifeste des pastilles Sokoa introuvable");
  }
  for (const m of manifeste) {
    if (m.label && m.fichier) parLabel.set(m.label, join(SWATCHES, m.fichier));
  }

  // Buronomic : le fichier porte la teinte, en minuscules et sans accent.
  const parSlug = new Map();    // « palette|slug de teinte » → chemin
  for (const [palette, dossier] of Object.entries(FINITIONS_LOCALES)) {
    let fichiers = [];
    try { fichiers = await readdir(dossier); } catch { continue; }
    for (const f of fichiers) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      parSlug.set(`${palette}|${slug(f.replace(/\.[^.]+$/, ""))}`, join(dossier, f));
    }
  }
  console.log(`${parLabel.size} pastilles Sokoa au manifeste · `
    + `${parSlug.size} fichiers Buronomic`);

  // ── L'appariement ──
  const plan = [];
  const parPalette = [];
  for (const p of palettes) {
    const trouves = [];
    for (const f of p.finitions) {
      const source = parLabel.get(f.nom) || parSlug.get(`${p.nom}|${slug(f.nom)}`) || null;
      if (source) trouves.push({ modele: f.nom, source });
    }
    parPalette.push({ palette: p, trouves: trouves.length });
    for (const t of trouves) {
      plan.push({
        palette: p.nom, marque: p.marque, modele: t.modele, source: t.source,
        dossier: `${NUANCIERS}/${slug(p.marque || "sans-marque")}/${nomSain(p.nom)}`,
        nom: `${nomSain(t.modele)}${extname(t.source).toLowerCase()}`,
      });
    }
  }

  titre("CE QUI SERAIT RECRÉÉ");
  console.log("\n   palette                marque       modèles   avec image");
  for (const { palette: p, trouves } of parPalette) {
    console.log(`   ${p.nom.padEnd(22)} ${String(p.marque || "—").padEnd(12)} `
      + `${String(p.finitions.length).padStart(7)} ${String(trouves).padStart(12)}`);
  }
  console.log(`   ${"─".repeat(58)}`);
  console.log(`   ${"TOTAL".padEnd(35)} ${String(modeles).padStart(7)} `
    + `${String(plan.length).padStart(12)}`);
  console.log(`\n   ${modeles - plan.length} modèles sans source locale — `
    + "nuanciers à redemander au fournisseur");

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  // ── Les palettes en base ──
  //
  // Ni PaletteFinition ni FinitionModele n'a de contrainte d'unicité : on
  // cherche avant de créer, sinon un second passage doublerait tout.
  titre("ÉCRITURE EN BASE");
  let nP = 0;
  let nM = 0;
  for (const p of palettes) {
    let palette = await prisma.paletteFinition.findFirst({
      where: { nom: p.nom, marque: p.marque ?? null },
    });
    if (!palette) {
      palette = await prisma.paletteFinition.create({
        data: { nom: p.nom, marque: p.marque ?? null, ordre: p.ordre ?? 0 },
      });
      nP += 1;
    } else {
      await prisma.paletteFinition.update({
        where: { id: palette.id }, data: { ordre: p.ordre ?? 0 },
      });
    }
    for (const f of p.finitions) {
      const existe = await prisma.finitionModele.findFirst({
        where: { paletteId: palette.id, nom: f.nom },
      });
      // imageUrl reste vide : l'envoi sur Cloudinary viendra plus tard.
      const donnees = { nom: f.nom, couleur: f.couleur ?? null, ordre: f.ordre ?? 0 };
      if (existe) {
        await prisma.finitionModele.update({ where: { id: existe.id }, data: donnees });
      } else {
        await prisma.finitionModele.create({ data: { ...donnees, paletteId: palette.id } });
        nM += 1;
      }
    }
  }
  console.log(`   ${nP} palettes créées · ${nM} modèles créés`);
  console.log(`   palettes en base : ${await prisma.paletteFinition.count()} · `
    + `modèles : ${await prisma.finitionModele.count()}`);

  // ── Les fichiers, rassemblés et tracés ──
  titre("LES PASTILLES, RASSEMBLÉES");
  for (const d of new Set(plan.map((x) => x.dossier))) await mkdir(d, { recursive: true });
  for (const x of plan) await copyFile(x.source, join(x.dossier, x.nom));
  console.log(`   ${plan.length} pastilles copiées dans _NUANCIERS/`);

  const lignes = ["marque;palette;modele;fichier;source"];
  for (const x of plan) {
    lignes.push(`${x.marque};${x.palette};${x.modele};`
      + `${x.dossier.slice(NUANCIERS.length + 1)}/${x.nom};${x.source}`);
  }
  await writeFile(`${NUANCIERS}/_CORRESPONDANCE.csv`, `${lignes.join("\n")}\n`, "utf8");
  console.log("   correspondance écrite → _NUANCIERS/_CORRESPONDANCE.csv");

  const manquants = [];
  for (const p of palettes) {
    for (const f of p.finitions) {
      if (!parLabel.has(f.nom) && !parSlug.has(`${p.nom}|${slug(f.nom)}`)) {
        manquants.push(`${p.marque} · ${p.nom} · ${f.nom}`);
      }
    }
  }
  if (manquants.length) {
    await writeFile(`${NUANCIERS}/_SANS-PASTILLE.txt`, `${manquants.sort().join("\n")}\n`, "utf8");
    console.log(`   ${manquants.length} modèles sans pastille → _NUANCIERS/_SANS-PASTILLE.txt`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
