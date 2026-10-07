"use server";

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normaliserCode } from "@/lib/codePromo";

// { buronomic: "25", sokoa: "20" } → { buronomic: 25, sokoa: 20 }, sans les
// taux vides ou nuls.
function remisesMarquesPropres(brut) {
  const out = {};
  if (brut && typeof brut === "object" && !Array.isArray(brut)) {
    for (const [slug, v] of Object.entries(brut)) {
      const n = parseFloat(String(v).replace(",", "."));
      if (slug && Number.isFinite(n) && n > 0) out[slug] = n;
    }
  }
  return out;
}

// Un entier positif, ou null quand le champ est laissé vide.
function entierOuNull(v) {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Un montant positif, ou null quand le champ est laissé vide.
function montantOuNull(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Les champs propres à un code promo, et ce qui les rend valides.
//
// Un code n'a pas de cible à vérifier : son code EST sa cible, et sa remise
// porte sur le panier entier. Il lui faut seulement un code et une remise.
function champsCode(data, valeur) {
  const code = normaliserCode(data.code);
  if (!code) return { error: "Écrivez le code que le client devra saisir." };
  if (valeur <= 0) return { error: "Indiquez la remise accordée par le code." };
  return {
    champs: {
      modeRemise: "code",
      code,
      codeMinimumHT: montantOuNull(data.codeMinimumHT),
      codeMaxUtilisations: entierOuNull(data.codeMaxUtilisations),
      codeUneFoisParClient: !!data.codeUneFoisParClient,
      // Un code ne cible rien : on efface les cibles d'une campagne
      // convertie, sinon elles continueraient à remiser le catalogue.
      categories: [],
      remisesMarques: {},
    },
  };
}

// Ce qu'une campagne doit avoir pour changer un prix quelque part.
function verifierCibles(data, valeur) {
  const remisesMarques = remisesMarquesPropres(data.remisesMarques);
  const generale = (Array.isArray(data.categories) && data.categories.length > 0)
    || (Array.isArray(data.cibles) && data.cibles.length > 0);
  if (!generale && Object.keys(remisesMarques).length === 0) {
    return { error: "Ciblez au moins un fournisseur, une catégorie ou un produit." };
  }
  if (generale && valeur <= 0) {
    return { error: "Indiquez la remise à appliquer aux catégories et produits ciblés." };
  }
  return { remisesMarques };
}

export async function createPromotion(data) {
  await exigerAdmin();
  const nom = data.nom?.trim();
  if (!nom) return { ok: false, error: "Le nom est requis." };

  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;
  const estCode = data.modeRemise === "code";
  const specifique = estCode ? champsCode(data, valeur) : verifierCibles(data, valeur);
  if (specifique.error) return { ok: false, error: specifique.error };

  let promo;
  try {
    promo = await prisma.promotion.create({
      data: {
        nom,
        messageBandeau: (data.messageBandeau || "").trim() || null,
        typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
        valeur,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        actif: data.actif !== false,
        afficherBandeau: data.afficherBandeau !== false,
        ...(estCode ? specifique.champs : {
          modeRemise: "auto",
          code: null,
          categories: Array.isArray(data.categories) ? data.categories : [],
          remisesMarques: specifique.remisesMarques,
        }),
      },
    });
  } catch (err) {
    // Deux campagnes ne peuvent pas partager un code : c'est lui qui désigne
    // la remise.
    if (err?.code === "P2002") return { ok: false, error: "Ce code est déjà utilisé par une autre campagne." };
    throw err;
  }

  // Produits ciblés — sans objet pour un code, qui remise le panier entier.
  if (!estCode && Array.isArray(data.cibles) && data.cibles.length > 0) {
    await prisma.promotionVitrine.createMany({
      data: data.cibles.map((vitrineId) => ({ promotionId: promo.id, vitrineId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePromotion(id, data) {
  await exigerAdmin();
  const valeur = parseFloat(String(data.valeur).replace(",", ".")) || 0;
  const estCode = data.modeRemise === "code";
  const specifique = estCode ? champsCode(data, valeur) : verifierCibles(data, valeur);
  if (specifique.error) return { ok: false, error: specifique.error };

  try {
    await prisma.promotion.update({
      where: { id },
      data: {
        nom: data.nom?.trim() || undefined,
        messageBandeau: (data.messageBandeau || "").trim() || null,
        typeRemise: data.typeRemise === "montant" ? "montant" : "pourcentage",
        valeur,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        actif: !!data.actif,
        afficherBandeau: data.afficherBandeau !== false,
        ...(estCode ? specifique.champs : {
          // Repassée en automatique, la campagne rend son code : il doit
          // redevenir libre pour une autre, et ne plus rien remiser au panier.
          modeRemise: "auto",
          code: null,
          codeMinimumHT: null,
          codeMaxUtilisations: null,
          codeUneFoisParClient: false,
          categories: Array.isArray(data.categories) ? data.categories : [],
          remisesMarques: specifique.remisesMarques,
        }),
      },
    });
  } catch (err) {
    if (err?.code === "P2002") return { ok: false, error: "Ce code est déjà utilisé par une autre campagne." };
    throw err;
  }

  // On remplace la liste des produits ciblés
  await prisma.promotionVitrine.deleteMany({ where: { promotionId: id } });
  if (!estCode && Array.isArray(data.cibles) && data.cibles.length > 0) {
    await prisma.promotionVitrine.createMany({
      data: data.cibles.map((vitrineId) => ({ promotionId: id, vitrineId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePromotion(id) {
  await exigerAdmin();
  await prisma.promotion.delete({ where: { id } });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function togglePromotion(id, actif) {
  await exigerAdmin();
  await prisma.promotion.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: true };
}