import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";

// Génère un numéro de commande lisible : CB-2026-0001
async function genererNumero() {
  const annee = new Date().getFullYear();
  const count = await prisma.commande.count();
  const seq = String(count + 1).padStart(4, "0");
  return `CB-${annee}-${seq}`;
}

export async function POST(req) {
  try {
    const { client, items } = await req.json();

    if (!items?.length) {
      return NextResponse.json({ error: "Panier vide." }, { status: 400 });
    }
    const requis = ["email", "prenom", "nom", "adresse", "codePostal", "ville"];
    for (const k of requis) {
      if (!client?.[k]?.trim()) return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
    }

    // On recharge les vrais prix depuis la base (jamais confiance au client)
    const codes = [...new Set(items.map((it) => it.codeRacine))];
    const produits = await prisma.produit.findMany({
      where: { codeRacine: { in: codes }, publie: true },
      include: { marque: { select: { nom: true } } },
    });
    const promosActives = await getPromotionsActives();
    const produitsMap = Object.fromEntries(produits.map((p) => [p.codeRacine, p]));

    const lignes = [];
    for (const it of items) {
      const p = produitsMap[it.codeRacine];
      if (!p) return NextResponse.json({ error: `Produit indisponible : ${it.designation}` }, { status: 400 });
      const { prixFinal } = appliquerPromotions(p, promosActives);
      const quantite = Math.max(1, parseInt(it.quantite) || 1);
      lignes.push({
        codeRacine: p.codeRacine,
        designation: p.designation,
        marque: p.marque?.nom || null,
        finition: it.finition || null,
        prixHT: prixFinal,
        quantite,
        imageUrl: p.images?.[0] || null,
      });
    }

    const totalHT = lignes.reduce((s, l) => s + l.prixHT * l.quantite, 0);
    const totalTVA = totalHT * 0.2;
    const totalTTC = totalHT + totalTVA;
    const montantCentimes = Math.round(totalTTC * 100);

    // Création de la commande "en attente"
    const numero = await genererNumero();
    const commande = await prisma.commande.create({
      data: {
        numero,
        statut: "en_attente",
        email: client.email.trim(),
        telephone: client.telephone?.trim() || null,
        prenom: client.prenom.trim(),
        nom: client.nom.trim(),
        societe: client.societe?.trim() || null,
        adresse: client.adresse.trim(),
        complement: client.complement?.trim() || null,
        codePostal: client.codePostal.trim(),
        ville: client.ville.trim(),
        pays: "France",
        totalHT, totalTVA, totalTTC,
        paye: false,
        lignes: { create: lignes },
      },
    });

    // Création du PaymentIntent (le paiement reste sur ton site)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: montantCentimes,
      currency: "eur",
      receipt_email: client.email.trim(),
      metadata: { commandeId: commande.id, numero },
      payment_method_types: ["card"],
    });

    // On stocke l'id du PaymentIntent sur la commande
    await prisma.commande.update({
      where: { id: commande.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      numero,
      commandeId: commande.id,
    });
  } catch (err) {
    console.error("Erreur checkout:", err);
    return NextResponse.json({ error: "Erreur lors de la création du paiement." }, { status: 500 });
  }
}