export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://coteburo.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/compte", "/connexion", "/inscription", "/commande", "/recherche"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}