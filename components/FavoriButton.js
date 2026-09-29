"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavori } from "@/app/(compte)/compte/favoris/actions";

// onChange(actif) : prévient le parent à chaque bascule, optimiste puis
// confirmée — le catalogue tient ses compteurs de favoris à jour sans recharger.
export default function FavoriButton({ codeRacine, vitrineId, initial = false, connecte = true, variant = "float", onChange = null }) {
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
    const poser = (v) => { setFavori(v); onChange?.(v); };
    const vise = !favori;
    poser(vise);
    startTransition(async () => {
      const res = await toggleFavori({ codeRacine, vitrineId });
      if (res?.error) poser(!vise); // rollback en cas d'erreur
      else if (typeof res?.favori === "boolean") poser(res.favori);
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

  // Variante fiche produit : un rond à côté du titre. Le libellé passait sur
  // deux lignes et faisait un bloc ; le cœur seul dit la même chose.
  const libelle = favori ? "Retirer des favoris" : "Ajouter aux favoris";
  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={libelle}
      title={libelle}
      className={`grid shrink-0 place-items-center w-11 h-11 rounded-full border transition ${favori ? "border-orange bg-orange-tint text-orange-dark" : "border-line bg-white text-ink hover:border-orange hover:text-orange"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={favori ? "#f0661b" : "none"} stroke="currentColor" strokeWidth="1.9">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}