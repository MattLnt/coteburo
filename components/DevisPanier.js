"use client";
import Link from "next/link";
import { useDevis } from "@/components/devis/DevisContext";

const fmt = (n) => `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;

export default function DevisPanier() {
  const { items, removeDevis, updateQuantite } = useDevis();

  if (items.length === 0) return null;

  const tousChiffres = items.every((it) => it.prixIndicatif != null);
  const totalIndicatif = items.reduce((s, it) => s + (it.prixIndicatif ?? 0) * it.quantite, 0);

  return (
    <div className="rounded-[24px] border border-line bg-surface overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-line flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">Votre sélection</p>
          <h2 className="font-display font-bold text-xl mt-1">{items.length} produit{items.length > 1 ? "s" : ""}</h2>
        </div>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-orange"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>
      </div>

      <div className="max-h-[440px] overflow-y-auto divide-y divide-line">
        {items.map((it) => (
          <div key={it.id} className="flex gap-3 px-6 py-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)] border border-line shrink-0">
              {it.image ? (
                <img src={it.image} alt="" className="w-full h-full object-contain p-1.5" />
              ) : (
                <div className="w-full h-full grid place-items-center text-charcoal/15">
                  <svg width="55%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink text-[13.5px] leading-snug truncate">{it.designation}</p>
              {it.gammeNom && <p className="text-[12px] text-ink-soft mt-0.5">Gamme {it.gammeNom}</p>}
              {it.config && <p className="text-[12px] text-ink-soft mt-0.5 truncate">{it.config}</p>}

              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex items-center border border-line rounded-full overflow-hidden shrink-0">
                  <button onClick={() => updateQuantite(it.id, it.quantite - 1)} className="w-7 h-7 grid place-items-center text-ink hover:bg-surface-2 transition text-[13px]">−</button>
                  <span className="w-6 text-center text-[13px] font-semibold">{it.quantite}</span>
                  <button onClick={() => updateQuantite(it.id, it.quantite + 1)} className="w-7 h-7 grid place-items-center text-ink hover:bg-surface-2 transition text-[13px]">+</button>
                </div>
                <span className="text-[12.5px] font-semibold text-ink whitespace-nowrap">
                  {it.prixIndicatif != null ? fmt(it.prixIndicatif * it.quantite) : "Sur devis"}
                </span>
              </div>
            </div>

            <button onClick={() => removeDevis(it.id)} title="Retirer"
              className="text-ink-soft hover:text-orange transition shrink-0 self-start">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="px-6 py-5 bg-surface-2/50 border-t border-line">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] text-ink-soft">{tousChiffres ? "Total indicatif" : "Estimation partielle"}</span>
          <span className="font-display font-bold text-lg">{tousChiffres ? fmt(totalIndicatif) : `${fmt(totalIndicatif)}+`}</span>
        </div>
        <p className="text-[11.5px] text-ink-soft mt-1.5">Prix indicatif hors remise et frais annexes — le devis final fera foi.</p>
        <Link href="/catalogue" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-orange hover:text-orange-dark transition mt-3">
          + Ajouter d'autres produits
        </Link>
      </div>
    </div>
  );
}