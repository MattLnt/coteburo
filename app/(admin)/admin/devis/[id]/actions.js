"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const nb = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Calcule les totaux à partir des lignes et des frais.
// Non exportée : dans un fichier "use server", tout export doit être une
// fonction asynchrone. L'admin refait le même calcul côté client pour
// l'affichage en direct ; c'est celui-ci qui est enregistré.
function calculerTotaux({ lignes, remiseType, remiseValeur, fraisLivraison, fraisInstallation }) {
  const sousTotal = (lignes || []).reduce((s, l) => s + nb(l.prixHT) * (parseInt(l.quantite, 10) || 0), 0);
  const remise = remiseType === "montant"
    ? Math.min(nb(remiseValeur), sousTotal)
    : sousTotal * (nb(remiseValeur) / 100);
  const totalHT = sousTotal - remise + nb(fraisLivraison) + nb(fraisInstallation);
  const totalTVA = totalHT * 0.2;
  return {
    sousTotal,
    remise,
    totalHT: Math.round(totalHT * 100) / 100,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  };
}

export async function enregistrerDevis(id, data) {
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  const totaux = calculerTotaux({
    lignes,
    remiseType: data.remiseType,
    remiseValeur: data.remiseValeur,
    fraisLivraison: data.fraisLivraison,
    fraisInstallation: data.fraisInstallation,
  });

  // Les lignes sont remplacées en bloc : plus simple et plus sûr que de
  // les comparer une à une, le volume reste petit.
  await prisma.$transaction([
    prisma.ligneDevis.deleteMany({ where: { devisId: id } }),
    prisma.devis.update({
      where: { id },
      data: {
        adresse: data.adresse?.trim() || null,
        complement: data.complement?.trim() || null,
        codePostal: data.codePostal?.trim() || null,
        ville: data.ville?.trim() || null,
        remiseType: data.remiseType === "montant" ? "montant" : "pourcentage",
        remiseValeur: nb(data.remiseValeur),
        fraisLivraison: nb(data.fraisLivraison),
        fraisInstallation: nb(data.fraisInstallation),
        noteClient: data.noteClient?.trim() || null,
        noteInterne: data.noteInterne?.trim() || null,
        totalHT: totaux.totalHT,
        totalTVA: totaux.totalTVA,
        totalTTC: totaux.totalTTC,
        // Une demande qu'on chiffre passe automatiquement en cours : évite
        // d'oublier de changer le statut à la main.
        statut: data.statut || undefined,
        lignes: {
          create: lignes.map((l, i) => ({
            codeRacine: l.codeRacine || null,
            vitrineId: l.vitrineId || null,
            designation: (l.designation || "").trim() || "Ligne sans nom",
            marque: l.marque || null,
            gammeNom: l.gammeNom || null,
            config: l.config || null,
            imageUrl: l.imageUrl || null,
            prixHT: nb(l.prixHT),
            quantite: parseInt(l.quantite, 10) || 1,
            ordre: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true, totaux };
}

export async function changerStatutDevis(id, statut) {
  const data = { statut };
  if (["accepte", "refuse"].includes(statut)) data.dateReponse = new Date();
  await prisma.devis.update({ where: { id }, data });
  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true };
}

export async function supprimerDevis(id) {
  await prisma.devis.delete({ where: { id } });
  revalidatePath("/admin/devis");
  return { ok: true };
}

// Charge tout le catalogue en une fois pour le panneau d'ajout.
// Le filtrage se fait ensuite côté navigateur : instantané, et le volume
// reste raisonnable (quelques centaines de produits au plus).
export async function chargerCatalogueDevis() {
  const [vitrines, categories] = await Promise.all([
    prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { publie: true } },
      include: {
        gamme: { select: { nom: true } },
        categories: { select: { id: true, slug: true, nom: true }, take: 1 },
        sousCategories: { select: { id: true, slug: true, nom: true }, take: 1 },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.categorie.findMany({
      orderBy: { ordre: "asc" },
      include: { sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, slug: true } } },
    }),
  ]);

  const produits = vitrines.map((v) => {
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];

    // Libellé lisible d'une déclinaison : "180 cm / Avec retour"
    const libelle = (d) => {
      if (!d.valeurs) return d.reference || "Variante";
      return axes.map((a) => d.valeurs[a.id]).filter(Boolean).join(" / ") || (d.reference || "Variante");
    };

    const declinaisons = decl.map((d) => ({
      id: d.id,
      libelle: libelle(d),
      prixHT: Number(d.prixVenteHT) || 0,
    }));

    const prix = declinaisons.length > 0
      ? Math.min(...declinaisons.map((d) => d.prixHT).filter((p) => p > 0))
      : (v.prixUnitaireHT ?? null);

    return {
      id: v.id,
      nom: v.nom,
      gammeNom: v.gamme.nom,
      imageUrl: (v.images && v.images[0]) || v.imageUrl || null,
      slug: v.slug,
      categorieId: v.categories[0]?.id || null,
      categorieNom: v.categories[0]?.nom || null,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieId: v.sousCategories[0]?.id || null,
      sousCategorieNom: v.sousCategories[0]?.nom || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
      prixMini: Number.isFinite(prix) ? prix : null,
      prixUnitaire: v.prixUnitaireHT ?? null,
      declinaisons,
    };
  });

  // On ne garde que les catégories qui contiennent réellement des produits.
  const idsUtilises = new Set(produits.map((p) => p.categorieId).filter(Boolean));
  const cats = categories
    .filter((c) => idsUtilises.has(c.id))
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      sousCategories: c.sousCategories.filter((s) => produits.some((p) => p.sousCategorieId === s.id)),
    }));

  return { produits, categories: cats };
}

// Envoi du devis au client : génère le PDF, l'attache à l'email, pose la
// date de validité et bascule le statut.
export async function envoyerDevisAuClient(id) {
  const devis = await prisma.devis.findUnique({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) return { error: "Devis introuvable." };
  if (!devis.lignes.length) return { error: "Ajoutez au moins une ligne avant d'envoyer." };
  if (devis.totalTTC == null) return { error: "Enregistrez le devis avant de l'envoyer." };

  const reglages = await prisma.reglages.findUnique({ where: { id: 1 } });
  const jours = reglages?.validiteDevisJours ?? 30;
  const dateValidite = new Date();
  dateValidite.setDate(dateValidite.getDate() + jours);

  // La date de validité est posée AVANT la génération du PDF : elle doit
  // y figurer.
  const aJour = await prisma.devis.update({
    where: { id },
    data: { dateEnvoi: new Date(), dateValidite, statut: "envoye" },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });

  try {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { DevisDocument } = await import("@/lib/DevisDocument");
    const { envoyerDevisChiffre } = await import("@/lib/emails");

    const buffer = await renderToBuffer(DevisDocument({ d: aJour, reglages: reglages || {} }));
    await envoyerDevisChiffre({ devis: aJour, pdfBase64: buffer.toString("base64") });
  } catch (e) {
    console.error("Erreur envoi devis:", e.message);
    // Le statut reste "envoyé" : le devis est bien figé côté base, mais on
    // signale l'échec pour que l'admin puisse relancer.
    return { error: "Le devis est enregistré mais l'email n'a pas pu partir. Réessayez." };
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true };
}