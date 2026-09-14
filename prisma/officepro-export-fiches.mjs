// Exporte les fiches OfficePro dans un JSON, pour faire rédiger les descriptions.
//
// La base porte l'identifiant et les déclinaisons, prisma/officepro-fiches.json
// porte le type de produit et la page du catalogue marketing — celle-ci ne
// vient pas du tarif par hasard : c'est la page où le rédacteur retrouvera les
// dimensions et le discours du fabricant.
//
//   node prisma/officepro-export-fiches.mjs
import { readFile, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FICHES = "prisma/officepro-fiches.json";
const SORTIE = "officepro-fiches-a-rediger.json";

const cle = (s) => (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");

async function main() {
  const proposees = JSON.parse(await readFile(FICHES, "utf8"));
  const parNom = new Map(proposees.map((f) => [cle(f.nom), f]));

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "officepro" } } },
    select: {
      id: true, nom: true, slug: true, publie: true, venteSurDevis: true,
      descriptif: true, images: true, declinaisons: true, axesDeclinaisons: true,
      gamme: { select: { nom: true } },
      sousCategories: { select: { slug: true, categorie: { select: { slug: true } } } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  // Seules les fiches issues de l'import : les essais manuels restés en base
  // n'ont pas de type ni de page catalogue, et n'ont rien à faire ici.
  //
  // Deux d'entre eux portent pourtant le même nom qu'une fiche importée —
  // « Banquette - Arco » sous la gamme Arco, « Fauteuil lounge Arco » sous la
  // même. On garde celle dont la gamme correspond à la fiche proposée, et à
  // défaut la mieux fournie en références.
  const candidates = vitrines.filter((v) => parNom.has(cle(v.nom)));
  const parCle = new Map();
  for (const v of candidates) {
    const k = cle(v.nom);
    const attendue = parNom.get(k).gamme;
    const rivale = parCle.get(k);
    if (!rivale) { parCle.set(k, v); continue; }
    const bonneGamme = (x) => x.gamme.nom === attendue;
    const nbRefs = (x) => (Array.isArray(x.declinaisons) ? x.declinaisons.length : 0);
    if ((bonneGamme(v) && !bonneGamme(rivale)) || (bonneGamme(v) === bonneGamme(rivale) && nbRefs(v) > nbRefs(rivale))) {
      parCle.set(k, v);
    }
  }
  const retenues = [...parCle.values()];
  const ecartees = candidates.length - retenues.length;
  if (ecartees) console.log(`${ecartees} doublon(s) écarté(s) : anciens brouillons de même nom.\n`);

  const sortie = retenues.map((v) => {
    const f = parNom.get(cle(v.nom));
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const sc = v.sousCategories[0];
    const prix = decl.map((d) => Number(d.prixVenteHT)).filter((n) => n > 0);

    return {
      id: v.id,
      nom: v.nom,
      gamme: v.gamme.nom,
      type: f.type,
      qualifiant: f.qualifiant,
      pageCatalogue: f.pageCatalogue,
      emplacement: sc ? `${sc.categorie.slug}/${sc.slug}` : null,
      venteSurDevis: v.venteSurDevis,
      prixVenteHTMini: prix.length ? Math.min(...prix) : null,
      nbImages: v.images.length,
      descriptifActuel: v.descriptif || null,
      // Les axes disent ce qui distingue les déclinaisons — piétement,
      // coloris, revêtement : de quoi nourrir la description.
      axes: (Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : []).map((a) => ({ id: a.id, valeurs: a.valeurs })),
      references: decl.map((d) => ({
        reference: d.referenceFournisseur,
        valeurs: d.valeurs,
        prixTarifHT: d.prixTarifHT === "" ? null : Number(d.prixTarifHT),
        prixVenteHT: d.prixVenteHT === "" ? null : Number(d.prixVenteHT),
        ecoContribution: d.ecoContribution ?? 0,
        codeBarre: d.codeBarre || null,
      })),
    };
  });

  await writeFile(SORTIE, JSON.stringify(sortie, null, 2), "utf8");

  const refs = sortie.reduce((s, f) => s + f.references.length, 0);
  const avecPage = sortie.filter((f) => f.pageCatalogue).length;
  const aRediger = sortie.filter((f) => !f.descriptifActuel).length;

  console.log(`${sortie.length} fiches exportées · ${refs} références`);
  console.log(`   ${avecPage} portent une page du catalogue marketing`);
  console.log(`   ${aRediger} sans descriptif, donc à rédiger`);
  console.log(`   ${sortie.filter((f) => f.venteSurDevis).length} sur devis · ${sortie.filter((f) => !f.nbImages).length} sans image`);
  console.log(`\nÉcrit dans ${SORTIE}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
