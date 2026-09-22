// Le texte d'une page d'un catalogue fournisseur.
//
//   node prisma/lire-page-catalogue.mjs <fichier.pdf> 205 206
//
// NE LIT QUE. Sert à vérifier une affirmation du catalogue avant de l'écrire
// dans la base : un code de coloris, un accord de teintes, une restriction.
//
// POURQUOI UN SCRIPT ET PAS UN COUP D'ŒIL
//   Les fiches renvoient à des pages précises — « Nuancier page 205 du
//   catalogue Sokoa ». Quand un regroupement dépend de ce que dit cette page,
//   il faut pouvoir la citer, pas s'en souvenir.
import { readFileSync } from "node:fs";

const [fichier, ...pages] = process.argv.slice(2);
if (!fichier) {
  console.error("usage : node prisma/lire-page-catalogue.mjs <fichier.pdf> [page …]");
  process.exit(1);
}

const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await getDocument({
  data: new Uint8Array(readFileSync(fichier)),
  useSystemFonts: true,
}).promise;

console.log(`${doc.numPages} pages`);
for (const n of pages.map(Number).filter((n) => n >= 1 && n <= doc.numPages)) {
  const t = await (await doc.getPage(n)).getTextContent();
  const txt = t.items.map((i) => i.str).join(" ").replace(/[ \t]+/g, " ").trim();
  console.log(`\n${"═".repeat(72)}\npage ${n}\n${"═".repeat(72)}\n${txt}`);
}
