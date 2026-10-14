"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useConsentement } from "@/components/ConsentementContext";

// Le bandeau cookies : une barre basse, deux boutons côte à côte.
//
// Posée en bas plutôt qu'au centre : la page reste lisible derrière, et sur
// mobile les deux boutons tombent sous le pouce. Elle ne s'affiche que tant
// qu'aucun choix n'a été fait, et l'affichage attend la relecture du choix —
// sinon elle apparaît une demi-seconde à chaque page chez quelqu'un qui a
// déjà répondu.

export default function BandeauCookies() {
  const { etat, charge, accepter, refuser } = useConsentement();
  const barre = useRef(null);
  const visible = charge && etat === "inconnu";

  // Le panier a sa propre barre fixe en bas d'écran sur mobile, avec le
  // bouton « Passer la commande ». Les deux se superposeraient : on publie
  // notre hauteur, et cette barre-là se décale d'autant (voir
  // app/(site)/panier/page.js).
  useEffect(() => {
    const racine = document.documentElement;
    if (!visible) {
      racine.style.removeProperty("--bandeau-cookies");
      return;
    }
    const mesurer = () => {
      const h = barre.current?.offsetHeight;
      if (h) racine.style.setProperty("--bandeau-cookies", `${h}px`);
    };
    mesurer();
    window.addEventListener("resize", mesurer);
    return () => {
      window.removeEventListener("resize", mesurer);
      racine.style.removeProperty("--bandeau-cookies");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={barre}
      role="dialog"
      aria-live="polite"
      aria-label="Cookies de mesure"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-white/97 backdrop-blur-md px-5 pt-4 sm:px-7"
      style={{
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        boxShadow: "0 -6px 24px rgba(0,0,0,0.08)",
      }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="font-display font-bold text-ink text-[14.5px] sm:text-base">Cookies de mesure</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft sm:text-[13.5px]">
            Nous aimerions mesurer l&apos;audience du site pour savoir ce qui vous est utile. Rien
            d&apos;obligatoire : le site fonctionne à l&apos;identique si vous refusez.{" "}
            <Link href="/confidentialite" className="font-semibold text-orange-dark underline hover:no-underline">
              En savoir plus
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={refuser}
            className="rounded-full border border-line bg-white px-5 py-3 text-[13.5px] font-semibold text-ink transition hover:bg-ink hover:text-white"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={accepter}
            className="flex-1 rounded-full bg-orange px-7 py-3 text-[13.5px] font-semibold text-white transition hover:bg-orange-dark sm:flex-none"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
