import XLSX from "xlsx";

// Le rapprochement ne trouve rien alors qu'un test direct sur le fichier
// fonctionnait. On regarde donc ce que la bibliothèque lit vraiment :
// les noms de colonnes, et le contenu d'une ligne.
const FICHIER = "C:\\Users\\pages\\Bureau\\Matt\\projets\\coteburo\\buronomic.xlsx";

const wb = XLSX.readFile(FICHIER);
console.log("FEUILLES :", wb.SheetNames, "\n");

for (const nom of wb.SheetNames) {
  const lignes = XLSX.utils.sheet_to_json(wb.Sheets[nom], { defval: null });
  console.log(`═══ ${nom} — ${lignes.length} ligne(s) ═══`);

  if (!lignes.length) { console.log("  (vide)\n"); continue; }

  console.log("  Colonnes lues :");
  Object.keys(lignes[0]).forEach((c) => {
    // Les retours à la ligne dans un en-tête sont invisibles à l'œil
    // mais font échouer toute comparaison exacte.
    console.log(`     "${c.replace(/\n/g, "\\n")}"`);
  });

  console.log("\n  Première ligne :");
  console.log("  " + JSON.stringify(lignes[0]).slice(0, 400));
  console.log("");
}