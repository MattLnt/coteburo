import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "VERANO";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

const P6 = [ // palette principale VERANO
  { nom: "Beige", couleur: "#d8c9a8" }, { nom: "Cactus", couleur: "#6b8f5a" },
  { nom: "Gris", couleur: "#8b8d90" }, { nom: "Miel", couleur: "#c99a3c" },
  { nom: "Paprika", couleur: "#b5482e" }, { nom: "Menthe", couleur: "#9cc7b3" },
].map((c,i)=>({ ...c, ordre:i }));
const POUFCOL = [ { nom:"Ardoise", couleur:"#4a4d52", ordre:0 }, { nom:"Safran", couleur:"#e0a92e", ordre:1 }, { nom:"Paprika", couleur:"#b5482e", ordre:2 }, { nom:"Kaki", couleur:"#6b6a4a", ordre:3 } ];

// Produits prix unique + finition coloris (sauf ceux à axe)
const SIMPLES = [
  { nom: "Chaise lounge", prix: 195, ref: "VER03..", col: P6 },
  { nom: "Chaise",        prix: 155, ref: "VER01..", col: P6 },   // sans accoudoirs, restauration classique
  { nom: "Chaise haute",  prix: 170, ref: "VER07..", col: P6 },
  { nom: "Tabouret",      prix: 160, ref: "VER08..", col: P6 },
  { nom: "Banc",          prix: 345, ref: "VER14../VER15..", col: [P6[0],P6[1],P6[4],P6[5]] }, // Beige/Cactus/Paprika/Menthe
  { nom: "Table basse",   prix: 180, ref: "VER04..", col: P6 },
  { nom: "Table bistro",  prix: 295, ref: "VER02..", col: P6 },
  { nom: "Mange-debout",  prix: 295, ref: "VER06..", col: P6 },
];

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Produits simples (prix unique + coloris) ──
  for (const prod of SIMPLES) {
    const v = trouver(prod.nom);
    if (!v) { manquants.push(prod.nom); continue; }
    await prisma.produitVitrine.update({ where: { id: v.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, prod.prix, prod.ref) ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: prod.col } } });
    console.log(`  ✓ ${gamme.nom} / ${prod.nom} — prix unique ${prod.prix}€ + ${prod.col.length} coloris`);
  }

  // ── Table repas (axe Places : 4 pl 695 / 6 pl 825) ──
  const repas = trouver("Table repas");
  if (!repas) manquants.push("Table repas");
  else {
    await prisma.produitVitrine.update({ where: { id: repas.id }, data: {
      axesDeclinaisons: [ { id: "places", nom: "Places", valeurs: ["4 places","6 places"] } ],
      declinaisons: [ mk({ places: "4 places" }, 695, "VER..4PL"), mk({ places: "6 places" }, 825, "VER..6PL") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: repas.id } });
    console.log(`  ✓ ${gamme.nom} / Table repas — 2 combinaisons (4 pl 695€ / 6 pl 825€)`);
  }

  // ── Table haute (prix unique 645) ──
  const haute = trouver("Table haute");
  if (!haute) manquants.push("Table haute");
  else {
    await prisma.produitVitrine.update({ where: { id: haute.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 645, "VER10../VER13..") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: haute.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: haute.id, ordre: 0, finitions: { create: [P6[0],P6[2]] } } }); // Beige/Gris
    console.log(`  ✓ ${gamme.nom} / Table haute — prix unique 645€ + 2 coloris`);
  }

  // ── Pouf (axe Forme : poire 265 / ronde 250) ──
  const pouf = trouver("Pouf");
  if (!pouf) manquants.push("Pouf");
  else {
    await prisma.produitVitrine.update({ where: { id: pouf.id }, data: {
      axesDeclinaisons: [ { id: "forme", nom: "Forme", valeurs: ["Poire","Ronde"] } ],
      declinaisons: [ mk({ forme: "Poire" }, 265, "VER09.."), mk({ forme: "Ronde" }, 250, "VER11../VER12..") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: pouf.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: pouf.id, ordre: 0, finitions: { create: POUFCOL } } });
    console.log(`  ✓ ${gamme.nom} / Pouf — 2 combinaisons (Poire 265€ / Ronde 250€) + coloris`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ VERANO traitée (11 produits).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
