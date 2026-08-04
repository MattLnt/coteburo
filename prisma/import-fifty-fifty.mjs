import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Fifty-Fifty";

// Coloris — 14 combinaisons réelles (mono + bicolore corps/façade)
const COLORIS = [
  { nom: "Blanc", couleur: "#f2f0ec", ordre: 0 },
  { nom: "Blanc / Chêne fil", couleur: "#f2f0ec", ordre: 1 },
  { nom: "Blanc / Nebraska", couleur: "#f2f0ec", ordre: 2 },
  { nom: "Blanc / Timber", couleur: "#f2f0ec", ordre: 3 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 4 },
  { nom: "Chêne fil / Blanc", couleur: "#c9a876", ordre: 5 },
  { nom: "Nebraska", couleur: "#b89b73", ordre: 6 },
  { nom: "Nebraska / Blanc", couleur: "#b89b73", ordre: 7 },
  { nom: "Noir / Blanc", couleur: "#23262a", ordre: 8 },
  { nom: "Noir / Chêne fil", couleur: "#23262a", ordre: 9 },
  { nom: "Noir / Nebraska", couleur: "#23262a", ordre: 10 },
  { nom: "Noir / Timber", couleur: "#23262a", ordre: 11 },
  { nom: "Timber", couleur: "#8a6a4a", ordre: 12 },
  { nom: "Timber / Blanc", couleur: "#8a6a4a", ordre: 13 }
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm("Comptoir d'accueil compact"));
  if (!v) {
    console.error(`⚠ Produit "Comptoir d'accueil compact" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
    process.exit(1);
  }

  const decl = [
    mk({ pmr: "Droit" },  1140, "DU76"),
    mk({ pmr: "Gauche" }, 1140, "DU77"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [{ id: "pmr", nom: "Côté PMR", valeurs: ["Droit", "Gauche"] }],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: COLORIS } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (14 coloris)`);
  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
