"use client";
import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export default function PaymentForm({ numero, email }) {
  const stripe = useStripe();
  const elements = useElements();
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setEnCours(true);
    setErreur("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/commande/confirmation?numero=${numero}`,
        payment_method_data: {
          billing_details: { email },
        },
      },
    });

    if (error) {
      setErreur(error.message || "Le paiement a échoué. Vérifiez vos informations.");
      setEnCours(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto", link: "never" },
          fields: { billingDetails: { email: "never" } },
        }}
      />

      {erreur && (
        <p className="text-sm text-orange-dark bg-orange-tint rounded-lg px-3 py-2 mt-4">{erreur}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || enCours}
        className="w-full rounded-full bg-orange text-white font-semibold px-6 py-3.5 mt-5 hover:bg-orange-dark transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {enCours ? "Paiement en cours…" : "Payer maintenant"}
      </button>

      <p className="text-[12px] text-ink-soft text-center mt-3 leading-relaxed">
        Paiement 100 % sécurisé via Stripe · Vos données bancaires sont chiffrées
      </p>
    </form>
  );
}