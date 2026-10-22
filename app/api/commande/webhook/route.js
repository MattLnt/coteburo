import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { marquerPayeeEtNotifier } from "@/lib/encaissement";

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
        // Le webhook envoie les emails lui aussi, désormais. C'est même lui
        // qui compte : il arrive presque toujours avant le navigateur, et il
        // arrive même quand le client a fermé l'onglet. Le verrou en base
        // (voir lib/encaissement.js) garantit un seul envoi.
        const { commande } = await marquerPayeeEtNotifier({
          commandeId,
          stripePaymentId: pi.id,
          origine: "webhook Stripe",
        });
        console.log(`✅ Commande ${commande?.numero || pi.metadata?.numero} marquée payée`);
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
