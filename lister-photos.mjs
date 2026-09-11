import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

// Parcourt le dossier médias et liste ce qu'il contient, pour décider
// comment rattacher les visuels aux produits. Les sous-dossiers sont
// explorés : ils portent souvent le nom du modèle.
const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Sokoa\\EMAN_BD";

const IMAGES = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".gif"];

async function parcourir(dossier, prefixe = "") {
  let entrees;
  try {
    entrees = await readdir(dossier, { withFileTypes: true });
  } catch (e) {
    console.log(`Dossier illisible : ${dossier}`);
    console.log(e.message);
    return { fichiers: 0, poids: 0 };
  }

  const dossiers = entrees.filter((e) => e.isDirectory());
  const fichiers = entrees.filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()));
  const autres = entrees.filter((e) => e.isFile() && !IMAGES.includes(extname(e.name).toLowerCase()));

  if (fichiers.length || autres.length) {
    console.log(`\n${prefixe || "/"} — ${fichiers.length} image(s)${autres.length ? `, ${autres.length} autre(s) fichier(s)` : ""}`);
  }

  let total = 0, poids = 0;

  for (const f of fichiers) {
    const s = await stat(join(dossier, f.name));
    const mo = (s.size / 1024 / 1024).toFixed(1);
    console.log(`   ${f.name}  ·  ${mo} Mo`);
    total++;
    poids += s.size;
  }

  for (const a of autres) {
    console.log(`   [non-image] ${a.name}`);
  }

  for (const d of dossiers) {
    const r = await parcourir(join(dossier, d.name), `${prefixe}/${d.name}`);
    total += r.fichiers;
    poids += r.poids;
  }

  return { fichiers: total, poids };
}

const r = await parcourir(RACINE);
console.log(`\n═══ ${r.fichiers} image(s) · ${(r.poids / 1024 / 1024).toFixed(0)} Mo au total ═══`);