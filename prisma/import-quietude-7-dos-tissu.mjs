import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "QUIETUDE";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm("Dos armoire tissu"));
  if (!v) {
    console.error(`⚠ Produit "Dos armoire tissu" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
    process.exit(1);
  }

  const decl = [
    mk({dimension:"L80 × H104",tissu:"Beige"},140,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Chocolat"},140,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Forêt"},140,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Horizon"},140,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Pêche"},140,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Sable"},140,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Bleu"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Bleu pétrole"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Gris carbone"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Gris clair"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Ocre"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Orange"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Rouge"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Vert acide"},170,"EH10"),
    mk({dimension:"L80 × H104",tissu:"Vert eau"},170,"EH10"),
    mk({dimension:"L80 × H136",tissu:"Beige"},175,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Chocolat"},175,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Forêt"},175,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Horizon"},175,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Pêche"},175,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Sable"},175,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Bleu"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Bleu pétrole"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Gris carbone"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Gris clair"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Ocre"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Orange"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Rouge"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Vert acide"},205,"EH11"),
    mk({dimension:"L80 × H136",tissu:"Vert eau"},205,"EH11"),
    mk({dimension:"L100 × H104",tissu:"Beige"},170,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Chocolat"},170,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Forêt"},170,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Horizon"},170,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Pêche"},170,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Sable"},170,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Bleu"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Bleu pétrole"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Gris carbone"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Gris clair"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Ocre"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Orange"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Rouge"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Vert acide"},200,"EH12"),
    mk({dimension:"L100 × H104",tissu:"Vert eau"},200,"EH12"),
    mk({dimension:"L100 × H136",tissu:"Beige"},215,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Chocolat"},215,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Forêt"},215,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Horizon"},215,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Pêche"},215,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Sable"},215,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Bleu"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Bleu pétrole"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Gris carbone"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Gris clair"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Ocre"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Orange"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Rouge"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Vert acide"},245,"EH13"),
    mk({dimension:"L100 × H136",tissu:"Vert eau"},245,"EH13"),
    mk({dimension:"L120 × H104",tissu:"Beige"},180,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Chocolat"},180,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Forêt"},180,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Horizon"},180,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Pêche"},180,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Sable"},180,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Bleu"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Bleu pétrole"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Gris carbone"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Gris clair"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Ocre"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Orange"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Rouge"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Vert acide"},210,"EH14"),
    mk({dimension:"L120 × H104",tissu:"Vert eau"},210,"EH14"),
    mk({dimension:"L120 × H136",tissu:"Beige"},230,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Chocolat"},230,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Forêt"},230,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Horizon"},230,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Pêche"},230,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Sable"},230,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Bleu"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Bleu pétrole"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Gris carbone"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Gris clair"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Ocre"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Orange"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Rouge"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Vert acide"},260,"EH15"),
    mk({dimension:"L120 × H136",tissu:"Vert eau"},260,"EH15"),
    mk({dimension:"L120 × H160",tissu:"Beige"},260,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Chocolat"},260,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Forêt"},260,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Horizon"},260,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Pêche"},260,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Sable"},260,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Bleu"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Bleu pétrole"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Gris carbone"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Gris clair"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Ocre"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Orange"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Rouge"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Vert acide"},290,"EH16"),
    mk({dimension:"L120 × H160",tissu:"Vert eau"},290,"EH16"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "dimension", nom: "Dimension", valeurs: ["L80 × H104", "L80 × H136", "L100 × H104", "L100 × H136", "L120 × H104", "L120 × H136", "L120 × H160"] },
        { id: "tissu", nom: "Tissu", valeurs: ["Beige", "Chocolat", "Forêt", "Horizon", "Pêche", "Sable", "Bleu", "Bleu pétrole", "Gris carbone", "Gris clair", "Ocre", "Orange", "Rouge", "Vert acide", "Vert eau"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${v.nom} — ${decl.length} combinaisons (7 dimensions × 15 tissus)`);
  console.log(`\n✓ Dos armoire tissu QUIETUDE traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
