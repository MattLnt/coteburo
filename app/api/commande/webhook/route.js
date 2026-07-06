import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// En App Router, le corps brut se lit avec req.text() — pas besoin de config.
export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("❌ Webhook signature invalide:", err.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  console.log(`📩 Webhook reçu : ${event.type}`);

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const commandeId = pi.metadata?.commandeId;
    console.log(`   → commandeId dans metadata : ${commandeId || "AUCUN"}`);
    if (commandeId) {
      try {
        await prisma.commande.update({
          where: { id: commandeId },
          data: { paye: true, statut: "payee", stripePaymentId: pi.id },
        });
        console.log(`✅ Commande ${pi.metadata.numero} marquée payée`);
      } catch (err) {
        console.error("❌ Erreur mise à jour commande:", err.message);
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const commandeId = pi.metadata?.commandeId;
    if (commandeId) {
      try {
        await prisma.commande.update({
          where: { id: commandeId },
          data: { statut: "echec_paiement" },
        });
      } catch (err) {
        console.error("❌ Erreur mise à jour commande:", err.message);
      }
    }
  }

  return NextResponse.json({ received: true });
}