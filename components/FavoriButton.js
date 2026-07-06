"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavori } from "@/app/(compte)/compte/favoris/actions";

export default function FavoriButton({ codeRacine, initial = false, connecte = true, variant = "float" }) {
  const router = useRouter();
  const [favori, setFavori] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Si pas connecté, rediriger vers la connexion
    if (!connecte) {
      router.push("/connexion");
      return;
    }

    // Optimistic UI
    setFavori((v) => !v);
    startTransition(async () => {
      const res = await toggleFavori(codeRacine);
      if (res?.error) setFavori((v) => !v); // rollback en cas d'erreur
      else if (typeof res?.favori === "boolean") setFavori(res.favori);
    });
  };

  // Variante flottante (sur une carte produit)
  if (variant === "float") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`grid place-items-center w-9 h-9 rounded-full backdrop-blur transition ${favori ? "bg-orange text-white" : "bg-white/90 text-ink hover:bg-white"}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={favori ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>
    );
  }

  // Variante bouton texte (sur une page produit)
  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 font-semibold text-sm transition ${favori ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={favori ? "#f0661b" : "none"} stroke="currentColor" strokeWidth="1.9">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {favori ? "Dans vos favoris" : "Ajouter aux favoris"}
    </button>
  );
}