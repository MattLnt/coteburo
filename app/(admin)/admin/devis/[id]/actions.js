"use server";

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { chargerCatalogueAdmin } from "@/lib/catalogueAdmin";
import { montantTVA, TVA_DEFAUT } from "@/lib/tva";
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
//
// L'éco-contribution est totalisée à part : la loi impose qu'elle figure
// distinctement sur le document, et elle ne subit pas la remise — c'est
// une taxe que Côté BURO paie au fabricant et refacture à l'identique.
function calculerTotaux({ lignes, remiseType, remiseValeur, fraisLivraison, fraisInstallation, tauxTva }) {
  const sousTotal = (lignes || []).reduce((s, l) => s + nb(l.prixHT) * (parseInt(l.quantite, 10) || 0), 0);
  const totalEcoPart = (lignes || []).reduce((s, l) => s + nb(l.ecoContribution) * (parseInt(l.quantite, 10) || 0), 0);
  const remise = remiseType === "montant"
    ? Math.min(nb(remiseValeur), sousTotal)
    : sousTotal * (nb(remiseValeur) / 100);
  const totalHT = sousTotal - remise + totalEcoPart + nb(fraisLivraison) + nb(fraisInstallation);
  const totalTVA = montantTVA(totalHT, tauxTva);
  return {
    sousTotal,
    remise,
    totalEcoPart: Math.round(totalEcoPart * 100) / 100,
    totalHT: Math.round(totalHT * 100) / 100,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  };
}

export async function enregistrerDevis(id, data) {
  await exigerAdmin();
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 }, select: { tva: true } });
  const totaux = calculerTotaux({
    lignes,
    tauxTva: reglages?.tva ?? TVA_DEFAUT,
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
        totalEcoPart: totaux.totalEcoPart,
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
            // Le montant est figé à la vente : si le fabricant révise son
            // barème l'an prochain, un devis émis aujourd'hui garde le
            // sien, comme pour le prix.
            ecoContribution: nb(l.ecoContribution),
            quantite: parseInt(l.quantite, 10) || 1,
            ordre: i,
            // Le bloc d'identité voyage avec la ligne quand l'admin rechiffre :
            // sans cela, chiffrer un devis effaçait ce qu'il fallait commander.
            combinaisonId: l.combinaisonId || null,
            referenceComplete: l.referenceComplete || null,
            fournisseur: l.fournisseur || l.marque || null,
            choix: l.choix || null,
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
  await exigerAdmin();
  const data = { statut };
  if (["accepte", "refuse"].includes(statut)) data.dateReponse = new Date();
  await prisma.devis.update({ where: { id }, data });
  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true };
}

export async function supprimerDevis(id) {
  await exigerAdmin();
  await prisma.devis.delete({ where: { id } });
  revalidatePath("/admin/devis");
  return { ok: true };
}

// Le panneau « Ajouter un produit » et le choix des produits lies d une fiche
// partagent desormais le meme chargeur et le meme filtrage : lib/catalogueAdmin.
// Le devis garde les accessoires, une ligne d accotoir y est legitime.
export async function chargerCatalogueDevis() {
  await exigerAdmin();
  return chargerCatalogueAdmin({ exclureOptions: false });
}

// Envoi du devis au client : génère le PDF, l'attache à l'email, pose la
// date de validité et bascule le statut.
export async function envoyerDevisAuClient(id) {
  await exigerAdmin();
  const devis = await prisma.devis.findUnique({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) return { error: "Devis introuvable." };
  if (!devis.lignes.length) return { error: "Ajoutez au moins une ligne avant d'envoyer." };
  if (devis.totalTTC == null) return { error: "Enregistrez le devis avant de l'envoyer." };
  if (!process.env.RESEND_API_KEY) return { error: "Clé Resend absente sur le serveur." };

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

  // Deux étapes séparées : un PDF qui échoue et un email qui échoue ne se
  // corrigent pas de la même façon, autant savoir lequel a lâché.
  let pdfBase64;
  try {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { DevisDocument } = await import("@/lib/DevisDocument");
    const buffer = await renderToBuffer(DevisDocument({ d: aJour, reglages: reglages || {} }));
    pdfBase64 = buffer.toString("base64");
  } catch (e) {
    console.error("Erreur génération PDF devis:", e);
    return { error: `Génération du PDF impossible : ${e.message}` };
  }

  try {
    const { envoyerDevisChiffre } = await import("@/lib/emails");
    await envoyerDevisChiffre({ devis: aJour, pdfBase64 });
  } catch (e) {
    console.error("Erreur envoi email devis:", e);
    // Le statut reste "envoyé" : le devis est figé côté base, mais on signale
    // l'échec pour que l'admin puisse relancer.
    return { error: `Email non envoyé : ${e.message}` };
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true };
}