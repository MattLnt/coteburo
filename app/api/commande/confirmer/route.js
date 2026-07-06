import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: "PaymentIntent manquant" }, { status: 400 });
    }

    // On interroge Stripe pour connaître le vrai statut du paiement
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return NextResponse.json({ paye: false, statut: pi.status });
    }

    const commandeId = pi.metadata?.commandeId;
    if (!commandeId) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // On marque la commande payée (si pas déjà fait par le webhook)
    const commande = await prisma.commande.update({
      where: { id: commandeId },
      data: { paye: true, statut: "payee", stripePaymentId: pi.id },
      select: { numero: true, paye: true, totalTTC: true },
    });

    console.log(`✅ Commande ${commande.numero} confirmée payée (via page confirmation)`);
    return NextResponse.json({ paye: true, numero: commande.numero });
  } catch (err) {
    console.error("Erreur confirmation:", err.message);
    return NextResponse.json({ error: "Erreur de confirmation" }, { status: 500 });
  }
}