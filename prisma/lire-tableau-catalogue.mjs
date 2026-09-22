// Lire une page de tarif comme un tableau, et non comme une phrase.
//
//   node prisma/lire-tableau-catalogue.mjs <fichier.pdf> 73
//   node prisma/lire-tableau-catalogue.mjs <fichier.pdf> 73 --ref=LCJ0
//
// NE LIT QUE.
//
// POURQUOI
//   prisma/lire-page-catalogue.mjs rend le texte dans l'ordre où le PDF le
//   stocke, qui n'est pas celui où l'œil le lit. Sur une page à six colonnes,
//   il donne « LCJ0/1 224 … LCJ0/1 232 » : deux fois la même référence, deux
//   prix, et aucun moyen de savoir laquelle est « sur patins » et laquelle
//   « sur roulettes ».
//
//   Deviner, ici, c'est se tromper une fois sur deux sur un prix que le client
//   paie. On relève donc la position de chaque mot, et l'on rend les lignes
//   telles qu'elles sont imprimées, de gauche à droite.
//
// CE QU'IL NE FAIT PAS
//   Reconnaître les colonnes ni les en-têtes. Il rend des lignes lisibles ;
//   c'est à l'œil de rattacher une ligne à son titre. Un tableau qu'on ne peut
//   pas relire n'est pas un tableau, c'est un pari.
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const fichier = args.find((a) => !a.startsWith("--"));
const pages = args.filter((a) => !a.startsWith("--") && a !== fichier).map(Number);
const filtre = (args.find((a) => a.startsWith("--ref=")) || "").slice(6).toUpperCase() || null;

if (!fichier || !pages.length) {
  console.error("usage : node prisma/lire-tableau-catalogue.mjs <fichier.pdf> <page> [--ref=LCJ0]");
  process.exit(1);
}

const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await getDocument({
  data: new Uint8Array(readFileSync(fichier)),
  useSystemFonts: true,
}).promise;

// Deux mots sont sur la même ligne si leurs bases sont à moins de ça l'une de
// l'autre. Trois points : les tarifs Sokoa impriment en corps 6 à 7.
const TOLERANCE = 3;

for (const n of pages.filter((p) => p >= 1 && p <= doc.numPages)) {
  const page = await doc.getPage(n);
  const contenu = await page.getTextContent();

  const mots = contenu.items
    .filter((i) => String(i.str).trim())
    .map((i) => ({ texte: i.str.trim(), x: i.transform[4], y: i.transform[5] }));

  // Regrouper par ordonnée, puis trier chaque ligne de gauche à droite.
  const lignes = [];
  for (const m of mots.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const derniere = lignes[lignes.length - 1];
    if (derniere && Math.abs(derniere.y - m.y) <= TOLERANCE) derniere.mots.push(m);
    else lignes.push({ y: m.y, mots: [m] });
  }

  console.log(`\n${"═".repeat(72)}\npage ${n} — ${lignes.length} lignes\n${"═".repeat(72)}`);
  for (const l of lignes) {
    const mots = l.mots.sort((a, b) => a.x - b.x);
    const texte = mots.map((m) => `${m.texte}@${Math.round(m.x)}`).join("  ");
    if (filtre && !texte.toUpperCase().includes(filtre)) continue;
    console.log(`y=${String(Math.round(l.y)).padStart(4)}  ${texte}`);
  }
}
