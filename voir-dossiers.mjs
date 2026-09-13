import { readdir } from "node:fs/promises";
import { join } from "node:path";

// Le rapprochement entre gammes et dossiers échoue sur neuf gammes.
// Avant de corriger à l'aveugle, on regarde ce que contient réellement
// le disque : noms exacts, et présence d'un sous-dossier _captures.
const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Buronomic";

const entrees = await readdir(RACINE, { withFileTypes: true });
const dossiers = entrees.filter((e) => e.isDirectory()).map((e) => e.name);

console.log(`${dossiers.length} dossier(s) dans ${RACINE}\n`);

for (const d of dossiers.sort()) {
  let captures = 0;
  try {
    const dedans = await readdir(join(RACINE, d, "_captures"));
    captures = dedans.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).length;
  } catch {
    captures = -1; // pas de sous-dossier _captures
  }

  const etat = captures < 0 ? "pas de _captures" : `${captures} image(s)`;
  console.log(`  ${d.padEnd(24)} ${etat}`);
}