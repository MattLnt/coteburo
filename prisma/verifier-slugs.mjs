// Cherche les fiches qui partagent une adresse.
//
//   node prisma/verifier-slugs.mjs
//
// NE LIT QUE.
//
// POURQUOI
//   Une fiche est atteinte par son slug. Si deux fiches portent le même, une
//   seule répond : l'autre existe en base, s'affiche dans les listes, et
//   mène vers sa voisine quand on clique. C'est un défaut qu'on ne voit pas
//   en regardant le catalogue, seulement en cliquant.
//
//   Trois fiches ALTO partagent « tablette-d-extension-alto » et portent des
//   références différentes — DY21, DY23, ED96 — donc des produits différents
//   à des prix différents. Le nom, lui, est identique : l'import n'a pas su
//   ce qui les distinguait, et leur a donné le même.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  const vs = await prisma.produitVitrine.findMany({
    where: { publie: true },
    orderBy: { nom: "asc" },
    select: {
      id: true, nom: true, slug: true,
      gamme: { select: { nom: true, marque: { select: { nom: true } } } },
      _count: { select: { visuels: true, combinaisons: true } },
      combinaisons: { select: { referenceBase: true, prixTarifHT: true } },
    },
  });

  const parSlug = new Map();
  for (const v of vs) {
    if (!parSlug.has(v.slug)) parSlug.set(v.slug, []);
    parSlug.get(v.slug).push(v);
  }
  const partages = [...parSlug].filter(([, l]) => l.length > 1);

  titre("FICHES QUI PARTAGENT UNE ADRESSE");
  if (!partages.length) {
    console.log("\n   Aucune. Chaque fiche publiée a son adresse.");
  } else {
    const perdues = partages.reduce((n, [, l]) => n + l.length - 1, 0);
    console.log(`\n   ${partages.length} adresses pour ${partages.reduce((n, [, l]) => n + l.length, 0)} fiches`);
    console.log(`   ${perdues} fiches sont inatteignables : leur adresse mène à une voisine\n`);
    for (const [s, liste] of partages) {
      console.log(`   /${s}`);
      for (const v of liste) {
        const refs = [...new Set(liste.length ? v.combinaisons.map((c) => c.referenceBase) : [])].slice(0, 3).join(" ");
        const prix = v.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
        const p = prix.length ? (Math.min(...prix) === Math.max(...prix) ? `${Math.min(...prix)} €` : `${Math.min(...prix)}-${Math.max(...prix)} €`) : "—";
        console.log(`      ${v.gamme.marque.nom}/${v.gamme.nom} · ${v._count.visuels} img · ${v._count.combinaisons} var · ${p.padStart(11)} · ${refs}`);
      }
      console.log("");
    }
  }

  // Même nom, adresses différentes : moins grave, mais trompeur en liste.
  const parNom = new Map();
  for (const v of vs) {
    if (!parNom.has(v.nom)) parNom.set(v.nom, []);
    parNom.get(v.nom).push(v);
  }
  const homonymes = [...parNom].filter(([, l]) => l.length > 1);

  titre("FICHES QUI PORTENT LE MÊME NOM");
  if (!homonymes.length) {
    console.log("\n   Aucune.");
  } else {
    console.log(`\n   ${homonymes.length} noms portés par plusieurs fiches.`);
    console.log("   En liste, le client voit deux fois la même ligne à deux prix.\n");
    for (const [n, liste] of homonymes) {
      console.log(`   ${n}`);
      for (const v of liste) {
        const refs = [...new Set(v.combinaisons.map((c) => c.referenceBase))].slice(0, 3).join(" ");
        const prix = v.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
        const p = prix.length ? (Math.min(...prix) === Math.max(...prix) ? `${Math.min(...prix)} €` : `${Math.min(...prix)}-${Math.max(...prix)} €`) : "—";
        console.log(`      ${p.padStart(12)} · ${refs}`);
      }
      console.log("");
    }
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
