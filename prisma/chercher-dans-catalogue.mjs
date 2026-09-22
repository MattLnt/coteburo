// Où une référence apparaît-elle dans un catalogue fournisseur ?
//
//   node prisma/chercher-dans-catalogue.mjs <fichier.pdf> AOJ0
//
// NE LIT QUE. Rend les numéros de page, à lire ensuite avec
// prisma/lire-page-catalogue.mjs.
import { readFileSync } from "node:fs";

const [fichier, ...mots] = process.argv.slice(2);
if (!fichier || !mots.length) {
  console.error("usage : node prisma/chercher-dans-catalogue.mjs <fichier.pdf> <mot> …");
  process.exit(1);
}

const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await getDocument({
  data: new Uint8Array(readFileSync(fichier)),
  useSystemFonts: true,
}).promise;

for (let n = 1; n <= doc.numPages; n += 1) {
  const t = await (await doc.getPage(n)).getTextContent();
  const txt = t.items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
  const trouves = mots.filter((m) => txt.toUpperCase().includes(m.toUpperCase()));
  if (trouves.length) console.log(`page ${n} : ${trouves.join(" · ")}`);
}
