import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Solution Pliante";

const PLATEAU = [
  { nom: "Blanc",     couleur: "#f2f0ec", ordre: 0 },
  { nom: "Chêne fil", couleur: "#c9a876", ordre: 1 },
  { nom: "Hêtre",     couleur: "#d8b384", ordre: 2 },
  { nom: "Nebraska",  couleur: "#b89b73", ordre: 3 },
  { nom: "Timber",    couleur: "#8a6a4a", ordre: 4 },
];
const NOIR = [{ nom: "Noir métal", couleur: "#23262a", ordre: 0 }];

function findVitrine(gamme, produits, nom) {
  const v = produits.find((p) => norm(p.nom) === norm(nom));
  if (!v) {
    console.error(`⚠ Produit "${nom}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
  }
  return v;
}
const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });
async function ecrire(v, axes, decl, groupes) {
  await prisma.produitVitrine.update({ where: { id: v.id }, data: { axesDeclinaisons: axes, declinaisons: decl } });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  let ordre = 0;
  for (const g of groupes) await prisma.groupeFinition.create({ data: { nom: g.nom, vitrineId: v.id, ordre: ordre++, finitions: { create: g.finitions } } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaison(s) + ${groupes.length} groupe(s) de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // Table droite pliante (Dimension × Pied) — le pied Chrome coûte +20€
  {
    const v = P("Table droite pliante");
    if (v) await ecrire(v,
      [{ id: "dimension", nom: "Dimension", valeurs: ["L120 × P70","L140 × P70","L160 × P70"] },
       { id: "pied", nom: "Pied", valeurs: ["Noir métal","Chrome"] }],
      [ mk({dimension:"L120 × P70",pied:"Noir métal"},360,"DZ14"),
        mk({dimension:"L120 × P70",pied:"Chrome"},380,"DZ14"),
        mk({dimension:"L140 × P70",pied:"Noir métal"},370,"DZ15"),
        mk({dimension:"L140 × P70",pied:"Chrome"},390,"DZ15"),
        mk({dimension:"L160 × P70",pied:"Noir métal"},380,"DZ16"),
        mk({dimension:"L160 × P70",pied:"Chrome"},400,"DZ16") ],
      [{ nom: "Plateau", finitions: PLATEAU }]);
  }

  // Chariot de transport (accessoire, noir)
  {
    const v = P("Chariot de transport");
    if (v) await ecrire(v, [], [ mk({}, 490, "AE63") ], [{ nom: "Structure métal", finitions: NOIR }]);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
