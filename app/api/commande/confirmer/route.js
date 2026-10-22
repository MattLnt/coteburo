import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { marquerPayeeEtNotifier } from "@/lib/encaissement";

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

    // Encaissement et emails vivent dans lib/encaissement.js, partagé avec le
    // webhook : les deux chemins arrivaient en course, et celui qui perdait
    // sautait les emails. Le verrou est en base, pas ici.
    const { commande, dejaPaye } = await marquerPayeeEtNotifier({
      commandeId,
      stripePaymentId: pi.id,
      origine: "page de confirmation",
    });

    if (!commande) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    console.log(`✅ Commande ${commande.numero} confirmée payée`);
    // Ce que la page de confirmation renvoie à la mesure d'audience. Le
    // montant vient de la base, jamais du navigateur : le panier en
    // localStorage peut avoir vieilli, et c'est le TTC encaissé qui compte.
    //
    // `dejaPaye` est le garde-fou du double comptage : une page de
    // confirmation rechargée repasse ici, et sans lui l'achat serait compté
    // deux fois. L'eventID (le numéro de commande) double la sécurité côté
    // Meta.
    //
    // Il vaut vrai aussi quand le webhook a encaissé avant l'arrivée du
    // navigateur. C'est le bon choix pour la mesure — l'achat est réel et
    // mérite d'être compté une fois — mais cela veut dire qu'un Purchase peut
    // manquer si le webhook gagne. Le compte côté Stripe reste la référence.
    return NextResponse.json({
      paye: true,
      numero: commande.numero,
      dejaPaye,
      totalTTC: commande.totalTTC,
      devise: "EUR",
      lignes: commande.lignes.map((l) => ({
        id: l.referenceFournisseur || l.codeRacine || l.vitrineId || l.id,
        quantite: l.quantite,
        prix: l.prixHT,
      })),
    });
  } catch (err) {
    console.error("Erreur confirmation:", err.message);
    return NextResponse.json({ error: "Erreur de confirmation" }, { status: 500 });
  }
}
