import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();

// Rapproche le tarif Buronomic des produits importés.
//
// Le fichier se lit sur deux clés selon la nature de la référence :
//
//   Les produits portent un code racine de 4 caractères — AR95, BT80 —
//   décliné en autant de lignes que de finitions, toutes au même prix.
//
//   Les accessoires portent un code article complet, finition comprise :
//   AF051K, EG915G, DQ101K.
//
// On cherche donc d'abord le code article, puis la racine, dans la
// feuille des kits puis dans celle des colis.
//
// L'éco-contribution est stockée avec le prix : la loi impose de la faire
// figurer distinctement sur les factures de mobilier professionnel, et
// aucune marge ne s'y applique.
//
// Le détail part dans un fichier markdown : la liste des références
// dépasse ce qu'un terminal garde en mémoire.

const APPLIQUER = process.argv.includes("--appliquer");
const FICHIER = "C:\\Users\\akeys\\Desktop\\Matt\\coteburo\\buronomic.xlsx";

const arrondi = (n) => Math.round(n * 100) / 100;

// Les en-têtes du tarif contiennent des retours à la ligne invisibles et
// changent de libellé d'une année sur l'autre — « New Prix Public HT
// 06 2026 ». Les repérer par mot-clé évite de recoder le script à chaque
// mise à jour du fichier.
function colonne(ligne, ...motsCles) {
  for (const nom of Object.keys(ligne)) {
    const propre = nom.toLowerCase().replace(/\s+/g, " ");
    if (motsCles.every((m) => propre.includes(m.toLowerCase()))) return nom;
  }
  return null;
}

function chargerTarif() {
  const wb = XLSX.readFile(FICHIER);

  const parRacine = new Map();
  const parArticle = new Map();

  const lire = (feuille, clesRacine, clesArticle, clesPrix, clesEco, clesDesig) => {
    const onglet = wb.Sheets[feuille];
    if (!onglet) { console.log(`⚠ Feuille « ${feuille} » absente.`); return 0; }

    const lignes = XLSX.utils.sheet_to_json(onglet, { defval: null });
    if (!lignes.length) return 0;

    const cRacine = colonne(lignes[0], ...clesRacine);
    const cArticle = colonne(lignes[0], ...clesArticle);
    const cPrix = colonne(lignes[0], ...clesPrix);
    const cEco = colonne(lignes[0], ...clesEco);
    const cDesig = colonne(lignes[0], ...clesDesig);

    if (!cPrix || !cRacine) {
      console.log(`⚠ ${feuille} : colonnes introuvables (prix : ${cPrix}, racine : ${cRacine})`);
      return 0;
    }
    console.log(`   ${feuille} → prix dans « ${cPrix.replace(/\r?\n/g, " ")} »`);

    let n = 0;
    for (const l of lignes) {
      const prix = Number(l[cPrix]);
      if (Number.isNaN(prix) || prix <= 0) continue;

      const eco = Number(l[cEco]) || 0;
      const desig = String(l[cDesig] || "").trim();

      const racine = String(l[cRacine] || "").trim().toUpperCase();
      const article = cArticle ? String(l[cArticle] || "").trim().toUpperCase() : "";

      // Une racine regroupe plusieurs finitions au même prix : on garde
      // le plus bas, qui sert de prix d'appel.
      if (racine) {
        const vu = parRacine.get(racine);
        if (!vu || prix < vu.prix) parRacine.set(racine, { prix, eco, desig });
      }
      if (article) parArticle.set(article, { prix, eco, desig });
      n++;
    }
    return n;
  };

  const a = lire("Kits 2026", ["code", "racine"], ["code", "article"],
                 ["prix", "public"], ["eco-contribution"], ["désignation"]);
  const b = lire("Colis 2026", ["code", "racine"], ["code", "colis"],
                 ["prix", "public"], ["eco-contribution"], ["désignation"]);

  console.log(`   ${a + b} ligne(s) tarifaire(s) lue(s).`);
  return { parRacine, parArticle };
}

// Une référence peut être un code article complet ou une racine.
// On teste les deux, dans cet ordre : le code article est plus précis.
function chercher(ref, { parRacine, parArticle }) {
  if (!ref) return null;
  const R = String(ref).trim().toUpperCase();
  if (!R) return null;

  if (parArticle.has(R)) return parArticle.get(R);
  if (parRacine.has(R)) return parRacine.get(R);

  // Le tarif tronque parfois la racine à 4 caractères là où le catalogue
  // en donne 5 : DZ145 devient DZ14.
  if (R.length === 5 && parRacine.has(R.slice(0, 4))) return parRacine.get(R.slice(0, 4));

  return null;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  const tarif = chargerTarif();
  console.log(`Tarif chargé : ${tarif.parRacine.size} racine(s), ${tarif.parArticle.size} article(s).`);

  const reglages = await prisma.reglages.findUnique({
    where: { id: 1 },
    select: { margeGlobale: true },
  });
  const marge = reglages?.margeGlobale ?? 0.3;
  console.log(`Coefficient appliqué : ${(marge * 100).toFixed(0)} %\n`);

  const marque = await prisma.marque.findFirst({
    where: { slug: "buronomic" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Buronomic introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: marque.id } },
    select: {
      id: true, nom: true, sansDeclinaisons: true,
      referenceUnitaire: true, prixUnitaireTarifHT: true,
      prixUnitaireVerrouille: true, declinaisons: true,
      gamme: { select: { nom: true } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  let complets = 0, partiels = 0, vides = 0;
  const manquantes = new Set();
  const detail = [];

  for (const v of vitrines) {
    const data = {};
    let trouvees = 0, total = 0;

    if (v.sansDeclinaisons) {
      total = 1;
      // Un produit sans déclinaison porte sa référence en propre, ou
      // dans une déclinaison unique héritée de l'import.
      const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
      const ref = v.referenceUnitaire || decl[0]?.referenceFournisseur;
      const t = chercher(ref, tarif);

      if (t) {
        trouvees = 1;
        if (!v.prixUnitaireVerrouille) {
          data.prixUnitaireTarifHT = t.prix;
          data.prixUnitaireHT = arrondi(t.prix * (1 + marge));
        }
      } else if (ref) {
        manquantes.add(String(ref));
      }
    } else {
      const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
      total = decl.length;
      let modifie = false;

      const nouvelles = decl.map((d) => {
        if (d.prixVerrouille) { trouvees++; return d; }

        const t = chercher(d.referenceFournisseur, tarif);
        if (!t) {
          if (d.referenceFournisseur) manquantes.add(String(d.referenceFournisseur));
          return d;
        }

        trouvees++;
        modifie = true;
        return {
          ...d,
          prixTarifHT: String(t.prix),
          prixVenteHT: String(arrondi(t.prix * (1 + marge))),
          // L'éco-contribution ne subit pas la marge : c'est une taxe
          // refacturée à l'identique.
          ecoContribution: t.eco,
        };
      });

      if (modifie) data.declinaisons = nouvelles;
    }

    if (trouvees === 0) {
      vides++;
      detail.push(`✗ **${v.gamme.nom}** — ${v.nom} : 0/${total}`);
      continue;
    }

    if (trouvees === total) {
      complets++;
      detail.push(`✓ **${v.gamme.nom}** — ${v.nom} : ${trouvees}/${total}`);
    } else {
      partiels++;
      detail.push(`~ **${v.gamme.nom}** — ${v.nom} : ${trouvees}/${total}`);
    }

    if (APPLIQUER && Object.keys(data).length) {
      await prisma.produitVitrine.update({ where: { id: v.id }, data });
    }
  }

  console.log(`═══ ${complets} complet(s) · ${partiels} partiel(s) · ${vides} sans tarif ═══`);
  console.log(`${manquantes.size} référence(s) absente(s) du tarif.`);

  const rapport = [
    `# Rapprochement tarifaire Buronomic`,
    ``,
    `${complets} produit(s) complet(s) · ${partiels} partiel(s) · ${vides} sans tarif`,
    `${manquantes.size} référence(s) introuvable(s)`,
    `Coefficient appliqué : ${(marge * 100).toFixed(0)} %`,
    ``,
    `## Références absentes du tarif`,
    ``,
    ...[...manquantes].sort().map((r) => `- ${r}`),
    ``,
    `## Détail par produit`,
    ``,
    ...detail,
  ].join("\n");

  await writeFile("rapport-tarif-buronomic.md", rapport, "utf8");
  console.log(`\nDétail écrit dans rapport-tarif-buronomic.md`);

  if (!APPLIQUER) console.log("\nnode prisma\\prix-buronomic.mjs --appliquer");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());