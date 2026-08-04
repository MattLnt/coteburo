import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "TECSY";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

// Produits à prix unique (sans axe). White a en plus un groupe finition coloris.
const PRODUITS = [
  { nom: "Fauteuil",            prix: 316, ref: "TCY01NR" },
  { nom: "Fauteuil Alto",       prix: 355, ref: "TCY05NR-RH" },
  { nom: "Fauteuil Chic",       prix: 345, ref: "TCY05NR-PU" },
  { nom: "Fauteuil Platinium",  prix: 345, ref: "TCY05GR" },
  { nom: "Fauteuil White",      prix: 329, ref: "TCY02..", coloris: [
      { nom: "Beige", couleur: "#d8c9a8", ordre: 0 },
      { nom: "Gris",  couleur: "#8b8d90", ordre: 1 },
  ] },
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
      axesDeclinaisons: [],
      declinaisons: [ mk({}, prod.prix, prod.ref) ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
    if (prod.coloris) {
      await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: prod.coloris } } });
      console.log(`  ✓ ${gamme.nom} / ${prod.nom} — prix unique ${prod.prix}€ + ${prod.coloris.length} coloris`);
    } else {
      console.log(`  ✓ ${gamme.nom} / ${prod.nom} — prix unique ${prod.prix}€`);
    }
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ TECSY traitée (Fauteuil, Alto, Chic, Platinium, White).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
