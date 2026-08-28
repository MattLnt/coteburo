"use server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

// Numéro de commande lisible : CB-2026-0001 — même logique que le checkout.
async function genererNumero() {
  const annee = new Date().getFullYear();
  const count = await prisma.commande.count();
  const seq = String(count + 1).padStart(4, "0");
  return `CB-${annee}-${seq}`;
}

const estExpire = (d) => !!d.dateValidite && new Date(d.dateValidite) < new Date();

export async function refuserDevis(token) {
  const devis = await prisma.devis.findUnique({ where: { token } });
  if (!devis) return { error: "Devis introuvable." };
  if (devis.statut === "accepte") return { error: "Ce devis a déjà été accepté." };

  await prisma.devis.update({
    where: { id: devis.id },
    data: { statut: "refuse", dateReponse: new Date() },
  });

  revalidatePath("/admin/devis");
  return { ok: true };
}

// Acceptation : crée la commande à partir du devis puis le PaymentIntent.
// Les prix viennent du DEVIS, pas du catalogue — un devis engage sur son prix
// même si le tarif a changé depuis.
export async function accepterDevis(token, { finitions, client }) {
  const devis = await prisma.devis.findUnique({
    where: { token },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) return { error: "Devis introuvable." };
  if (devis.statut === "accepte" && devis.commandeId) {
    return { error: "Ce devis a déjà été accepté." };
  }
  if (estExpire(devis)) {
    return { error: "Ce devis a expiré. Contactez-nous pour en obtenir un nouveau." };
  }
  if (!devis.lignes.length || devis.totalTTC == null) {
    return { error: "Ce devis n'est pas complet." };
  }

  const requis = ["prenom", "nom", "adresse", "codePostal", "ville"];
  for (const k of requis) {
    if (!client?.[k]?.trim()) return { error: "Adresse de livraison incomplète." };
  }

  // Un compte existe-t-il déjà pour cet email ? On rattache la commande sans
  // rien créer : le client pourra créer son compte plus tard.
  const user = await prisma.user.findUnique({
    where: { email: devis.email.toLowerCase() },
    select: { id: true },
  });

  const lignes = devis.lignes.map((l) => {
    // Les finitions choisies complètent la configuration figée du devis.
    const choix = (finitions || {})[l.id];
    const textesFinitions = choix
      ? Object.values(choix).filter(Boolean).join(" · ")
      : "";
    return {
      codeRacine: l.codeRacine || null,
      referenceFournisseur: l.codeRacine || null,
      designation: l.designation,
      marque: l.marque || null,
      finition: [l.config, textesFinitions].filter(Boolean).join(" · ") || null,
      prixHT: l.prixHT,
      quantite: l.quantite,
      imageUrl: l.imageUrl || null,
    };
  });

  const montantCentimes = Math.round(devis.totalTTC * 100);
  if (montantCentimes < 50) return { error: "Montant trop faible pour un paiement en ligne." };

  const numero = await genererNumero();
  const commande = await prisma.commande.create({
    data: {
      numero,
      statut: "en_attente",
      email: devis.email,
      telephone: devis.telephone || null,
      prenom: client.prenom.trim(),
      nom: client.nom.trim(),
      societe: client.societe?.trim() || devis.societe || null,
      adresse: client.adresse.trim(),
      complement: client.complement?.trim() || null,
      codePostal: client.codePostal.trim(),
      ville: client.ville.trim(),
      pays: "France",
      // Les totaux sont ceux du devis : frais déjà inclus dans totalHT côté
      // devis, on les reporte pour l'affichage sans double comptage.
      totalHT: devis.totalHT,
      totalTVA: devis.totalTVA,
      totalTTC: devis.totalTTC,
      fraisLivraison: 0,
      fraisInstallation: 0,
      avecInstallation: devis.fraisInstallation > 0,
      userId: user?.id || null,
      paye: false,
      lignes: { create: lignes },
    },
  });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: montantCentimes,
      currency: "eur",
      receipt_email: devis.email,
      metadata: { commandeId: commande.id, numero, devisNumero: devis.numero },
      payment_method_types: ["card"],
    });

    await prisma.commande.update({
      where: { id: commande.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    await prisma.devis.update({
      where: { id: devis.id },
      data: { statut: "accepte", dateReponse: new Date(), commandeId: commande.id },
    });

    revalidatePath("/admin/devis");
    return { clientSecret: paymentIntent.client_secret, numero, commandeId: commande.id };
  } catch (e) {
    console.error("Erreur PaymentIntent devis:", e);
    // La commande a été créée mais le paiement n'a pas pu démarrer : on la
    // retire pour ne pas laisser de commande fantôme.
    await prisma.commande.delete({ where: { id: commande.id } }).catch(() => {});
    return { error: "Impossible de démarrer le paiement. Réessayez." };
  }
}