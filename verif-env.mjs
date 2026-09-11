import "dotenv/config";

// Liste les variables liées à Cloudinary, sans révéler les secrets.
const cles = Object.keys(process.env)
  .filter((k) => k.toUpperCase().includes("CLOUDINARY"))
  .sort();

if (cles.length === 0) {
  console.log("Aucune variable Cloudinary trouvée dans le .env");
} else {
  console.log("Variables Cloudinary présentes :\n");
  for (const k of cles) {
    const v = process.env[k] || "";
    // On ne montre que le début, pour identifier sans exposer.
    const apercu = v.length > 12 ? `${v.slice(0, 6)}… (${v.length} car.)` : v;
    console.log(`  ${k} = ${apercu}`);
  }
}