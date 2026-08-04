import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "Retro";

// ─── Coloris pied/plateau (sans impact prix) : les 13 combinaisons réelles ───
// Assortis + un côté Blanc. couleur = teinte du pied (l'image de swatch est uploadée à la main).
const COLORIS = [
  { nom: "Hêtre / Hêtre",         couleur: "#d8b384", ordre: 0 },
  { nom: "Nebraska / Nebraska",   couleur: "#b89b73", ordre: 1 },
  { nom: "Timber / Timber",       couleur: "#8a6a4a", ordre: 2 },
  { nom: "Chêne fil / Chêne fil", couleur: "#c9a876", ordre: 3 },
  { nom: "Blanc / Blanc",         couleur: "#f2f0ec", ordre: 4 },
  { nom: "Hêtre / Blanc",         couleur: "#d8b384", ordre: 5 },
  { nom: "Nebraska / Blanc",      couleur: "#b89b73", ordre: 6 },
  { nom: "Timber / Blanc",        couleur: "#8a6a4a", ordre: 7 },
  { nom: "Chêne fil / Blanc",     couleur: "#c9a876", ordre: 8 },
  { nom: "Blanc / Hêtre",         couleur: "#f2f0ec", ordre: 9 },
  { nom: "Blanc / Nebraska",      couleur: "#f2f0ec", ordre: 10 },
  { nom: "Blanc / Timber",        couleur: "#f2f0ec", ordre: 11 },
  { nom: "Blanc / Chêne fil",     couleur: "#f2f0ec", ordre: 12 },
];

async function findVitrine(gamme, produits, nom) {
  const v = produits.find((p) => norm(p.nom) === norm(nom));
  if (!v) {
    console.error(`⚠ Produit "${nom}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => ` - ${p.nom}`).join("\n")}`);
  }
  return v;
}

async function ecrire(vitrine, axes, declinaisons) {
  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: axes, declinaisons },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  await prisma.groupeFinition.create({
    data: { nom: "Coloris", vitrineId: vitrine.id, ordre: 0, finitions: { create: COLORIS } },
  });
  console.log(`  ✓ ${vitrine.nom} — ${declinaisons.length} combinaison(s) + 13 coloris`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`);
    console.error(gammes.map((g) => ` - ${g.nom}`).join("\n"));
    process.exit(1);
  }
  const produits = await prisma.produitVitrine.findMany({
    where: { gammeId: gamme.id },
    select: { id: true, nom: true },
  });

  // ─── Produit 1 : Bureau plan droit (axe Longueur) ───
  const planDroit = await findVitrine(gamme, produits, "Bureau plan droit");
  if (planDroit) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["80 cm", "120 cm", "140 cm", "160 cm", "180 cm"] };
    const rows = [
      ["80 cm",  "295", "BT80"],
      ["120 cm", "325", "BT81"],
      ["140 cm", "335", "BT82"],
      ["160 cm", "345", "BT83"],
      ["180 cm", "355", "BT84"],
    ];
    const declinaisons = rows.map(([longueur, prix, ref]) => ({
      id: uid(), valeurs: { longueur }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await ecrire(planDroit, [axeLongueur], declinaisons);
  }

  // ─── Produit 2 : Bureau plan compact (axes Longueur × Retour) ───
  const planCompact = await findVitrine(gamme, produits, "Bureau plan compact");
  if (planCompact) {
    const axeLongueur = { id: "longueur", nom: "Longueur", valeurs: ["160 cm", "180 cm"] };
    const axeRetour   = { id: "retour",   nom: "Retour",   valeurs: ["Droit", "Gauche"] };
    const rows = [
      ["160 cm", "Droit",  "455", "BT87"],
      ["160 cm", "Gauche", "455", "BT88"],
      ["180 cm", "Droit",  "475", "BT89"],
      ["180 cm", "Gauche", "475", "BT90"],
    ];
    const declinaisons = rows.map(([longueur, retour, prix, ref]) => ({
      id: uid(), valeurs: { longueur, retour }, prixTarifHT: prix, prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref,
    }));
    await ecrire(planCompact, [axeLongueur, axeRetour], declinaisons);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
