import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Prestige";

const METAL_NOIR = [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }];
const PLATEAU = [
  { nom: "Blanc",     couleur: "#f2f0ec", ordre: 0 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 1 },
  { nom: "Nebraska",  couleur: "#b89b73", ordre: 2 },
  { nom: "Timber",    couleur: "#8a6a4a", ordre: 3 },
  { nom: "Yukon",     couleur: "#6e5b4a", ordre: 4 },
];

function findVitrine(gamme, produits, nom) {
  const v = produits.find((p) => norm(p.nom) === norm(nom));
  if (!v) {
    console.error(`⚠ Produit "${nom}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
  }
  return v;
}
const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });
async function ecrire(v, prix, ref) {
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { axesDeclinaisons: [], declinaisons: [ mk({}, prix, ref) ] } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Structure métal", vitrineId: v.id, ordre: 0, finitions: { create: METAL_NOIR } } });
  await prisma.groupeFinition.create({ data: { nom: "Plateau", vitrineId: v.id, ordre: 1, finitions: { create: PLATEAU } } });
  console.log(`  ✓ ${v.nom} — 1 combinaison + 2 groupes de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });

  const table = findVitrine(gamme, produits, "Table de réunion");
  if (table) await ecrire(table, 1830, "DZ05");

  const ext = findVitrine(gamme, produits, "Extension de table");
  if (ext) await ecrire(ext, 1080, "DZ06");

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
