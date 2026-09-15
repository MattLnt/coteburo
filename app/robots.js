import { siteUrl } from "@/lib/site";

export default function robots() {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/compte", "/connexion", "/inscription", "/commande", "/recherche"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
