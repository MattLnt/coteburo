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
      <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-12 sm:py-20 text-center">
        <div className="mx-auto mb-5 sm:mb-6 grid place-items-center w-16 h-16 rounded-full bg-orange-tint text-orange-dark">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
        </div>
        <h1 className="font-display font-bold text-[24px] sm:text-3xl">Paiement non abouti</h1>
        <p className="text-ink-soft mt-3 text-[13.5px] sm:text-base leading-relaxed">Votre paiement n&apos;a pas pu être finalisé. Aucun montant n&apos;a été débité. Vous pouvez réessayer.</p>
        {/* Boutons empilés sur mobile : côte à côte, ils débordaient */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-2.5 sm:gap-3 mt-6 sm:mt-8">
          <Link href="/panier" className="rounded-full bg-orange text-white font-semibold px-6 py-3.5 text-[13.5px] sm:text-base hover:bg-orange-dark transition">Retour au panier</Link>
          <Link href="/contact" className="rounded-full border border-line font-semibold px-6 py-3.5 text-[13.5px] sm:text-base hover:bg-ink hover:text-white transition">Nous contacter</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-10 sm:py-20 text-center">
      <div className="mx-auto mb-5 sm:mb-6 grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#e8f6f0] text-[#1f7a52]">
        <svg className="w-[30px] h-[30px] sm:w-[38px] sm:h-[38px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Commande confirmée</p>
      <h1 className="font-display font-bold text-[26px] sm:text-4xl mt-2 leading-tight">Merci pour votre commande !</h1>
      <p className="text-ink-soft text-[14px] sm:text-lg mt-3 sm:mt-4 max-w-md mx-auto leading-relaxed">
        Votre paiement a bien été reçu. Un email de confirmation vous a été envoyé.
      </p>

      {numero && (
        <div className="inline-flex items-center gap-2 rounded-full bg-surface border border-line px-4 sm:px-5 py-2.5 mt-5 sm:mt-6">
          <span className="text-ink-soft text-[12px] sm:text-sm">Commande&nbsp;:</span>
          <span className="font-display font-bold text-ink text-[13.5px] sm:text-base">{numero}</span>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 mt-7 sm:mt-10 text-left">
        <h2 className="font-display font-bold text-[15.5px] sm:text-lg mb-3">Et maintenant ?</h2>
        <ul className="flex flex-col gap-2.5 sm:gap-3 text-[13px] sm:text-sm text-ink-soft">
          <li className="flex gap-3"><span className="text-orange font-bold shrink-0">1.</span> Notre équipe prépare votre commande et vous contacte pour organiser la livraison et le montage.</li>
          <li className="flex gap-3"><span className="text-orange font-bold shrink-0">2.</span> Vous recevez un email récapitulatif avec le détail de votre commande.</li>
          <li className="flex gap-3"><span className="text-orange font-bold shrink-0">3.</span> Pour toute question, contactez-nous en précisant votre numéro de commande.</li>
        </ul>
      </div>

      {/* Suivi de commande — l'accès à l'espace client manquait ici, alors que
          c'est le geste naturel juste après un achat. */}
      <Link href="/compte/commandes"
        className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 mt-2.5 sm:mt-3 text-left hover:border-orange transition">
        <span className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-orange-tint text-orange-dark shrink-0">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink text-[13.5px] sm:text-sm">Suivre ma commande</span>
            <span className="block text-[11.5px] sm:text-[12.5px] text-ink-soft mt-0.5">Depuis votre espace client</span>
          </span>
        </span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink-soft/50 shrink-0"><path d="m9 18 6-6-6-6" /></svg>
      </Link>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-2.5 sm:gap-3 mt-6 sm:mt-8">
        <Link href="/catalogue" className="rounded-full bg-orange text-white font-semibold px-6 py-3.5 text-[13.5px] sm:text-base hover:bg-orange-dark transition">Continuer mes achats</Link>
        <Link href="/" className="rounded-full border border-line font-semibold px-6 py-3.5 text-[13.5px] sm:text-base hover:bg-ink hover:text-white transition">Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[720px] px-5 sm:px-7 py-12 sm:py-20"><div className="h-64 rounded-2xl border border-line bg-surface animate-pulse" /></main>}>
      <ConfirmationContent />
    </Suspense>
  );
}