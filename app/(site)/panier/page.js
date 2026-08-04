"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import { urlProduit } from "@/lib/catalogue";

const fmt = (n) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function PanierPage() {
  const { items, totalHT, updateQuantite, removeItem, loaded } = useCart();

  const tva = totalHT * 0.2;
  const totalTTCProduits = totalHT + tva;

  const [frais, setFrais] = useState(null); // { fraisLivraison, seuilLivraisonGratuite }
  const [chargementFrais, setChargementFrais] = useState(true);

  useEffect(() => {
    if (!loaded || items.length === 0) return;
    setChargementFrais(true);
    fetch(`/api/frais?totalTTC=${totalTTCProduits.toFixed(2)}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setFrais(data); })
      .catch(() => {})
      .finally(() => setChargementFrais(false));
  }, [loaded, items.length, totalTTCProduits]);

  const fraisLivraison = frais?.fraisLivraison ?? 0;
  const seuilLivraisonGratuite = frais?.seuilLivraisonGratuite ?? 500;
  const resteAvantGratuit = seuilLivraisonGratuite - totalTTCProduits;
  const totalTTCFinal = totalTTCProduits + fraisLivraison;

  // Évite le flash "panier vide" avant chargement du localStorage
  if (!loaded) {
    return (
      <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-20">
        <div className="h-64 rounded-2xl border border-line bg-surface animate-pulse" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-16">
        <div className="pt-4 pb-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Panier</span>
        </div>
        <div className="rounded-[24px] border border-line bg-surface p-12 sm:p-16 text-center mt-6">
          <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-surface-2 text-ink-soft">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">Votre panier est vide</h1>
          <p className="text-ink-soft mt-2 max-w-md mx-auto">Parcourez notre catalogue pour découvrir nos mobiliers de bureau et ajoutez vos articles au panier.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-7 py-3.5 mt-7 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
        </div>
      </main>
    );
  }

  // Ligne produit (parent) — carte complète.
  const ligneParent = (it) => {
    const href = urlProduit({ categorieSlug: it.categorieSlug, sousCategorieSlug: it.sousCategorieSlug, slug: it.slug });
    return (
      <div key={it.id} className="flex gap-4 sm:gap-5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <Link href={href} className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface-2 grid place-items-center">
          {it.image ? (
            <Image src={it.image} alt={it.designation} width={112} height={112} className="w-full h-full object-cover" />
          ) : (
            <svg width="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft/40"><path d="M7 11V6a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 6v5" /><path d="M5 11h14l-1.2 5H6.2z" /><path d="M12 16v4" /></svg>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-3">
            <div className="min-w-0">
              {it.marque && <p className="text-[11px] font-bold uppercase tracking-wide text-orange">{it.marque}</p>}
              <Link href={href} className="font-semibold text-ink hover:text-orange transition line-clamp-2 leading-snug">{it.designation}</Link>
              {it.finition && <p className="text-[12.5px] text-ink-soft mt-1">{it.finition}</p>}
            </div>
            <button onClick={() => removeItem(it.id)} aria-label="Retirer" className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-ink-soft hover:text-orange hover:bg-surface-2 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
            </button>
          </div>
          <div className="flex items-end justify-between gap-3 mt-3">
            <div className="flex items-center rounded-full border border-line">
              <button onClick={() => updateQuantite(it.id, it.quantite - 1)} className="h-9 w-9 grid place-items-center text-lg hover:text-orange disabled:opacity-30" disabled={it.quantite <= 1}>−</button>
              <span className="w-9 text-center font-semibold text-sm">{it.quantite}</span>
              <button onClick={() => updateQuantite(it.id, it.quantite + 1)} className="h-9 w-9 grid place-items-center text-lg hover:text-orange">+</button>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-ink">{fmt(it.prix * it.quantite)} <span className="text-[12px] font-normal text-ink-soft">HT</span></p>
              {it.quantite > 1 && <p className="text-[12px] text-ink-soft">{fmt(it.prix)} l'unité</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Ligne option — indentée sous le parent, compacte, une seule rangée.
  const ligneOption = (it) => (
    <div key={it.id} className="ml-6 sm:ml-14">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-surface-2 grid place-items-center">
          {it.image ? (
            <Image src={it.image} alt={it.designation} width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <svg width="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft/40"><path d="M7 11V6a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 6v5" /><path d="M5 11h14l-1.2 5H6.2z" /></svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-orange-dark bg-orange-tint rounded px-1.5 py-0.5">Option</span>
            <p className="font-semibold text-ink text-[13.5px] truncate">{it.designation}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center rounded-full border border-line">
            <button onClick={() => updateQuantite(it.id, it.quantite - 1)} className="h-7 w-7 grid place-items-center hover:text-orange disabled:opacity-30" disabled={it.quantite <= 1}>−</button>
            <span className="w-7 text-center font-semibold text-[13px]">{it.quantite}</span>
            <button onClick={() => updateQuantite(it.id, it.quantite + 1)} className="h-7 w-7 grid place-items-center hover:text-orange">+</button>
          </div>
          <p className="font-display font-bold text-ink text-[14px] whitespace-nowrap min-w-[92px] text-right">{fmt(it.prix * it.quantite)} <span className="text-[11px] font-normal text-ink-soft">HT</span></p>
          <button onClick={() => removeItem(it.id)} aria-label="Retirer" className="shrink-0 h-7 w-7 grid place-items-center rounded-lg text-ink-soft hover:text-orange hover:bg-surface-2 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
          </button>
        </div>
      </div>
    </div>
  );

  // Ordonne : chaque parent suivi de ses options ; les options orphelines (parent absent) en ligne simple.
  const parents = items.filter((it) => !it.parentId);
  const orphelines = items.filter((it) => it.parentId && !items.some((p) => p.id === it.parentId));
  const lignes = [];
  parents.forEach((p) => {
    lignes.push(ligneParent(p));
    items.filter((c) => c.parentId === p.id).forEach((c) => lignes.push(ligneOption(c)));
  });
  orphelines.forEach((o) => lignes.push(ligneParent(o)));

  return (
    <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-10 sm:py-14">
      <div className="pb-2 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Panier</span>
      </div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mb-8">Mon panier</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Liste des articles */}
        <div className="flex flex-col gap-4">
          {lignes}
          <Link href="/catalogue" className="text-orange font-semibold hover:text-orange-dark transition mt-1 inline-flex items-center gap-2">← Continuer mes achats</Link>
        </div>

        {/* Récapitulatif */}
        <aside className="lg:sticky lg:top-24 rounded-[20px] border border-line bg-surface p-6">
          <h2 className="font-display font-bold text-xl mb-5">Récapitulatif</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Sous-total HT</span>
              <span className="font-semibold">{fmt(totalHT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">TVA (20 %)</span>
              <span className="font-semibold">{fmt(tva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Livraison</span>
              {chargementFrais ? (
                <span className="text-ink-soft">Calcul en cours…</span>
              ) : fraisLivraison === 0 ? (
                <span className="font-semibold text-[#1f7a52]">Offerte</span>
              ) : (
                <span className="font-semibold">{fmt(fraisLivraison)}</span>
              )}
            </div>
            <div className="h-px bg-line my-2" />
            <div className="flex justify-between items-center">
              <span className="font-display font-bold text-lg">Total TTC</span>
              <span className="font-display font-bold text-lg text-orange">{fmt(totalTTCFinal)}</span>
            </div>
          </div>

          {!chargementFrais && fraisLivraison > 0 && resteAvantGratuit > 0 && (
            <p className="text-[12.5px] text-orange-dark bg-orange-tint rounded-xl px-3.5 py-2.5 mt-4 leading-relaxed">
              Plus que <strong>{fmt(resteAvantGratuit)}</strong> d'achat pour bénéficier de la livraison offerte !
            </p>
          )}

          <Link href="/commande" className="block text-center rounded-full bg-orange text-white font-semibold px-6 py-3.5 mt-6 hover:bg-orange-dark transition">Passer la commande →</Link>
          <Link href="/contact" className="block text-center rounded-full border border-line font-semibold px-6 py-3 mt-3 hover:bg-ink hover:text-white transition">Demander un devis</Link>

          <p className="text-[12px] text-ink-soft text-center mt-4 leading-relaxed">Livraison et montage sur devis · Garantie 7 ans · Paiement sécurisé</p>
        </aside>
      </div>
    </main>
  );
}