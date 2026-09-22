// Rend une page du tarif en PNG, pour la LIRE plutôt que la deviner.
//
//   node prisma/rendre-page-tarif.mjs 263
//   node prisma/rendre-page-tarif.mjs 238 239 241
//   node prisma/rendre-page-tarif.mjs --tarif sokoa 129 130
//
// --tarif accepte « buronomic » (défaut), « sokoa » ou « officepro ».
//
// POURQUOI
//   L'extraction de texte linéarise un tableau : les notes se mêlent aux
//   lignes, les bandeaux de décor rendent « N F M Y S X 9 G » sans dire quelle
//   lettre va avec quel nom, et deux colonnes de références se confondent.
//   Sur la page 241 j'ai cru un instant que Noir valait 9 ; l'image dit G.
//
//   Quand une page porte un tableau à plusieurs colonnes — et toutes les
//   pages « à composer » en portent un — il faut la regarder.
//
// Écrit page-<n>.png dans le dossier courant.
import { readFileSync, writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

const TARIFS = {
  buronomic: "catalogue-2026/catalogue_buronomic_2026_fr.pdf",
  sokoa: "catalogue-2026/SOKOA_TARIF 2026_FR.pdf",
  officepro: "catalogue-2026/TARIF GENERAL COMPLET OFFICEPRO SEATING 2026.pdf",
};
const args = process.argv.slice(2);
const i = args.indexOf("--tarif");
const tarif = i >= 0 ? args[i + 1] : "buronomic";
const pages = args.filter((a, k) => k !== i && k !== i + 1).map(Number).filter(Boolean);
if (!TARIFS[tarif]) { console.error(`tarif inconnu : ${tarif} — ${Object.keys(TARIFS).join(", ")}`); process.exit(1); }

const doc = await getDocument({
  data: new Uint8Array(readFileSync(TARIFS[tarif])),
  useSystemFonts: true,
}).promise;

for (const n of pages) {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale: 2.2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const out = `page-${tarif}-${n}.png`;
  writeFileSync(out, canvas.toBuffer("image/png"));
  console.log(out);
}
