"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";

function ConfirmationContent() {
  const params = useSearchParams();
  const { clear } = useCart();
  const numero = params.get("numero");
  const status = params.get("redirect_status");
  const paymentIntent = params.get("payment_intent");
  const [vide, setVide] = useState(false);
  const [confirme, setConfirme] = useState(false);

  const succes = status === "succeeded" || !status;

  // Confirme la commande côté serveur (vérifie le paiement auprès de Stripe) + vide le panier
  useEffect(() => {
    if (!succes || vide) return;

    // Marque la commande payée en base via la route de confirmation
    if (paymentIntent) {
      fetch("/api/commande/confirmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent }),
      })
        .then((r) => r.json())
        .then(() => setConfirme(true))
        .catch(() => setConfirme(true));
    }

    clear();
    try { sessionStorage.removeItem("coteburo_commande_infos"); } catch {}
    setVide(true);
  }, [succes, vide, clear, paymentIntent]);

  if (!succes) {
    return (
      <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-20 text-center">
        <div className="mx-auto mb-6 grid place-items-center w-16 h-16 rounded-full bg-orange-tint text-orange-dark">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
        </div>
        <h1 className="font-display font-bold text-3xl">Paiement non abouti</h1>
        <p className="text-ink-soft mt-3">Votre paiement n'a pas pu être finalisé. Aucun montant n'a été débité. Vous pouvez réessayer.</p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/panier" className="rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Retour au panier</Link>
          <Link href="/contact" className="rounded-full border border-line font-semibold px-6 py-3.5 hover:bg-ink hover:text-white transition">Nous contacter</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-16 sm:py-20 text-center">
      <div className="mx-auto mb-6 grid place-items-center w-20 h-20 rounded-full bg-[#e8f6f0] text-[#1f7a52]">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Commande confirmée</p>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">Merci pour votre commande !</h1>
      <p className="text-ink-soft text-lg mt-4 max-w-md mx-auto">
        Votre paiement a bien été reçu. Un email de confirmation vous a été envoyé.
      </p>

      {numero && (
        <div className="inline-flex items-center gap-2 rounded-full bg-surface border border-line px-5 py-2.5 mt-6">
          <span className="text-ink-soft text-sm">Numéro de commande :</span>
          <span className="font-display font-bold text-ink">{numero}</span>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-6 mt-10 text-left">
        <h2 className="font-display font-bold text-lg mb-3">Et maintenant ?</h2>
        <ul className="flex flex-col gap-3 text-sm text-ink-soft">
          <li className="flex gap-3"><span className="text-orange font-bold">1.</span> Notre équipe prépare votre commande et vous contacte pour organiser la livraison et le montage.</li>
          <li className="flex gap-3"><span className="text-orange font-bold">2.</span> Vous recevez un email récapitulatif avec le détail de votre commande.</li>
          <li className="flex gap-3"><span className="text-orange font-bold">3.</span> Pour toute question, contactez-nous en précisant votre numéro de commande.</li>
        </ul>
      </div>

      <div className="flex items-center justify-center gap-3 mt-8">
        <Link href="/catalogue" className="rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Continuer mes achats</Link>
        <Link href="/" className="rounded-full border border-line font-semibold px-6 py-3.5 hover:bg-ink hover:text-white transition">Retour à l'accueil</Link>
      </div>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[720px] px-5 sm:px-7 py-20"><div className="h-64 rounded-2xl border border-line bg-surface animate-pulse" /></main>}>
      <ConfirmationContent />
    </Suspense>
  );
}