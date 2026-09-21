import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMargeGlobale } from "@/lib/catalogue";
import { prixLigne } from "@/lib/prixCatalogue";
import { getGammesPourRecherche } from "./actions";
import ProduitsListe from "./ProduitsListe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produits · Admin" };

const PAR_PAGE = 25;

// Les vues enregistrées : des filtres nommés, pas des réglages cachés. Elles
// remplacent _A-FAIRE.md par quelque chose qui ne se périme pas.
const VUES = {
  "sans-visuel": { nom: "Sans visuel", where: { visuels: { none: {} } } },
  "sans-finition": { nom: "Sans finition", where: { choix: { none: { nature: "finition" } } } },
  "sans-choix": { nom: "Sans choix", where: { choix: { none: {} } } },
  "sans-prix": { nom: "Sans prix", where: { combinaisons: { none: { prixTarifHT: { not: null } } } } },
  "sur-devis": { nom: "Sur devis", where: { OR: [{ venteSurDevis: true }, { gamme: { venteSurDevis: true } }] } },
  brouillon: { nom: "Brouillons", where: { publie: false } },
};

function filtres({ q, marque, gamme, rayon, vue }) {
  const et = [];
  if (q) {
    et.push({
      OR: [
        { nom: { contains: q, mode: "insensitive" } },
        { gamme: { nom: { contains: q, mode: "insensitive" } } },
        { combinaisons: { some: { referenceBase: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (marque) et.push({ gamme: { marque: { slug: marque } } });
  if (gamme) et.push({ gamme: { slug: gamme } });
  if (rayon) et.push({ sousCategories: { some: { slug: rayon } } });
  if (vue && VUES[vue]) et.push(VUES[vue].where);
  return et.length ? { AND: et } : {};
}

/**
 * Les six comptes des vues, en UN aller-retour.
 *
 * Ils en coûtaient six, soit une seconde six à eux seuls : la base est
 * distante et chaque échange se paie cent soixante-quatorze millisecondes
 * avant même de compter quoi que ce soit. Un FILTER par vue les rassemble.
 */
async function comptesDesVues() {
  const [r] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Visuel" v WHERE v."vitrineId" = p.id)) AS "sans-visuel",
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Choix" c WHERE c."vitrineId" = p.id AND c.nature = 'finition')) AS "sans-finition",
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Choix" c WHERE c."vitrineId" = p.id)) AS "sans-choix",
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Combinaison" k WHERE k."vitrineId" = p.id AND k."prixTarifHT" IS NOT NULL)) AS "sans-prix",
      COUNT(*) FILTER (WHERE p."venteSurDevis" OR g."venteSurDevis") AS "sur-devis",
      COUNT(*) FILTER (WHERE NOT p.publie) AS "brouillon",
      COUNT(*) AS "total"
    FROM "ProduitVitrine" p
    JOIN "Gamme" g ON g.id = p."gammeId"`;
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)]));
}

/**
 * Ce qu'il faut savoir des vingt-cinq produits affichés, en UN aller-retour :
 * compteurs de choix et de visuels, vignette, rayon, étendue des prix.
 *
 * C'était la requête la plus coûteuse de la page — trois secondes trois —
 * parce que Prisma va chercher chaque relation séparément et rapportait au
 * passage toutes les combinaisons pour n'en tirer qu'un minimum et un maximum.
 */
async function agregats(ids) {
  if (!ids.length) return new Map();
  const lignes = await prisma.$queryRaw`
    SELECT
      p.id,
      (SELECT COUNT(*) FROM "Choix" c WHERE c."vitrineId" = p.id AND c.nature = 'tarifaire') AS tarifaires,
      (SELECT COUNT(*) FROM "Choix" c WHERE c."vitrineId" = p.id AND c.nature = 'finition') AS finitions,
      (SELECT COUNT(*) FROM "Visuel" v WHERE v."vitrineId" = p.id) AS visuels,
      (SELECT v.url FROM "Visuel" v WHERE v."vitrineId" = p.id
         ORDER BY (v.role <> 'vignette'), v.ordre LIMIT 1) AS vignette,
      (SELECT COUNT(*) FROM "Combinaison" k WHERE k."vitrineId" = p.id) AS combinaisons,
      (SELECT MIN(k."prixTarifHT") FROM "Combinaison" k WHERE k."vitrineId" = p.id) AS "tarifMin",
      (SELECT MAX(k."prixTarifHT") FROM "Combinaison" k WHERE k."vitrineId" = p.id) AS "tarifMax",
      (SELECT sc.nom FROM "SousCategorie" sc
         JOIN "_VitrineSousCategories" j ON j."B" = sc.id AND j."A" = p.id LIMIT 1) AS rayon
    FROM "ProduitVitrine" p
    WHERE p.id IN (${Prisma.join(ids)})`;
  return new Map(lignes.map((l) => [l.id, l]));
}

export default async function ProduitsPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp?.q || "").trim();
  const marque = sp?.marque || "";
  const gamme = sp?.gamme || "";
  const rayon = sp?.rayon || "";
  const vue = sp?.vue || "";
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);

  const where = filtres({ q, marque, gamme, rayon, vue });

  // La liste ne charge plus les déclinaisons : elle en chargeait huit méga-
  // octets pour afficher cinq mille lignes. Une ligne par produit, vingt-cinq
  // par page, et les agrégats calculés en base plutôt que rapportés en vrac.
  const [total, produits, marges, marquesL, gammesL, rayonsL, comptes] = await Promise.all([
    prisma.produitVitrine.count({ where }),
    prisma.produitVitrine.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      select: {
        id: true, nom: true, publie: true, venteSurDevis: true, accessoireSeul: true,
        gamme: { select: { nom: true, venteSurDevis: true, marque: { select: { nom: true } } } },
      },
    }),
    getMargeGlobale(),
    prisma.marque.findMany({ orderBy: { nom: "asc" }, select: { nom: true, slug: true } }),
    getGammesPourRecherche(),
    prisma.sousCategorie.findMany({
      orderBy: [{ categorie: { ordre: "asc" } }, { ordre: "asc" }],
      select: { nom: true, slug: true, categorie: { select: { nom: true } } },
    }),
    comptesDesVues(),
  ]);

  const parId = await agregats(produits.map((p) => p.id));

  const lignes = produits.map((p) => {
    const a = parId.get(p.id) || {};
    const surDevis = p.gamme?.venteSurDevis || p.venteSurDevis;
    const bornes = [a.tarifMin, a.tarifMax]
      .filter((t) => t != null)
      .map((t) => prixLigne({ prixTarifHT: Number(t) }, marges))
      .filter((x) => x != null);
    const nbTarifaires = Number(a.tarifaires || 0);
    const nbFinitions = Number(a.finitions || 0);
    return {
      id: p.id,
      nom: p.nom,
      gamme: p.gamme?.nom || null,
      marque: p.gamme?.marque?.nom || null,
      rayon: a.rayon || null,
      publie: p.publie,
      surDevis,
      accessoireSeul: p.accessoireSeul,
      vignette: a.vignette || null,
      nbTarifaires,
      nbFinitions,
      nbCombinaisons: Number(a.combinaisons || 0),
      prixMin: bornes.length ? Math.min(...bornes) : null,
      prixMax: bornes.length ? Math.max(...bornes) : null,
      // Les cinq pastilles : voir ce qui manque au lieu de le chercher.
      sante: [
        Number(a.visuels || 0) > 0,
        a.tarifMin != null,
        nbTarifaires + nbFinitions > 0,
        nbFinitions > 0,
        !!a.rayon,
      ],
    };
  });

  return (
    <ProduitsListe
      lignes={lignes}
      total={total}
      page={page}
      parPage={PAR_PAGE}
      filtres={{ q, marque, gamme, rayon, vue }}
      marques={marquesL}
      gammes={gammesL}
      rayons={JSON.parse(JSON.stringify(rayonsL))}
      vues={Object.entries(VUES).map(([cle, v]) => ({ cle, nom: v.nom, compte: comptes[cle] ?? 0 }))}
      totalCatalogue={comptes.total ?? 0}
    />
  );
}
