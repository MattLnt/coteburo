import xlsx from "xlsx";

const CHEMIN = "C:\\Users\\akeys\\Documents\\COTEBURO\\buronomic_tarif_catalogue_06_2026_kits__colis__nomenclature_fr_hr270426 (1).xlsx";

const wb = xlsx.readFile(CHEMIN);
console.log("Feuilles :", wb.SheetNames);

const ws = wb.Sheets["Kits 2026"];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

console.log("\nEn-têtes (ligne 0) :");
console.log(rows[0]);

console.log("\nExemple ligne 1 :");
console.log(rows[1]);

console.log("\nNombre total de lignes :", rows.length);