import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Kulbu";

const COLORIS_PE = [
    { nom: "Anthracite", couleur: "#4a4d52", ordre: 0 },
    { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
    { nom: "Vert pastel", couleur: "#a8c6a0", ordre: 2 },
    { nom: "Corail", couleur: "#e8746a", ordre: 3 }
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Produit 1 : Pouf ──
  const pouf = trouver("Pouf");
  if (!pouf) manquants.push("Pouf");
  else {
    const decl = [
      mk({base:"Culbuto",garnissage:"Non tapissé",tissu:"Sans tissu"},239,"KUA0"),
      mk({base:"Culbuto",garnissage:"Assise tapissée",tissu:"B"},261,"KUB0"),
      mk({base:"Culbuto",garnissage:"Assise tapissée",tissu:"B+"},269,"KUB0"),
      mk({base:"Culbuto",garnissage:"Assise tapissée",tissu:"C"},273,"KUB0"),
      mk({base:"Culbuto",garnissage:"Assise tapissée",tissu:"D"},279,"KUB0"),
      mk({base:"Culbuto",garnissage:"Assise + corps tapissés",tissu:"B"},290,"KUC0"),
      mk({base:"Culbuto",garnissage:"Assise + corps tapissés",tissu:"B+"},299,"KUC0"),
      mk({base:"Culbuto",garnissage:"Assise + corps tapissés",tissu:"C"},305,"KUC0"),
      mk({base:"Culbuto",garnissage:"Assise + corps tapissés",tissu:"D"},313,"KUC0"),
      mk({base:"Patins",garnissage:"Non tapissé",tissu:"Sans tissu"},243,"KUA0"),
      mk({base:"Patins",garnissage:"Assise tapissée",tissu:"B"},265,"KUB0"),
      mk({base:"Patins",garnissage:"Assise tapissée",tissu:"B+"},273,"KUB0"),
      mk({base:"Patins",garnissage:"Assise tapissée",tissu:"C"},277,"KUB0"),
      mk({base:"Patins",garnissage:"Assise tapissée",tissu:"D"},283,"KUB0"),
      mk({base:"Patins",garnissage:"Assise + corps tapissés",tissu:"B"},294,"KUC0"),
      mk({base:"Patins",garnissage:"Assise + corps tapissés",tissu:"B+"},303,"KUC0"),
      mk({base:"Patins",garnissage:"Assise + corps tapissés",tissu:"C"},309,"KUC0"),
      mk({base:"Patins",garnissage:"Assise + corps tapissés",tissu:"D"},317,"KUC0"),
    ];
    await prisma.produitVitrine.update({
      where: { id: pouf.id },
      data: {
        axesDeclinaisons: [
          { id: "base", nom: "Base", valeurs: ["Culbuto","Patins"] },
          { id: "garnissage", nom: "Garnissage", valeurs: ["Non tapissé","Assise tapissée","Assise + corps tapissés"] },
          { id: "tissu", nom: "Catégorie tissu", valeurs: ["Sans tissu","B","B+","C","D"] },
        ],
        declinaisons: decl,
      },
    });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: pouf.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris PE", vitrineId: pouf.id, ordre: 0, finitions: { create: COLORIS_PE } } });
    console.log(`  ✓ ${gamme.nom} / Pouf — ${decl.length} combinaisons + 1 groupe de finitions`);
  }

  // ── Produit 2 : Meuble de rangement (prix unique, sans axe) ──
  const meuble = trouver("Meuble de rangement");
  if (!meuble) manquants.push("Meuble de rangement");
  else {
    await prisma.produitVitrine.update({
      where: { id: meuble.id },
      data: {
        axesDeclinaisons: [],
        declinaisons: [ mk({}, 2372, "KUM6DT1BLC") ],
      },
    });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: meuble.id } });
    console.log(`  ✓ ${gamme.nom} / Meuble de rangement — 1 combinaison (prix unique 2372€)`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ Kulbu traitée (Pouf + Meuble de rangement).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
