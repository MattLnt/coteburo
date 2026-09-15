import { prisma } from "@/lib/prisma";
import { getUrlsCatalogue } from "@/lib/catalogue";
import { siteUrl } from "@/lib/site";

// robots.txt annonçait un plan de site qui n'existait pas : l'adresse
// répondait 404 depuis le début.
//
// Le plan est recalculé à chaque demande plutôt que figé au build. Le
// catalogue bouge depuis l'admin — publier une gamme, dépublier une fiche —
// et un plan figé annoncerait des pages retirées tout en taisant les
// nouvelles. Les moteurs ne viennent le chercher que quelques fois par jour ;
// trois requêtes maigres à cette fréquence ne coûtent rien.
export const dynamic = "force-dynamic";

// Les pages fixes, avec leur importance relative. Tout ce que robots.txt
// interdit en est absent — admin, api, compte, connexion, inscription,
// commande, recherche — ainsi que le panier et les écrans de mot de passe,
// qui n'ont rien à faire dans un index.
const PAGES = [
  { chemin: "/", priority: 1, changeFrequency: "weekly" },
  { chemin: "/catalogue", priority: 0.9, changeFrequency: "daily" },
  { chemin: "/realisations", priority: 0.8, changeFrequency: "weekly" },
  { chemin: "/services", priority: 0.7, changeFrequency: "monthly" },
  { chemin: "/conseils", priority: 0.7, changeFrequency: "weekly" },
  { chemin: "/a-propos", priority: 0.6, changeFrequency: "yearly" },
  { chemin: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { chemin: "/devis", priority: 0.6, changeFrequency: "yearly" },
  { chemin: "/suivi", priority: 0.3, changeFrequency: "yearly" },
  { chemin: "/cgv", priority: 0.2, changeFrequency: "yearly" },
  { chemin: "/mentions-legales", priority: 0.2, changeFrequency: "yearly" },
  { chemin: "/confidentialite", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap() {
  const base = siteUrl();
  const maintenant = new Date();

  // Les trois sources sont indépendantes : autant les interroger de front.
  const [fiches, articles, realisations] = await Promise.all([
    getUrlsCatalogue(),
    prisma.article.findMany({
      where: { publie: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.realisation.findMany({
      where: { publie: true },
      // Pas d'updatedAt sur ce modèle, seulement la date de création.
      select: { slug: true, createdAt: true },
    }),
  ]);

  return [
    ...PAGES.map((p) => ({
      url: `${base}${p.chemin}`,
      lastModified: maintenant,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...fiches.map((f) => ({
      url: `${base}${f.url}`,
      lastModified: f.lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...realisations.map((r) => ({
      url: `${base}/realisations/${r.slug}`,
      lastModified: r.createdAt,
      changeFrequency: "yearly",
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: `${base}/conseils/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    })),
  ];
}
