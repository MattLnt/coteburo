// Prépare le nuancier fournisseur pour prisma/pastilles-sokoa.mjs.
//
//   node prisma/preparer-nuancier.mjs [chemin/du/nuancier.pdf]
//
// N'ÉCRIT RIEN EN BASE. Produit deux choses dans .tmp-nuancier :
//
//   pages/pNN.png   chaque page rendue à deux fois sa taille
//   places.json     le rectangle de chaque pastille, page par page
//
// POURQUOI RENDRE LES PAGES
//   Les libellés du nuancier Sokoa sont des tracés vectoriels, pas du texte :
//   rien ne s'en extrait, et il faut les lire à l'œil pour établir la table
//   d'appariement. Les pastilles, elles, sont des images posées à des
//   coordonnées connues — on les découpe dans la page rendue plutôt que de
//   les extraire du PDF, car l'ordre des flux ne suit pas celui de la page.
//
// LE DÉDOUBLONNAGE
//   Une même pastille est parfois peinte deux fois. Les rectangles sont donc
//   dédoublonnés par position, puis lus par rangée, de gauche à droite —
//   l'ordre dans lequel un œil humain les lit, et celui de la table.
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const PDF = process.argv[2] || "catalogue-2026/Sokoa_Nuancier_2026.pdf";
const SORTIE = ".tmp-nuancier";
const ECHELLE = 2;

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

const data = new Uint8Array(readFileSync(PDF));
const doc = await getDocument({ data, useSystemFonts: true }).promise;
mkdirSync(`${SORTIE}/pages`, { recursive: true });

const tout = [];
for (let i = 1; i <= doc.numPages; i += 1) {
  const page = await doc.getPage(i);
  const vp = page.getViewport({ scale: ECHELLE });

  const canvas = createCanvas(vp.width, vp.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, vp.width, vp.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  writeFileSync(`${SORTIE}/pages/p${String(i).padStart(2, "0")}.png`, canvas.toBuffer("image/png"));

  // Où chaque image est posée : on rejoue la pile de transformations.
  const ops = await page.getOperatorList();
  const h1 = vp.height / ECHELLE;
  let ctm = [1, 0, 0, 1, 0, 0];
  const pile = [];
  const images = [];
  for (let k = 0; k < ops.fnArray.length; k += 1) {
    const fn = ops.fnArray[k];
    const args = ops.argsArray[k];
    if (fn === OPS.save) pile.push([...ctm]);
    else if (fn === OPS.restore) ctm = pile.pop() || ctm;
    else if (fn === OPS.transform) ctm = mul(ctm, args);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject || fn === OPS.paintImageXObjectRepeat) {
      images.push({
        nom: args[0],
        x: Math.round(ctm[4]), y: Math.round(h1 - ctm[5] - Math.abs(ctm[3])),
        l: Math.round(Math.abs(ctm[0])), h: Math.round(Math.abs(ctm[3])),
      });
    }
  }
  images.sort((a, b) => (Math.abs(a.y - b.y) > 12 ? a.y - b.y : a.x - b.x));
  tout.push({ page: i, largeur: Math.round(vp.width / ECHELLE), hauteur: Math.round(h1), images });
  process.stdout.write(`p${i} `);
}

writeFileSync(`${SORTIE}/places.json`, JSON.stringify(tout, null, 1));
console.log(`\n${doc.numPages} pages rendues dans ${SORTIE}/pages, positions dans ${SORTIE}/places.json`);
