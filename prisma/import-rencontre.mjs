import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Rencontre";

const PIED = [
  { nom: "Aluminium",   couleur: "#9a9a94", ordre: 0 },
  { nom: "Blanc métal", couleur: "#f2f0ec", ordre: 1 },
  { nom: "Noir métal",  couleur: "#23262a", ordre: 2 },
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
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons + 2 groupes de finitions`);
}

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // Table polyvalente (6 dimensions)
  {
    const v = P("Table polyvalente");
    if (v) await ecrire(v,
      [{ id: "dimension", nom: "Dimension", valeurs: ["L120 × P60","L140 × P60","L140 × P70","L160 × P70","L160 × P80","L180 × P80"] }],
      [ mk({dimension:"L120 × P60"},190,"EH41"),
        mk({dimension:"L140 × P60"},215,"EH42"),
        mk({dimension:"L140 × P70"},225,"EH43"),
        mk({dimension:"L160 × P70"},245,"EH44"),
        mk({dimension:"L160 × P80"},275,"EH45"),
        mk({dimension:"L180 × P80"},305,"EH46") ]);
  }

  // Table polyvalente demi-lune (3 dimensions)
  {
    const v = P("Table polyvalente demi-lune");
    if (v) await ecrire(v,
      [{ id: "dimension", nom: "Dimension", valeurs: ["L120 × P60","L140 × P70","L160 × P80"] }],
      [ mk({dimension:"L120 × P60"},220,"EH47"),
        mk({dimension:"L140 × P70"},255,"EH48"),
        mk({dimension:"L160 × P80"},310,"EH49") ]);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
