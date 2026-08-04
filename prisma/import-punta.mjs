import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Punta";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Fauteuil (1 place) ──
  const fauteuil = trouver("Fauteuil");
  if (!fauteuil) manquants.push("Fauteuil");
  else {
    await prisma.produitVitrine.update({ where: { id: fauteuil.id }, data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["Époxy alu","4 pieds bois"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: [
      mk({pietement:"Époxy alu",tissu:"B"},620,"PNX1/20"),
      mk({pietement:"Époxy alu",tissu:"B+"},630,"PNX1/20"),
      mk({pietement:"Époxy alu",tissu:"C"},641,"PNX1/20"),
      mk({pietement:"Époxy alu",tissu:"D"},681,"PNX1/20"),
      mk({pietement:"4 pieds bois",tissu:"B"},758,"PBX1/H0"),
      mk({pietement:"4 pieds bois",tissu:"B+"},768,"PBX1/H0"),
      mk({pietement:"4 pieds bois",tissu:"C"},779,"PBX1/H0"),
      mk({pietement:"4 pieds bois",tissu:"D"},819,"PBX1/H0"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: fauteuil.id } });
    console.log(`  ✓ ${gamme.nom} / Fauteuil — 8 combinaisons`);
  }

  // ── Canapé (2 / 3 places) ──
  const canape = trouver("Canapé");
  if (!canape) manquants.push("Canapé");
  else {
    await prisma.produitVitrine.update({ where: { id: canape.id }, data: {
      axesDeclinaisons: [
        { id: "places", nom: "Places", valeurs: ["2 places","3 places"] },
        { id: "pietement", nom: "Piètement", valeurs: ["Époxy alu","4 pieds bois"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: [
      mk({places:"2 places",pietement:"Époxy alu",tissu:"B"},915,"PNY1/20"),
      mk({places:"2 places",pietement:"Époxy alu",tissu:"B+"},935,"PNY1/20"),
      mk({places:"2 places",pietement:"Époxy alu",tissu:"C"},955,"PNY1/20"),
      mk({places:"2 places",pietement:"Époxy alu",tissu:"D"},1009,"PNY1/20"),
      mk({places:"2 places",pietement:"4 pieds bois",tissu:"B"},1053,"PBY1/H0"),
      mk({places:"2 places",pietement:"4 pieds bois",tissu:"B+"},1073,"PBY1/H0"),
      mk({places:"2 places",pietement:"4 pieds bois",tissu:"C"},1093,"PBY1/H0"),
      mk({places:"2 places",pietement:"4 pieds bois",tissu:"D"},1147,"PBY1/H0"),
      mk({places:"3 places",pietement:"Époxy alu",tissu:"B"},1128,"PNZ1/20"),
      mk({places:"3 places",pietement:"Époxy alu",tissu:"B+"},1151,"PNZ1/20"),
      mk({places:"3 places",pietement:"Époxy alu",tissu:"C"},1174,"PNZ1/20"),
      mk({places:"3 places",pietement:"Époxy alu",tissu:"D"},1244,"PNZ1/20"),
      mk({places:"3 places",pietement:"4 pieds bois",tissu:"B"},1266,"PBZ1/H0"),
      mk({places:"3 places",pietement:"4 pieds bois",tissu:"B+"},1289,"PBZ1/H0"),
      mk({places:"3 places",pietement:"4 pieds bois",tissu:"C"},1312,"PBZ1/H0"),
      mk({places:"3 places",pietement:"4 pieds bois",tissu:"D"},1382,"PBZ1/H0"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: canape.id } });
    console.log(`  ✓ ${gamme.nom} / Canapé — 16 combinaisons`);
  }

  // ── Table basse (Tables → Tables basses) ──
  const table = trouver("Table basse");
  if (!table) manquants.push("Table basse");
  else {
    await prisma.produitVitrine.update({ where: { id: table.id }, data: {
      axesDeclinaisons: [
        { id: "pietement", nom: "Piètement", valeurs: ["Époxy alu","Bois"] },
        { id: "taille", nom: "Taille du plateau", valeurs: ["60 × 60 cm","100 × 60 cm"] },
      ],
      declinaisons: [
      mk({pietement:"Époxy alu",taille:"60 × 60 cm"},224,"PNTC/2"),
      mk({pietement:"Époxy alu",taille:"100 × 60 cm"},263,"PNTR/2"),
      mk({pietement:"Bois",taille:"60 × 60 cm"},275,"PBTC/0"),
      mk({pietement:"Bois",taille:"100 × 60 cm"},314,"PBTR/0"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: table.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris plateau", vitrineId: table.id, ordre: 0, finitions: { create: [
      { nom: "Anthracite", couleur: "#3a3d42", ordre: 0 },
      { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Table basse — 4 combinaisons + 1 groupe de finitions`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ Punta traitée (Fauteuil, Canapé, Table basse).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
