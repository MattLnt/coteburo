// Cherche ce que le tarif vend et que le catalogue n'a nulle part.
//
//   node prisma/auditer-references-manquantes.mjs
//   node prisma/auditer-references-manquantes.mjs --tarif sokoa
//   node prisma/auditer-references-manquantes.mjs --tarif sokoa --page 46
//
// Ce script N'ÉCRIT JAMAIS. Il lit et il rapporte.
//
// POURQUOI
//   C'est le défaut le plus sournois du catalogue : une fiche existe, elle a
//   l'air complète, elle est commandable — et elle ne vend qu'une partie de
//   son bloc de tarif. Rien ne le signale. Deux cas trouvés à la main :
//
//     Wi-Max, p.46   « Siège haut dossier résille » n'a que WR66/10 et
//                    WR06/10, les versions SANS accotoirs. WR66/1N et
//                    WR66/15 — accotoirs 4D et 3D — manquent : deux tiers
//                    du bloc.
//     Bero,   p.67   « Fauteuil coque bois, patins » n'a que ER05/11.
//                    ER05/B1, la base blanche, manque.
//
// LA PREMIÈRE IDÉE, ET POURQUOI ELLE ÉCHOUE
//   Chercher, autour des références d'une fiche, celles qui lui ressemblent.
//   Ça ne marche pas : chez Sokoa le chiffre du mécanisme est au milieu, donc
//   WR66/10 et WR06/10 ne partagent que « WR » ; et surtout les variantes
//   manquantes diffèrent sur des positions CONSTANTES dans ce qu'on possède.
//   Un masque bâti sur nos propres références ne peut pas les voir.
//
// L'IDÉE QUI MARCHE
//   Prendre le problème par l'autre bout : lister tous les codes du tarif,
//   retirer tous ceux que le catalogue cite QUELQUE PART, et regarder ce qui
//   reste. Un code que le tarif imprime et qu'aucune fiche ne porte est soit
//   un produit absent, soit un code qui n'est pas un produit.
//
//   Les orphelines sont rapportées par page, avec les références VOISINES que
//   la base connaît — c'est ce voisinage qui dit à quelle fiche rattacher la
//   piste, et qui rend la sortie lisible.
//
// CE QU'IL NE SAIT PAS FAIRE
//   Distinguer un produit absent d'un code qui n'en est pas un : une option,
//   un renvoi, un accessoire cité dans une note. Sa sortie se LIT, elle ne
//   s'applique pas. Chaque piste se vérifie sur sa page avant d'importer.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const lire = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const TARIF = lire("--tarif");
const PAGE = lire("--page") ? Number(lire("--page")) : null;
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

const TARIFS = {
  sokoa: { chemin: "catalogue-2026/SOKOA_TARIF 2026_FR.pdf",
    // WR66/10, DOA1/3, EI17/51, KPDC/10…
    motif: /\b[A-Z]{2}[A-Z0-9]{2}\/[A-Z0-9]{1,2}\b/g },
  buronomic: { chemin: "catalogue-2026/catalogue_buronomic_2026_fr.pdf",
    // BH693, DZ07, EH783, DY195G…
    motif: /\b[A-Z]{2}\d{3}[A-Z]?\b/g },
  officepro: { chemin: "catalogue-2026/TARIF GENERAL COMPLET OFFICEPRO SEATING 2026.pdf",
    // ARC07GR, KOUS05BE-ARC, COQU01BLA-TEC…
    motif: /\b[A-Z]{3,4}\d{2}[A-Z]{0,3}(?:-[A-Z]{3})?\b/g },
};

/** Combien de caractères séparent deux codes de même longueur ? */
function distance(a, b) {
  if (a.length !== b.length) return 99;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

async function main() {
  console.log("═══ LECTURE SEULE — rien n'est écrit ═══\n");

  // Tout ce que le catalogue cite, publié ou non : une référence connue d'une
  // fiche en brouillon n'est pas « absente », elle attend sa publication.
  const combis = await prisma.combinaison.findMany({
    select: { referenceBase: true, vitrine: { select: { nom: true, publie: true, accessoireSeul: true } } },
  });
  const connues = new Map();
  for (const k of combis) {
    const r = String(k.referenceBase || "").trim();
    if (!r) continue;
    if (!connues.has(r)) connues.set(r, k.vitrine?.nom || "?");
  }
  console.log(`   ${connues.size} références distinctes dans le catalogue\n`);

  const choisis = TARIF ? [TARIF] : Object.keys(TARIFS);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  for (const nom of choisis) {
    const t = TARIFS[nom];
    if (!t) { console.log(`   tarif inconnu : ${nom}`); continue; }
    const doc = await getDocument({ data: new Uint8Array(readFileSync(t.chemin)), useSystemFonts: true }).promise;

    const orphelinesParPage = new Map();
    let vues = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      if (PAGE && n !== PAGE) continue;
      const c = await doc.getPage(n).then((p) => p.getTextContent());
      const texte = c.items.map((i) => i.str).join(" ").replace(/\s+/g, " ");
      const codes = [...new Set(texte.match(t.motif) || [])];
      vues += codes.length;
      const absentes = codes.filter((code) => !connues.has(code));
      // Les références CONNUES que cette page imprime aussi : ce sont elles
      // qui disent de quel produit la page parle.
      const presentes = codes.filter((code) => connues.has(code));
      if (absentes.length) orphelinesParPage.set(n, { absentes, presentes });
    }

    titre(`TARIF ${nom.toUpperCase()} — ${orphelinesParPage.size} pages avec des codes absents du catalogue`);
    const lignes = [];
    for (const [page, { absentes, presentes }] of orphelinesParPage) {
      for (const code of absentes) {
        // La voisine la plus proche parmi les références que CETTE PAGE
        // imprime. C'est tout le resserrement : un code absent qui ressemble
        // à une référence d'une AUTRE page est presque toujours un produit
        // d'une autre gamme — ODJ0/3 chez Klik, JHA0/1N chez Adio. Sur la
        // même page, en revanche, la ressemblance désigne le même bloc de
        // tarif, donc une variante qui nous manque.
        let proche = null, d = 99;
        for (const k of presentes) {
          const dd = distance(code, k);
          if (dd < d) { d = dd; proche = { code: k, fiche: connues.get(k) }; }
        }
        if (proche && d <= 2) lignes.push({ page, code, d, proche });
      }
    }
    lignes.sort((a, b) => a.d - b.d || a.page - b.page);

    console.log(`\n   ${lignes.length} codes absents qui ressemblent à une référence de LA MÊME PAGE`);
    console.log(`   (à deux caractères près : même bloc de tarif, donc variante qui nous manque)\n`);
    const parFiche = new Map();
    for (const l of lignes) {
      if (!parFiche.has(l.proche.fiche)) parFiche.set(l.proche.fiche, []);
      parFiche.get(l.proche.fiche).push(l);
    }
    const classees = [...parFiche].sort((a, b) => b[1].length - a[1].length);
    for (const [fiche, ls] of classees.slice(0, 30)) {
      const pages = [...new Set(ls.map((l) => l.page))].sort((a, b) => a - b);
      console.log(`   ${fiche}`);
      console.log(`      page${pages.length > 1 ? "s" : ""} ${pages.join(", ")} · connue ${ls[0].proche.code}`);
      console.log(`      absentes : ${[...new Set(ls.map((l) => l.code))].sort().join(" ")}`);
    }
    if (classees.length > 30) console.log(`\n   … et ${classees.length - 30} autres fiches`);
    console.log(`\n   ${vues} codes lus dans ce tarif`);
  }

  console.log("\n   Ce sont des PISTES. Chacune se vérifie sur sa page avant d'importer.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
