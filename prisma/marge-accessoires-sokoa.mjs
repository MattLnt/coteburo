import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Applique la marge globale des Réglages sur les accessoires Sokoa importés.
//
// Les minorations font exception : un prix négatif est une pièce que le
// client refuse, pas une vente. Sokoa déduit un montant fixe du siège, on
// reporte le même. Y appliquer la marge creuserait la remise au-delà de
// ce que le fournisseur consent.
const CIBLE = "Accessoires Sokoa";

const arrondi = (n) => Math.round(n * 100) / 100;

async function main() {
  const reglages = await prisma.reglages.findUnique({
    where: { id: 1 },
    select: { margeGlobale: true },
  });
  const marge = reglages?.margeGlobale ?? 0.3;
  console.log(`Marge appliquée : ${(marge * 100).toFixed(0)} %\n`);

  const gamme = await prisma.gamme.findFirst({
    where: { nom: CIBLE },
    select: { id: true },
  });
  if (!gamme) {
    console.log(`Gamme « ${CIBLE} » introuvable.`);
    return;
  }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gammeId: gamme.id },
    select: {
      id: true, nom: true, sansDeclinaisons: true,
      prixUnitaireTarifHT: true, prixUnitaireHT: true,
      prixUnitaireVerrouille: true, declinaisons: true,
    },
  });

  let traites = 0, minorations = 0;

  for (const v of vitrines) {
    const data = {};

    // Prix unique
    if (v.sansDeclinaisons && v.prixUnitaireTarifHT != null && !v.prixUnitaireVerrouille) {
      const tarif = v.prixUnitaireTarifHT;
      const vente = tarif < 0 ? tarif : arrondi(tarif * (1 + marge));
      if (tarif < 0) minorations++;
      data.prixUnitaireHT = vente;
    }

    // Déclinaisons
    if (!v.sansDeclinaisons && Array.isArray(v.declinaisons) && v.declinaisons.length) {
      let modifie = false;
      const decl = v.declinaisons.map((d) => {
        if (d.prixVerrouille) return d;
        const tarif = parseFloat(String(d.prixTarifHT ?? "").replace(",", "."));
        if (Number.isNaN(tarif)) return d;
        const vente = tarif < 0 ? tarif : arrondi(tarif * (1 + marge));
        if (tarif < 0) minorations++;
        modifie = true;
        return { ...d, prixVenteHT: String(vente) };
      });
      if (modifie) data.declinaisons = decl;
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.produitVitrine.update({ where: { id: v.id }, data });

    const apercu = data.prixUnitaireHT != null
      ? `${data.prixUnitaireHT} €`
      : `${data.declinaisons.length} déclinaison(s)`;
    console.log(`✓ ${v.nom} — ${apercu}`);
    traites++;
  }

  console.log(`\n${traites} produit(s) traité(s).`);
  if (minorations) console.log(`${minorations} minoration(s) laissée(s) au montant fournisseur.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());