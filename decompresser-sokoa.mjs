import { readdir, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// Décompresse les archives Sokoa, une par gamme, dans des sous-dossiers
// portant le nom de la gamme. PowerShell sait le faire nativement, donc
// pas besoin d'installer quoi que ce soit.
const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Sokoa\\fichiers_sokoa";

async function main() {
  const entrees = await readdir(RACINE, { withFileTypes: true });
  const zips = entrees
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".zip")
    .map((e) => e.name)
    .sort();

  console.log(`${zips.length} archive(s) à décompresser.\n`);

  for (const zip of zips) {
    // ADELA_BD.zip → ADELA
    const nom = basename(zip, ".zip").replace(/_BD$/i, "");
    const cible = join(RACINE, nom);

    try {
      await mkdir(cible, { recursive: true });
      await run("powershell.exe", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${join(RACINE, zip)}' -DestinationPath '${cible}' -Force`,
      ]);

      // On compte ce qui est sorti, pour repérer une archive vide.
      const dedans = await readdir(cible, { recursive: true });
      const images = dedans.filter((f) => /\.(jpg|jpeg|png|webp|tif|tiff)$/i.test(f));
      console.log(`✓ ${nom.padEnd(14)} ${images.length} image(s)`);
    } catch (e) {
      console.log(`✗ ${nom.padEnd(14)} ${e.message.split("\n")[0]}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });