import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Kanpoa";

const COL7 = [
        { nom: "Noir", couleur: "#23262a", ordre: 0 },
        { nom: "Gris", couleur: "#8b8d90", ordre: 1 },
        { nom: "Bleu", couleur: "#3f6fa3", ordre: 2 },
        { nom: "Vert", couleur: "#4a6b4a", ordre: 3 },
        { nom: "Jaune Moutarde", couleur: "#c9a227", ordre: 4 },
        { nom: "Bordeaux", couleur: "#6b2530", ordre: 5 },
        { nom: "Blanc", couleur: "#f2f0ec", ordre: 6 }
];
const COL5 = [
        { nom: "Noir", couleur: "#23262a", ordre: 0 },
        { nom: "Gris", couleur: "#8b8d90", ordre: 1 },
        { nom: "Jaune Moutarde", couleur: "#c9a227", ordre: 2 },
        { nom: "Bordeaux", couleur: "#6b2530", ordre: 3 },
        { nom: "Blanc", couleur: "#f2f0ec", ordre: 4 }
];
const ASSISES = [
    { nom: "Chaise", ref: "KPA04. (lot de 4)", prix: 1174 },
    { nom: "Fauteuil", ref: "KPA14. (lot de 4)", prix: 1463 },
    { nom: "Tabouret", ref: "KPB02. (lot de 2)", prix: 922 },
    { nom: "Fauteuil lounge", ref: "KPX12. (lot de 2)", prix: 1219 }
  ];
const TABLES = {"Table cafétéria": {"formes": [{"forme": "Plateau carré 70 × 70 cm", "ref": "KPFC", "prix": 503}, {"forme": "Plateau rond ø 70 cm", "ref": "KPFR", "prix": 503}]}, "Table mange-debout": {"formes": [{"forme": "Plateau carré 60 × 60 cm", "ref": "KPDC", "prix": 610}, {"forme": "Plateau rond ø 60 cm", "ref": "KPDR", "prix": 610}]}};

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── 4 assises (prix unique, coloris 7 finition, aucun axe) ──
  for (const a of ASSISES) {
    const v = trouver(a.nom);
    if (!v) { manquants.push(a.nom); continue; }
    await prisma.produitVitrine.update({ where: { id: v.id }, data: {
      axesDeclinaisons: [],
      declinaisons: [ mk({}, a.prix, a.ref) ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: COL7 } } });
    console.log(`  ✓ ${gamme.nom} / ${a.nom} — prix unique ${a.prix}€ + 7 coloris`);
  }

  // ── 2 tables (axe Forme carré/rond, coloris 5 finition) ──
  for (const [nomTable, data] of Object.entries(TABLES)) {
    const v = trouver(nomTable);
    if (!v) { manquants.push(nomTable); continue; }
    const decl = data.formes.map((f) => mk({ forme: f.forme }, f.prix, f.ref));
    await prisma.produitVitrine.update({ where: { id: v.id }, data: {
      axesDeclinaisons: [ { id: "forme", nom: "Forme du plateau", valeurs: data.formes.map((f) => f.forme) } ],
      declinaisons: decl,
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: v.id, ordre: 0, finitions: { create: COL5 } } });
    console.log(`  ✓ ${gamme.nom} / ${nomTable} — ${decl.length} formes + 5 coloris`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ Kanpoa traitée (4 assises + 2 tables).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
