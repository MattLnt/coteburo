"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { retirerFavori } from "./actions";

const euro = (v) => `${Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function FavorisGrille({ items }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liste, setListe] = useState(items);

  const retirer = (item) => {
    // Optimistic : on retire de la liste tout de suite
    setListe((l) => l.filter((it) => it.id !== item.id));
    startTransition(async () => {
      await retirerFavori(item.vitrineId ? { vitrineId: item.vitrineId } : { codeRacine: item.codeRacine });
      router.refresh();
    });
  };

  if (liste.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-12 text-center">
        <p className="text-ink-soft">Vous avez retiré tous vos favoris.</p>
        <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {liste.map((it) => {
        // Ancien système : prix figé, calculé côté serveur. Nouveau système : déjà formaté en chaîne ("Sur devis" possible).
        const prixAffiche = it.vitrineId ? it.prix : euro(it.prixVenteHT ?? it.prixPublicHT);
        return (
          <div key={it.id} className="group rounded-2xl border border-line bg-surface overflow-hidden hover:shadow-[0_20px_50px_-30px_rgba(33,36,40,0.3)] transition">
            <Link href={it.href} className="block">
              <div className="aspect-[4/3] bg-surface-2 overflow-hidden relative">
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.designation} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-ink-soft/25">
                    <svg width="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>
                  </div>
                )}
              </div>
            </Link>
            <div className="p-5">
              {it.gamme && <p className="text-[11px] font-bold uppercase tracking-wide text-orange">{it.gamme}</p>}
              <Link href={it.href}>
                <h3 className="font-display font-bold text-[15px] text-ink mt-1 leading-snug line-clamp-2 group-hover:text-orange transition min-h-[42px]">{it.designation}</h3>
              </Link>
              <div className="flex items-center justify-between mt-3">
                <p className="font-display font-bold text-lg text-ink">
                  {prixAffiche === "Sur devis" ? "Sur devis" : <>{prixAffiche}<span className="text-[12px] font-normal text-ink-soft"> HT</span></>}
                </p>
                <button
                  onClick={() => retirer(it)}
                  disabled={isPending}
                  title="Retirer des favoris"
                  className="grid place-items-center w-9 h-9 rounded-full bg-orange-tint text-orange-dark hover:bg-orange hover:text-white transition"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}