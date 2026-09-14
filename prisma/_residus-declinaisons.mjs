// Sélection partagée par les scripts de sauvegarde et de purge des déclinaisons
// résiduelles. Les deux DOIVENT viser le même ensemble : si la purge touchait une
// vitrine que la sauvegarde n'a pas exportée, elle serait irrécupérable.

export function nombre(v) {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

// Même logique que calculerPrixMini / prixUniqueEffectif : le prix unique
// existe-t-il vraiment ? (0 ne compte pas, une minoration négative si.)
export function prixUnique(v, marge) {
  const vente = nombre(v.prixUnitaireHT);
  if (v.prixUnitaireVerrouille && vente != null && vente !== 0) return vente;
  const tarif = nombre(v.prixUnitaireTarifHT);
  if (tarif != null && tarif !== 0) {
    return tarif < 0 ? tarif : Math.round(tarif * (1 + marge) * 100) / 100;
  }
  if (vente != null && vente !== 0) return vente;
  return null;
}

export async function getMarge(prisma) {
  const r = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } });
  return r?.margeGlobale ?? 0.3;
}

// Renvoie { aPurger, aExaminer } pour toutes les vitrines en prix unique qui
// portent encore des déclinaisons ou des axes.
//
// aExaminer : le résidu porte une information que le prix unique ne reprend pas
// (seule tarification du produit, ou référence fournisseur absente de
// referenceUnitaire). Ces vitrines ne sont ni purgées ni considérées comme sûres.
export async function collecterResidus(prisma, marge) {
  const vitrines = await prisma.produitVitrine.findMany({
    where: { sansDeclinaisons: true },
    select: {
      id: true, nom: true, slug: true, publie: true, referenceUnitaire: true,
      prixUnitaireTarifHT: true, prixUnitaireHT: true, prixUnitaireVerrouille: true,
      declinaisons: true, axesDeclinaisons: true,
    },
  });

  const aPurger = [];
  const aExaminer = [];

  for (const v of vitrines) {
    const decls = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    if (decls.length === 0 && axes.length === 0) continue;

    const pu = prixUnique(v, marge);
    const residuTarifie = decls.some((d) => {
      const t = nombre(d.prixTarifHT);
      const s = nombre(d.prixVenteHT);
      return (t != null && t !== 0) || (s != null && s !== 0);
    });
    const refPerdue = decls.some((d) => d.referenceFournisseur) && !v.referenceUnitaire;

    if ((pu == null && residuTarifie) || refPerdue) {
      aExaminer.push({ v, decls, axes, pu, motif: refPerdue ? "référence fournisseur non reprise" : "seul prix du produit" });
    } else {
      aPurger.push({ v, decls, axes, pu });
    }
  }

  return { aPurger, aExaminer, total: vitrines.length };
}
