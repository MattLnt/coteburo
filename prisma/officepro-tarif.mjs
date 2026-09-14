// Lecture du tarif général OfficePro 2026 vers un JSON inspectable.
//
// Aucune écriture en base : ce script ne fait que lire le PDF et rendre
// compte. L'import proprement dit viendra ensuite, sur ce fichier.
//
// Le tableau du PDF a des cellules fusionnées verticalement : le nom de la
// gamme, la désignation et le prix n'apparaissent qu'une fois par groupe de
// coloris, **centrés** sur le groupe.
//
// Une cellule fusionnée étant centrée sur toute son étendue, la règle juste
// est « l'étiquette la plus proche en ordonnée » : les frontières tombent
// d'elles-mêmes à mi-chemin entre deux étiquettes voisines.
//
// À une condition, qui m'a coûté trois essais : ne filtrer aucune cellule de
// la colonne. Écarter les mentions non chiffrées — « prix inclus avec le
// canapé » — faisait remonter le prix du fauteuil voisin sur les coussins
// KANAP, qui valaient soudain 395 €.
//
// Mesures relevées sur le PDF : l'interligne fait 8 px, la continuation d'un
// libellé sur deux lignes 7 px (« KANAP COUSSIN » au-dessus de « RECTANGLE »),
// et deux étiquettes distinctes sont séparées d'au moins 24 px. Le seuil de
// recollage est donc posé à 7.
//
// L'ancrage se fait sur le code-barre, seule colonne complète : 580 lignes,
// une par référence vendue.
//
//   node prisma/officepro-tarif.mjs
//   node prisma/officepro-tarif.mjs --detail ARCO
import { readFile, writeFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF = "TARIF_GENERAL_COMPLET_OFFICEPRO_SEATING_2026.pdf";
const SORTIE = "prisma/officepro-tarif.json";
const DETAIL = process.argv.includes("--detail") ? process.argv[process.argv.indexOf("--detail") + 1] : null;

// Abscisses relevées sur les fragments de texte du PDF.
const COLONNE = (x) =>
  x < 20 ? "pageCatalogue" : x < 75 ? "gamme" : x < 285 ? "designation" : x < 300 ? "badge"
  : x < 365 ? "coloris" : x < 415 ? "reference" : x < 475 ? "prix" : x < 505 ? "eco" : "code";

// Lignes d'en-tête, répétées sur chaque page : jamais des données.
// « PRIX PUBLIC HT » et non « PRIX » : le tarif porte des mentions comme
// « prix inclus avec le canapé », qui sont de vraies cellules de données.
const ENTETE = /^(PAGE$|NOM DU PRODUIT|DÉSIGNATION|DESIGNATION|COLORIS DOMINANT|RÉFERENCE|REFERENCE$|PRIX PUBLIC|UNITAIRE$|ECOTAXE|VALDELIA|CODE-BARRE|New$|2026$|TARIF GÉNÉRAL|TOUS NOS PRIX|Les mentions|HORS ECOTAXE)/i;
const SECTION = /^(ESPACE|FAUTEUILS|SIEGES|SIÈGES|TABLES|MOBILIER)\b/i;

const euro = (s) => {
  const m = /^([\d\s ]+),(\d{2})/.exec(String(s).replace(/€/g, "").trim());
  return m ? Number(m[1].replace(/[\s ]/g, "") + "." + m[2]) : null;
};

async function main() {
  const data = new Uint8Array(await readFile(PDF));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const lignes = [];
  // Ces trois-là traversent les sauts de page : une gamme qui déborde sur la
  // page suivante n'y répète pas son nom.
  let gammeCourante = null, designationCourante = null, sectionCourante = null;

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const cel = (await page.getTextContent()).items
      .map((it) => {
        const s = (it.str || "").trim();
        const x = Math.round(it.transform[4]);
        return { s, x, y: Math.round(it.transform[5]), col: COLONNE(x) };
      })
      .filter((c) => c.s && !ENTETE.test(c.s));

    // Le code-barre est la seule colonne sans trou : c'est lui qui définit
    // les lignes du tableau.
    const ancres = cel.filter((c) => c.col === "code" && /^\d{13}$/.test(c.s)).sort((a, b) => b.y - a.y);
    if (!ancres.length) continue;

    // Étiquettes de la page, du haut vers le bas.
    const desc = (col, garde = () => true) =>
      cel.filter((c) => c.col === col && garde(c)).sort((a, b) => b.y - a.y);

    const refs = ancres.map((a) =>
      cel.filter((c) => c.col === "reference" && Math.abs(c.y - a.y) <= 4 && /^[A-Z0-9][A-Z0-9-]{3,}$/.test(c.s))
        .sort((x, y) => x.x - y.x)[0]?.s || null);

    // Racine de la référence : BUF01NR → BUF01. OfficePro compose ses
    // références en <produit><NN><coloris>, si bien que deux lignes de racines
    // différentes sont deux produits.
    const racine = (r) => (/^([A-Z]+[0-9]{1,3})/.exec(r || "") || [])[1] || null;
    const racineProche = (y) => {
      let best = null, d = Infinity;
      ancres.forEach((a, i) => { const e = Math.abs(a.y - y); if (e < d) { d = e; best = racine(refs[i]); } });
      return best;
    };

    // Continuation d'un libellé sur deux lignes : 7 px. Mais deux produits
    // d'une ligne chacun peuvent l'être tout autant — « FAUTEUIL BUFFALO » et
    // « FAUTEUIL BRISTOL » se retrouvaient collés en un seul nom. L'écart ne
    // suffit donc pas : on ne recolle que si les deux fragments regardent la
    // même racine de référence, donc le même produit.
    const recoller = (liste) => {
      const out = [];
      for (const c of liste) {
        const p = out.at(-1);
        const memeProduit = p && racineProche(p.y) && racineProche(p.y) === racineProche(c.y);
        if (p && p.y - c.y <= 7 && memeProduit) { p.s = `${p.s} ${c.s}`; p.y = (p.y + c.y) / 2; }
        else out.push({ ...c });
      }
      return out;
    };

    // Aucun filtre sur le contenu : une mention comme « prix inclus avec le
    // canapé » est une vraie cellule, qui doit faire frontière.
    const gammes = recoller(desc("gamme", (c) => !/^\d+$/.test(c.s) && c.s.length > 1));
    const designations = recoller(desc("designation", (c) => !SECTION.test(c.s)));
    const prixs = recoller(desc("prix"));
    const ecos = recoller(desc("eco"));
    const pagesCat = recoller(desc("pageCatalogue", (c) => /^\d{1,3}$/.test(c.s)));
    const sections = cel.filter((c) => SECTION.test(c.s)).sort((a, b) => b.y - a.y);

    // Les étiquettes d'une colonne découpent les lignes en segments contigus,
    // chacune centrée sur le sien. « Au plus proche » ne suffit pas : la
    // frontière ne tombe à mi-chemin que si les deux segments ont la même
    // hauteur, alors que « KURLY » couvre douze lignes et « KANAP COUSSIN
    // RECTANGLE » quatre. On cherche donc le découpage qui place au mieux
    // chaque étiquette au centre de son segment.
    const attribuer = (liste) => {
      const N = ancres.length, K = liste.length;
      if (!K) return new Array(N).fill(null);
      if (K >= N) return ancres.map((a) => {
        let best = null, d = Infinity;
        for (const c of liste) { const e = Math.abs(c.y - a.y); if (e < d) { d = e; best = c; } }
        return best?.s ?? null;
      });

      const centre = (i, j) => (ancres[i].y + ancres[j].y) / 2;
      // f[k][i] : coût minimal pour placer les étiquettes k..K-1 sur les
      // lignes i..N-1, chaque étiquette prenant au moins une ligne.
      const INF = Infinity;
      const f = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(INF));
      const choix = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(-1));
      f[K][N] = 0;
      for (let k = K - 1; k >= 0; k--) {
        const restant = K - 1 - k;
        for (let i = 0; i <= N - 1 - restant; i++) {
          for (let j = i; j <= N - 1 - restant; j++) {
            const suite = f[k + 1][j + 1];
            if (suite === INF) continue;
            // Une cellule fusionnée est forcément dans son propre segment :
            // sans cette contrainte, le découpage glisse d'une ligne et l'éco
            // d'un coloris passait à son voisin.
            const dehors = liste[k].y > ancres[i].y + 4 || liste[k].y < ancres[j].y - 4;
            const c = Math.abs(liste[k].y - centre(i, j)) + (dehors ? 1000 : 0) + suite;
            if (c < f[k][i]) { f[k][i] = c; choix[k][i] = j; }
          }
        }
      }

      const v = new Array(N).fill(null);
      let i = 0;
      for (let k = 0; k < K && i < N; k++) {
        const j = choix[k][i];
        if (j < 0) break;
        for (let r = i; r <= j; r++) v[r] = liste[k].s;
        i = j + 1;
      }
      // Sécurité : si le découpage a échoué, on retombe sur le plus proche.
      for (let r = 0; r < N; r++) if (v[r] == null) {
        let best = null, d = Infinity;
        for (const c of liste) { const e = Math.abs(c.y - ancres[r].y); if (e < d) { d = e; best = c; } }
        v[r] = best?.s ?? null;
      }
      return v;
    };

    const vGamme = attribuer(gammes);
    const vDesignation = attribuer(designations);
    const vPrix = attribuer(prixs);
    const vEco = attribuer(ecos);
    const vPageCat = attribuer(pagesCat);

    // La section, elle, n'est pas une cellule fusionnée : c'est un titre qui
    // vaut jusqu'au suivant.
    const auDessus = (liste, y) => {
      let v = null;
      for (const c of liste) { if (c.y >= y - 6) v = c; else break; }
      return v?.s ?? null;
    };

    ancres.forEach((a, i) => {
      const g = vGamme[i];
      const d = vDesignation[i];
      const s = auDessus(sections, a.y);
      if (g) gammeCourante = g;
      if (d) designationCourante = d;
      if (s) sectionCourante = s;

      // Le coloris est propre à la ligne, jamais fusionné.
      const coloris = cel.filter((c) => c.col === "coloris" && Math.abs(c.y - a.y) <= 4)
        .sort((x, y) => x.x - y.x).map((c) => c.s).join(" ") || null;

      const montant = euro(vPrix[i]);
      lignes.push({
        page: n,
        pageCatalogue: Number(vPageCat[i]) || null,
        section: sectionCourante,
        gamme: gammeCourante,
        designation: designationCourante,
        coloris,
        reference: refs[i],
        prixPublicHT: montant,
        prixMention: montant == null ? vPrix[i] : null,
        ecoValdelia: euro(vEco[i]),
        codeBarre: a.s,
      });
    });
  }

  // ── Contrôles ──
  console.log(`${lignes.length} lignes extraites\n`);
  console.log("complétude :");
  for (const k of ["section", "gamme", "designation", "coloris", "reference", "prixPublicHT", "ecoValdelia", "pageCatalogue"]) {
    const n = lignes.filter((l) => l[k] != null && l[k] !== "").length;
    const manque = lignes.length - n;
    console.log(`   ${k.padEnd(15)} ${String(n).padStart(3)}/${lignes.length}${manque ? `   ${manque} manquants` : ""}`);
  }

  const refs = lignes.map((l) => l.reference).filter(Boolean);
  const doublons = refs.filter((r, i) => refs.indexOf(r) !== i);
  const codes = lignes.map((l) => l.codeBarre);
  console.log(`\nréférences distinctes : ${new Set(refs).size}${doublons.length ? ` · ${doublons.length} doublons : ${[...new Set(doublons)].slice(0, 6).join(", ")}` : " · aucun doublon"}`);
  console.log(`codes-barres distincts : ${new Set(codes).size}`);

  const prix = lignes.map((l) => l.prixPublicHT).filter((p) => p != null);
  console.log(`\nprix : ${prix.length} valeurs · min ${Math.min(...prix)} € · max ${Math.max(...prix)} €`);
  const eco = lignes.map((l) => l.ecoValdelia).filter((p) => p != null);
  console.log(`éco  : ${eco.length} valeurs · min ${Math.min(...eco)} € · max ${Math.max(...eco)} €`);
  const suspects = lignes.filter((l) => l.ecoValdelia != null && l.prixPublicHT != null && l.ecoValdelia > l.prixPublicHT);
  if (suspects.length) console.log(`⚠ ${suspects.length} lignes où l'éco dépasse le prix — cellules mal rattachées`);

  // Produits : un produit = un couple gamme + désignation.
  const groupes = new Map();
  for (const l of lignes) {
    const cle = `${l.gamme || "?"} ‖ ${l.designation || "?"}`;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(l);
  }
  const tailles = [...groupes.values()].map((g) => g.length).sort((a, b) => a - b);
  console.log(`\n${groupes.size} produits (gamme + désignation) · coloris par produit : min ${tailles[0]} · médiane ${tailles[Math.floor(tailles.length / 2)]} · max ${tailles.at(-1)}`);

  // Un produit dont les lignes n'ont pas toutes le même prix trahit une
  // cellule fusionnée mal propagée.
  const incoherents = [...groupes.entries()].filter(([, g]) => new Set(g.map((l) => l.prixPublicHT)).size > 1);
  console.log(`${incoherents.length} produits à plusieurs prix — normal si les coloris ne valent pas le même tarif`);

  // Contrôle de cohérence : au sein d'un même produit, l'écotaxe ne dépend pas
  // du coloris. Une valeur qui varie trahit une frontière de cellule fusionnée
  // décalée d'une ligne, défaut résiduel sur les groupes de deux coloris.
  const ecoVariable = [...groupes.entries()].filter(([, g]) => new Set(g.map((l) => l.ecoValdelia)).size > 1);
  console.log(`${ecoVariable.length} produits dont l'écotaxe varie selon le coloris — à vérifier, l'écotaxe suit le produit`);
  for (const [cle, g] of ecoVariable.slice(0, 8)) {
    console.log(`   ${cle.slice(0, 62)} → ${[...new Set(g.map((l) => l.ecoValdelia))].join(" / ")} €`);
  }

  console.log("\npar section :");
  const parSection = new Map();
  for (const l of lignes) parSection.set(l.section, (parSection.get(l.section) || 0) + 1);
  for (const [s, n] of parSection) console.log(`   ${String(s).padEnd(38)} ${String(n).padStart(3)} réf.`);

  if (DETAIL) {
    const sel = lignes.filter((l) => (l.gamme || "").toUpperCase().includes(DETAIL.toUpperCase()));
    console.log(`\n── détail « ${DETAIL} » : ${sel.length} lignes`);
    for (const l of sel) {
      console.log(`   p${String(l.pageCatalogue ?? "").padStart(3)} ${String(l.gamme).padEnd(16)} ${String(l.designation).slice(0, 34).padEnd(36)} ${String(l.coloris).padEnd(14)} ${String(l.reference).padEnd(13)} ${String(l.prixPublicHT).padStart(7)} € +${l.ecoValdelia} €`);
    }
  }

  await writeFile(SORTIE, JSON.stringify(lignes, null, 2), "utf8");
  console.log(`\nÉcrit dans ${SORTIE} — aucune écriture en base.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
