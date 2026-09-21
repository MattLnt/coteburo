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
  // par page, et l'agrégat de prix calculé sur les seules combinaisons de la
  // page.
  const [total, produits, marges, marquesL, gammesL, rayonsL, comptes] = await Promise.all([
    prisma.produitVitrine.count({ where }),
    prisma.produitVitrine.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      select: {
        id: true, nom: true, publie: true, venteSurDevis: true,
        gamme: { select: { nom: true, slug: true, venteSurDevis: true, marque: { select: { nom: true } } } },
        sousCategories: { select: { nom: true }, take: 1 },
        choix: { select: { nature: true } },
        combinaisons: { select: { prixTarifHT: true } },
        visuels: { where: { role: "vignette" }, take: 1, select: { url: true } },
        _count: { select: { visuels: true, combinaisons: true } },
      },
    }),
    getMargeGlobale(),
    prisma.marque.findMany({ orderBy: { nom: "asc" }, select: { nom: true, slug: true } }),
    getGammesPourRecherche(),
    prisma.sousCategorie.findMany({
      orderBy: [{ categorie: { ordre: "asc" } }, { ordre: "asc" }],
      select: { nom: true, slug: true, categorie: { select: { nom: true } } },
    }),
    Promise.all(
      Object.entries(VUES).map(async ([cle, v]) => [cle, await prisma.produitVitrine.count({ where: v.where })]),
    ),
  ]);

  const lignes = produits.map((p) => {
    const prix = p.combinaisons.map((c) => prixLigne(c, marges)).filter((x) => x != null);
    const surDevis = p.gamme?.venteSurDevis || p.venteSurDevis;
    return {
      id: p.id,
      nom: p.nom,
      gamme: p.gamme?.nom || null,
      marque: p.gamme?.marque?.nom || null,
      rayon: p.sousCategories[0]?.nom || null,
      publie: p.publie,
      surDevis,
      vignette: p.visuels[0]?.url || null,
      nbTarifaires: p.choix.filter((c) => c.nature === "tarifaire").length,
      nbFinitions: p.choix.filter((c) => c.nature === "finition").length,
      nbCombinaisons: p._count.combinaisons,
      prixMin: prix.length ? Math.min(...prix) : null,
      prixMax: prix.length ? Math.max(...prix) : null,
      // Les cinq pastilles : voir ce qui manque au lieu de le chercher.
      sante: [
        p._count.visuels > 0,
        p.combinaisons.some((c) => c.prixTarifHT != null),
        p.choix.length > 0,
        p.choix.some((c) => c.nature === "finition"),
        !!p.sousCategories[0],
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
      vues={Object.entries(VUES).map(([cle, v]) => ({
        cle, nom: v.nom, compte: Object.fromEntries(comptes)[cle] ?? 0,
      }))}
      totalCatalogue={await prisma.produitVitrine.count()}
    />
  );
}
