// L'état du catalogue, chiffré. N'ÉCRIT RIEN.
//
//   node prisma/etat-catalogue.mjs
//   node prisma/etat-catalogue.mjs --visuels     le détail gamme par gamme
//   node prisma/etat-catalogue.mjs --finitions   les finitions sans pastille
//
// POURQUOI CE SCRIPT
//   docs/ce-qui-manque.md dit pourquoi les choses manquent et à qui les
//   demander ; il ne peut pas dire combien il en manque aujourd'hui. Un
//   chiffre écrit à la main dans un document se périme le lendemain. Celui-ci
//   se relit.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(68)}\n${t}\n${"═".repeat(68)}`);
const ligne = (nom, n, sur) => console.log(
  `   ${nom.padEnd(34, ".")} ${String(n).padStart(5)}${sur ? ` / ${sur}` : ""}`,
);

const MATIERE = /^(PP|Stratifié|Mélaminé|Bois|Acier|Lin plastique)$/i;
const CONDITIONNEMENT = /^PVP/i;

async function main() {
  const total = await prisma.produitVitrine.count();
  const fiche = (q) => prisma.produitVitrine.count({ where: q });

  titre("LES FICHES");
  ligne("publiées", await fiche({ publie: true }), total);
  ligne("sans aucun visuel", await fiche({ visuels: { none: {} } }), total);
  ligne("sans question", await fiche({ choix: { none: {} } }), total);
  ligne("sans groupe de finition", await fiche({ choix: { none: { nature: "finition" } } }), total);
  ligne("sans aucun prix", await fiche({ combinaisons: { none: { prixTarifHT: { not: null } } } }), total);
  ligne("sans rayon", await fiche({ sousCategories: { none: {} } }), total);
  ligne("sans descriptif", await fiche({ OR: [{ descriptif: null }, { descriptif: "" }] }), total);

  titre("LES VARIANTES");
  const comb = await prisma.combinaison.count();
  ligne("combinaisons", comb);
  ligne("sans tarif fournisseur", await prisma.combinaison.count({ where: { prixTarifHT: null } }), comb);
  ligne("sans référence", await prisma.combinaison.count({ where: { referenceBase: null } }), comb);

  titre("LES FINITIONS");
  const ou = { choix: { nature: "finition" } };
  const fin = await prisma.valeurChoix.count({ where: ou });
  ligne("finitions du catalogue", fin);
  ligne("sans pastille", await prisma.valeurChoix.count({
    where: { ...ou, couleur: null, imageUrl: null, modele: null },
  }), fin);
  ligne("sans jeton de référence", await prisma.valeurChoix.count({
    where: { ...ou, suffixeReference: null },
  }), fin);
  const mod = await prisma.finitionModele.count();
  ligne("teintes en bibliothèque", mod);
  ligne("dont sans pastille", await prisma.finitionModele.count({
    where: { couleur: null, imageUrl: null },
  }), mod);

  // ── Le détail, à la demande ─────────────────────────────────────────
  if (process.argv.includes("--visuels")) {
    titre("LES VISUELS, GAMME PAR GAMME");
    const vs = await prisma.produitVitrine.findMany({
      select: {
        gamme: { select: { nom: true, marque: { select: { nom: true } } } },
        _count: { select: { visuels: true } },
      },
    });
    const g = new Map();
    for (const v of vs) {
      const k = `${v.gamme.marque.nom}␟${v.gamme.nom}`;
      if (!g.has(k)) g.set(k, { total: 0, sans: 0 });
      const e = g.get(k);
      e.total += 1;
      if (!v._count.visuels) e.sans += 1;
    }
    console.log("");
    const parMarque = new Map();
    for (const [k, e] of [...g].filter(([, e]) => e.sans).sort((a, b) => b[1].sans - a[1].sans)) {
      const [m, nom] = k.split("␟");
      parMarque.set(m, (parMarque.get(m) || 0) + e.sans);
      console.log(`   ${String(e.sans).padStart(3)}/${String(e.total).padEnd(3)}  ${m.padEnd(11)} ${nom}`);
    }
    console.log(`\n   par marque : ${[...parMarque].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${n}`).join(" · ")}`);
  }

  if (process.argv.includes("--finitions")) {
    titre("LES FINITIONS SANS PASTILLE");
    const nues = await prisma.valeurChoix.findMany({
      where: { ...ou, couleur: null, imageUrl: null, modele: null },
      select: { libelle: true, choix: { select: { vitrine: { select: { gamme: { select: { marque: { select: { nom: true } } } } } } } } },
    });
    const g = new Map();
    for (const v of nues) {
      const nature = CONDITIONNEMENT.test(v.libelle) ? "conditionnement"
        : MATIERE.test(v.libelle) ? "matière" : "couleur";
      const k = `${nature}␟${v.choix.vitrine.gamme.marque.nom}`;
      if (!g.has(k)) g.set(k, new Map());
      g.get(k).set(v.libelle, (g.get(k).get(v.libelle) || 0) + 1);
    }
    for (const nature of ["couleur", "matière", "conditionnement"]) {
      for (const [k, m] of [...g].filter(([k]) => k.startsWith(nature))) {
        const marque = k.split("␟")[1];
        const n = [...m.values()].reduce((a, b) => a + b, 0);
        console.log(`\n   ${nature.toUpperCase()} · ${marque} — ${n} finition(s)`);
        console.log(`      ${[...m].sort((a, b) => b[1] - a[1]).map(([l, c]) => `${l}${c > 1 ? ` ×${c}` : ""}`).join(" · ")}`);
      }
    }
    console.log("\n   Seule la première catégorie se règle avec un nuancier.");
    console.log("   Voir docs/ce-qui-manque.md.");
  }

  console.log("\nLe pourquoi et à qui demander : docs/ce-qui-manque.md");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
