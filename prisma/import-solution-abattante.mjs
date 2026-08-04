import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Solution Abattante";

const PIED = [
  { nom: "Aluminium",   couleur: "#9a9a94", ordre: 0 },
  { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
];
const PLATEAU = [
  { nom: "Blanc",     couleur: "#f2f0ec", ordre: 0 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 1 },
  { nom: "Hêtre",     couleur: "#d8b384", ordre: 2 },
  { nom: "Nebraska",  couleur: "#b89b73", ordre: 3 },
  { nom: "Timber",    couleur: "#8a6a4a", ordre: 4 },
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
async function ecrire(v, axes, decl) {
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { axesDeclinaisons: axes, declinaisons: decl } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  await prisma.groupeFinition.create({ data: { nom: "Pied", vitrineId: v.id, ordre: 0, finitions: { create: PIED } } });
  await prisma.groupeFinition.create({ data: { nom: "Plateau", vitrineId: v.id, ordre: 1, finitions: { create: PLATEAU } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaison(s) + 2 groupes de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // Table abattante (3 dimensions)
  {
    const v = P("Table abattante");
    if (v) await ecrire(v,
      [{ id: "dimension", nom: "Dimension", valeurs: ["L140 × P70","L160 × P70","L180 × P70"] }],
      [ mk({dimension:"L140 × P70"},495,"DX05"),
        mk({dimension:"L160 × P70"},510,"DX06"),
        mk({dimension:"L180 × P70"},525,"DX07") ]);
  }

  // Demi-lune abattante (L140 × P70)
  {
    const v = P("Demi-lune abattante");
    if (v) await ecrire(v, [], [ mk({}, 495, "DX08") ]);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
