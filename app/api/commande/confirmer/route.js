import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { envoyerConfirmationClient, envoyerNotificationInterne } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: "PaymentIntent manquant" }, { status: 400 });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return NextResponse.json({ paye: false, statut: pi.status });
    }

    const commandeId = pi.metadata?.commandeId;
    if (!commandeId) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // On récupère la commande avant mise à jour (pour savoir si déjà payée)
    const avant = await prisma.commande.findUnique({
      where: { id: commandeId },
      select: { paye: true },
    });

    const commande = await prisma.commande.update({
      where: { id: commandeId },
      data: { paye: true, statut: "payee", stripePaymentId: pi.id },
      include: { lignes: true },
    });

    // Si la commande vient d'un devis, il passe en « accepté » maintenant —
    // pas au lancement du paiement, sinon un abandon laisserait un devis
    // accepté sans encaissement.
    await prisma.devis.updateMany({
      where: { commandeId: commande.id },
      data: { statut: "accepte", dateReponse: new Date() },
    });

    // On envoie les emails UNIQUEMENT si la commande n'était pas déjà payée
    if (!avant?.paye) {
      try {
        await Promise.all([
          envoyerConfirmationClient(commande),
          envoyerNotificationInterne(commande),
        ]);
        console.log(`📧 Emails envoyés pour ${commande.numero}`);
      } catch (mailErr) {
        // On ne bloque pas la confirmation si l'email échoue
        console.error("Erreur envoi emails:", mailErr.message);
      }
    }

    console.log(`✅ Commande ${commande.numero} confirmée payée`);
    return NextResponse.json({ paye: true, numero: commande.numero });
  } catch (err) {
    console.error("Erreur confirmation:", err.message);
    return NextResponse.json({ error: "Erreur de confirmation" }, { status: 500 });
  }
}