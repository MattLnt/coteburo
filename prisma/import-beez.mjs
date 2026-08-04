import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "BEEZ";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

// 4 produits, tous prix unique (blanc)
const PRODUITS = [
  { nom: "Chaise",           prix: 78,  ref: "BEE01BLA" },
  { nom: "Chaise haute",     prix: 92,  ref: "BEE02BLA" },
  { nom: "Mange-debout rond", prix: 160, ref: "BEE03BLA" },
  { nom: "Table ronde",      prix: 140, ref: "BEE04BLA" },
];

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  for (const prod of PRODUITS) {
    const v = trouver(prod.nom);
    if (!v) { manquants.push(prod.nom); continue; }
    await prisma.produitVitrine.update({ where: { id: v.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, prod.prix, prod.ref) ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
    console.log(`  ✓ ${gamme.nom} / ${prod.nom} — prix unique ${prod.prix}€ (Blanc)`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ BEEZ traitée (Chaise, Chaise haute, Mange-debout rond, Table ronde).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
