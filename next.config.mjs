/** @type {import('next').NextConfig} */
const nextConfig = {
  // Une action serveur refuse par défaut un corps de plus d'un mégaoctet.
  // Un article de conseils — du HTML, des liens, quelques images en base64
  // si l'auteur colle au lieu de téléverser — peut le dépasser, et l'échec
  // ne remontait nulle part. Quatre mégaoctets laissent de la marge sans
  // ouvrir la porte à n'importe quoi.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // Prisma livre un moteur de requête par base supportée et par plateforme.
  // Le traceur de Next, prudent, les embarquait TOUS dans chacune des 72
  // fonctions serverless : environ 68 Mo par fonction, dont 48 de moteurs
  // WebAssembly pour CockroachDB, MySQL, SQL Server et SQLite — que ce projet
  // n'utilise pas — chacun présent en double, .js et .mjs.
  //
  // Le projet tourne sur PostgreSQL, en runtime Node, avec le moteur natif
  // (query_engine-<plateforme>.node). Les variantes WebAssembly ne servent
  // qu'aux runtimes edge, et aucune route ni le middleware n'en utilise.
  outputFileTracingExcludes: {
    "**/*": [
      // Moteurs WebAssembly — inutiles hors runtime edge
      "node_modules/@prisma/client/runtime/query_engine_bg.*.wasm-base64.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.*.wasm-base64.*",
      "node_modules/@prisma/client/runtime/*.wasm",
      // Moteurs natifs des autres plateformes : Vercel construit sous Linux,
      // le binaire Windows ne vient que des builds locaux.
      "node_modules/.prisma/client/*windows*",
      "node_modules/.prisma/client/*darwin*",
      "node_modules/@prisma/engines/**",
    ],
  },
};

export default nextConfig;
