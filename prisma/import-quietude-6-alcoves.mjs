import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "QUIETUDE";

// Coloris corps / façade — 33 paires réelles (corps 7 sans Hêtre ; Argile/Blanc/Noir → 7 façades, autres → Argile/Blanc/Noir)
const PAIRES33 = [
  { nom: "Argile / Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Argile / Blanc", couleur: "#a08d7c", ordre: 1 },
  { nom: "Argile / Chêne fil", couleur: "#a08d7c", ordre: 2 },
  { nom: "Argile / Nebraska", couleur: "#a08d7c", ordre: 3 },
  { nom: "Argile / Noir", couleur: "#a08d7c", ordre: 4 },
  { nom: "Argile / Timber", couleur: "#a08d7c", ordre: 5 },
  { nom: "Argile / Yukon", couleur: "#a08d7c", ordre: 6 },
  { nom: "Blanc / Argile", couleur: "#f2f0ec", ordre: 7 },
  { nom: "Blanc / Blanc", couleur: "#f2f0ec", ordre: 8 },
  { nom: "Blanc / Chêne fil", couleur: "#f2f0ec", ordre: 9 },
  { nom: "Blanc / Nebraska", couleur: "#f2f0ec", ordre: 10 },
  { nom: "Blanc / Noir", couleur: "#f2f0ec", ordre: 11 },
  { nom: "Blanc / Timber", couleur: "#f2f0ec", ordre: 12 },
  { nom: "Blanc / Yukon", couleur: "#f2f0ec", ordre: 13 },
  { nom: "Chêne fil / Argile", couleur: "#c9a876", ordre: 14 },
  { nom: "Chêne fil / Blanc", couleur: "#c9a876", ordre: 15 },
  { nom: "Chêne fil / Noir", couleur: "#c9a876", ordre: 16 },
  { nom: "Nebraska / Argile", couleur: "#b89b73", ordre: 17 },
  { nom: "Nebraska / Blanc", couleur: "#b89b73", ordre: 18 },
  { nom: "Nebraska / Noir", couleur: "#b89b73", ordre: 19 },
  { nom: "Noir / Argile", couleur: "#23262a", ordre: 20 },
  { nom: "Noir / Blanc", couleur: "#23262a", ordre: 21 },
  { nom: "Noir / Chêne fil", couleur: "#23262a", ordre: 22 },
  { nom: "Noir / Nebraska", couleur: "#23262a", ordre: 23 },
  { nom: "Noir / Noir", couleur: "#23262a", ordre: 24 },
  { nom: "Noir / Timber", couleur: "#23262a", ordre: 25 },
  { nom: "Noir / Yukon", couleur: "#23262a", ordre: 26 },
  { nom: "Timber / Argile", couleur: "#8a6a4a", ordre: 27 },
  { nom: "Timber / Blanc", couleur: "#8a6a4a", ordre: 28 },
  { nom: "Timber / Noir", couleur: "#8a6a4a", ordre: 29 },
  { nom: "Yukon / Argile", couleur: "#6e5b4a", ordre: 30 },
  { nom: "Yukon / Blanc", couleur: "#6e5b4a", ordre: 31 },
  { nom: "Yukon / Noir", couleur: "#6e5b4a", ordre: 32 }
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm("Alcôve"));
  if (!v) {
    console.error(`⚠ Produit "Alcôve" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
    process.exit(1);
  }

  const decl = [ mk({ largeur: "80 cm" }, 400, "DZ07"), mk({ largeur: "100 cm" }, 415, "DZ08") ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [{ id: "largeur", nom: "Largeur", valeurs: ["80 cm", "100 cm"] }],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Coloris corps / façade", vitrineId: v.id, ordre: 0, finitions: { create: PAIRES33 } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 1 groupe de finitions (33 paires)`);
  console.log(`\n✓ Alcôves QUIETUDE traitées.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
