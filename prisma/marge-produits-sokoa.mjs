import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Applique la marge des Réglages sur tous les produits Sokoa.
//
// Le premier script ne couvrait que la gamme « Accessoires Sokoa ».
// Les 45 produits à déclinaisons portent leur tarif fournisseur sans
// prix de vente, ce qui les empêche d'être publiés et de s'afficher.
//
// Les montants négatifs — les minorations — sont reportés tels quels :
// le fournisseur déduit une somme fixe, on déduit la même. Appliquer la
// marge creuserait la remise au-delà de ce qu'il consent.

const arrondi = (n) => Math.round(n * 100) / 100;

async function main() {
  const reglages = await prisma.reglages.findUnique({
    where: { id: 1 },
    select: { margeGlobale: true },
  });
  const marge = reglages?.margeGlobale ?? 0.3;
  console.log(`Coefficient appliqué : ${(marge * 100).toFixed(0)} %\n`);

  const marque = await prisma.marque.findFirst({
    where: { slug: "sokoa" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Sokoa introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: marque.id } },
    select: {
      id: true, nom: true, sansDeclinaisons: true,
      prixUnitaireTarifHT: true, prixUnitaireHT: true,
      prixUnitaireVerrouille: true, declinaisons: true,
      gamme: { select: { nom: true } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  let traites = 0, sansTarif = 0, minorations = 0;

  for (const v of vitrines) {
    const data = {};

    if (v.sansDeclinaisons) {
      if (v.prixUnitaireVerrouille) continue;
      if (v.prixUnitaireTarifHT == null) { sansTarif++; continue; }
      if (v.prixUnitaireHT != null) continue; // déjà fait

      const t = v.prixUnitaireTarifHT;
      data.prixUnitaireHT = t < 0 ? t : arrondi(t * (1 + marge));
      if (t < 0) minorations++;
    } else {
      const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
      if (!decl.length) { sansTarif++; continue; }

      let modifie = false;
      const nouvelles = decl.map((d) => {
        if (d.prixVerrouille) return d;
        if (d.prixVenteHT) return d; // déjà valorisée

        const t = parseFloat(String(d.prixTarifHT ?? "").replace(",", "."));
        if (Number.isNaN(t)) return d;

        modifie = true;
        if (t < 0) minorations++;
        return { ...d, prixVenteHT: String(t < 0 ? t : arrondi(t * (1 + marge))) };
      });

      if (!modifie) continue;
      data.declinaisons = nouvelles;
    }

    await prisma.produitVitrine.update({ where: { id: v.id }, data });

    const apercu = data.prixUnitaireHT != null
      ? `${data.prixUnitaireHT} €`
      : `${data.declinaisons.length} déclinaison(s)`;
    console.log(`✓ ${v.gamme.nom} — ${v.nom}`);
    console.log(`   ${apercu}`);
    traites++;
  }

  console.log(`\n${traites} produit(s) valorisé(s).`);
  if (sansTarif) console.log(`${sansTarif} sans tarif fournisseur — à saisir dans l'admin.`);
  if (minorations) console.log(`${minorations} montant(s) négatif(s) reporté(s) sans marge.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());