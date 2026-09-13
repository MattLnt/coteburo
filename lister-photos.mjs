import { readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

// Inventorie les médias Sokoa, dossier par dossier.
//
// L'objectif est de repérer la convention de nommage : sur Eman, les
// fichiers portaient la référence du siège (Eman_NT87K0), ce qui a
// permis un rattachement automatique aux fiches produits. Si les autres
// gammes suivent la même logique, tout s'enchaîne de la même façon.
const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Sokoa\\fichiers_sokoa";

const IMAGES = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".gif"];

const lignes = [];
const dire = (s = "") => { console.log(s); lignes.push(s); };

async function parcourir(dossier, chemin = "/") {
  let entrees;
  try {
    entrees = await readdir(dossier, { withFileTypes: true });
  } catch (e) {
    dire(`Illisible : ${dossier}`);
    dire(`   ${e.message}`);
    return { nb: 0 };
  }

  const sousDossiers = entrees.filter((e) => e.isDirectory());
  const images = entrees
    .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
  const autres = entrees
    .filter((e) => e.isFile() && !IMAGES.includes(extname(e.name).toLowerCase()))
    .map((e) => e.name);

  if (images.length || autres.length) {
    dire(`\n## ${chemin}`);
    dire(`${images.length} image(s)${autres.length ? ` · ${autres.length} autre(s) fichier(s)` : ""}\n`);
    images.forEach((f) => dire(`   ${f}`));
    autres.forEach((f) => dire(`   [non-image] ${f}`));
  }

  let total = images.length;
  for (const d of sousDossiers) {
    const r = await parcourir(join(dossier, d.name), `${chemin === "/" ? "" : chemin}/${d.name}`);
    total += r.nb;
  }

  return { nb: total };
}

const r = await parcourir(RACINE);
dire(`\n\n═══ ${r.nb} image(s) au total ═══`);

await writeFile("inventaire-photos-sokoa.md", lignes.join("\n"), "utf8");
console.log("\nÉcrit dans inventaire-photos-sokoa.md");