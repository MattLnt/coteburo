// Prépare le tableau de renommage des packshots Sokoa, vignette à l'appui.
//
// La pastille de la galerie se lit dans le nom du fichier : « ADELA_ALA00__Noir »
// donne « Noir ». Reste à dire quelle couleur montre chaque photo — ce que seul
// l'œil sait faire. Ce script produit un classeur où chaque ligne porte sa
// vignette, pour remplir la colonne « couleur » sans ouvrir un seul fichier.
// sokoa-renommer.mjs applique ensuite.
//
// Le tri écarte les ambiances — mises en situation : un tissu peut y être
// visible, ce n'est pas l'information que l'image porte — et les vues de
// détail. Restent les photos montrant le produit entier, reconnaissables à
// leur code produit.
//
// Le tri se trompe forcément un peu, dans les deux sens. Une couleur laissée
// vide suffit à écarter une ligne : le renommage ne touche qu'aux lignes
// remplies. Pour une photo qui manquerait, ajoutez la ligne à la main.
//
//   node prisma/sokoa-lister-packshots.mjs
//   node prisma/sokoa-lister-packshots.mjs ADELA TERTIO   (quelques gammes)
import { readdir, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import ExcelJS from "exceljs";
import sharp from "sharp";

const RACINE = "C:/Users/pages/Bureau/Matt/projets/COTEBURO-MEDIAS/Sokoa/fichiers_sokoa";
const SORTIE = "prisma/sokoa-packshots.xlsx";
const IMG = [".jpg", ".jpeg", ".png", ".webp"];

// Vignette : assez grande pour juger d'une couleur, assez petite pour que le
// classeur reste manipulable sur trois cents lignes.
const VIGNETTE = 110;
const HAUTEUR_LIGNE = 85; // points

const DEMANDES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const AMBIANCE = /amb|bodegon|workspace|coworking|h[oô]tel|lounge|caf[ée]t|restaurant|biblioth|r[ée]union|meeting|education|terrasse|outdoor|studio|galerie|home|poutres|conf[ée]rence/i;
const DETAIL = /zoom|d[ée]tail|housse|empilab|pi[èe]tement|couture|accroche|\bacc\b|dos$|r[ée]glage|m[ée]canisme|poche|chariot|tablette|t[êe]ti[èe]re|[ée]ventail/i;
const CODE = /[A-Z]{2,3}[0-9]{2,6}/;

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function main() {
  const dossiers = (await readdir(RACINE, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((d) => !DEMANDES.length || DEMANDES.some((n) => norm(d).includes(norm(n))));

  const retenus = [];
  const parDossier = {};
  let ecartes = 0;

  for (const d of dossiers) {
    const fichiers = (await readdir(join(RACINE, d), { withFileTypes: true }))
      .filter((e) => e.isFile() && IMG.includes(extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();

    for (const f of fichiers) {
      const base = basename(f, extname(f));
      // Déjà renommé : on ne le repropose pas.
      if (base.includes("__")) { ecartes++; continue; }
      if (AMBIANCE.test(base) || DETAIL.test(base) || !CODE.test(base)) { ecartes++; continue; }
      retenus.push({ dossier: d, fichier: f, chemin: join(RACINE, d, f).replace(/\\/g, "/") });
      parDossier[d] = (parDossier[d] || 0) + 1;
    }
  }

  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet("Packshots Sokoa");

  feuille.columns = [
    { header: "Vignette", key: "vignette", width: 17 },
    { header: "Dossier", key: "dossier", width: 15 },
    { header: "Fichier", key: "fichier", width: 46 },
    { header: "Couleur", key: "couleur", width: 24 },
    { header: "Chemin", key: "chemin", width: 78 },
  ];

  const enTete = feuille.getRow(1);
  enTete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  enTete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF23262A" } };
  enTete.alignment = { vertical: "middle" };
  enTete.height = 22;

  // La colonne à remplir se voit au premier coup d'œil.
  feuille.getColumn("couleur").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE6D6" } };

  let vignettes = 0, echecs = 0;
  for (const r of retenus) {
    const ligne = feuille.addRow({ dossier: r.dossier, fichier: r.fichier, couleur: "", chemin: r.chemin });
    ligne.height = HAUTEUR_LIGNE;
    ligne.alignment = { vertical: "middle", wrapText: false };

    try {
      // « contain » sur fond blanc : une vignette rognée mentirait sur la
      // couleur dominante, qui est justement ce qu'on vient juger.
      const buffer = await sharp(r.chemin)
        .flatten({ background: "#ffffff" })
        .resize(VIGNETTE, VIGNETTE, { fit: "contain", background: "#ffffff" })
        .jpeg({ quality: 72 })
        .toBuffer();

      const id = classeur.addImage({ buffer, extension: "jpeg" });
      // Ancrage sur la cellule de la colonne A, en pixels.
      feuille.addImage(id, {
        tl: { col: 0.08, row: ligne.number - 1 + 0.06 },
        ext: { width: VIGNETTE, height: HAUTEUR_LIGNE * 1.28 },
      });
      vignettes++;
    } catch (e) {
      echecs++;
      ligne.getCell("vignette").value = "vignette illisible";
    }
  }

  feuille.views = [{ state: "frozen", ySplit: 1 }];
  feuille.autoFilter = { from: { row: 1, column: 2 }, to: { row: retenus.length + 1, column: 5 } };

  await mkdir("prisma", { recursive: true });
  await classeur.xlsx.writeFile(SORTIE);

  console.log(`${retenus.length} packshots candidats · ${ecartes} écartés (ambiance, détail, sans code, déjà renommés)`);
  console.log(`${vignettes} vignettes insérées${echecs ? ` · ${echecs} illisibles` : ""}\n`);
  for (const [d, n] of Object.entries(parDossier).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(3)}  ${d}`);
  }
  console.log(`\nÉcrit dans ${SORTIE}`);
  console.log("Remplissez la colonne « Couleur ». Laissée vide, la ligne est ignorée.");
  console.log("Puis : node prisma/sokoa-renommer.mjs   (simulation)");
}

main().catch((e) => { console.error(e); process.exit(1); });
