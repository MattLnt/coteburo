"use client";
import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const fmt = (n) => `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function PaymentForm({ numero, email, montant }) {
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

  const libelle = enCours
    ? "Paiement en cours…"
    : montant != null ? `Payer ${fmt(montant)}` : "Payer maintenant";

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
        <p className="text-[12.5px] sm:text-sm text-orange-dark bg-orange-tint rounded-lg px-3 py-2 mt-4">{erreur}</p>
      )}

      {/* Bouton desktop, dans le flux */}
      <button
        type="submit"
        disabled={!stripe || enCours}
        className="hidden lg:flex w-full rounded-full bg-orange text-white font-semibold px-6 py-3.5 mt-5 hover:bg-orange-dark transition disabled:opacity-60 items-center justify-center gap-2"
      >
        {libelle}
      </button>

      <p className="hidden lg:block text-[12px] text-ink-soft text-center mt-3 leading-relaxed">
        Paiement 100 % sécurisé via Stripe · Vos données bancaires sont chiffrées
      </p>

      {/* Barre de paiement fixe (mobile). Le bouton reste un descendant du
          <form> dans le DOM : position:fixed ne casse pas la soumission. */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <p className="text-[10.5px] text-ink-soft">Montant à payer</p>
            <p className="font-display font-bold text-[20px] text-ink leading-tight">{montant != null ? fmt(montant) : "—"}</p>
          </div>
          <span className="flex items-center gap-1.5 text-[#1f7a52] shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            <span className="text-[11px] font-semibold">Sécurisé</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={!stripe || enCours}
          className="w-full rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-60"
        >
          {libelle}
        </button>
      </div>
    </form>
  );
}