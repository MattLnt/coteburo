"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import { urlProduit } from "@/lib/catalogue";

const fmt = (n) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const ICONE_MEUBLE = (<><path d="M7 11V6a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 6v5" /><path d="M5 11h14l-1.2 5H6.2z" /><path d="M12 16v4" /></>);
const ICONE_POUBELLE = (<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></>);

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
  const nbArticles = items.reduce((n, it) => n + it.quantite, 0);

  // Évite le flash "panier vide" avant chargement du localStorage
  if (!loaded) {
    return (
      <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-12 sm:py-20">
        <div className="h-64 rounded-2xl border border-line bg-surface animate-pulse" />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-10 sm:py-16">
        <div className="pt-2 pb-2 text-[11.5px] sm:text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Panier</span>
        </div>
        <div className="rounded-[20px] sm:rounded-[24px] border border-line bg-surface p-8 sm:p-16 text-center mt-4 sm:mt-6">
          <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-surface-2 text-ink-soft">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>
          </div>
          <h1 className="font-display font-bold text-[22px] sm:text-3xl">Votre panier est vide</h1>
          <p className="text-ink-soft mt-2 max-w-md mx-auto text-[13px] sm:text-base">Parcourez notre catalogue pour découvrir nos mobiliers de bureau et ajoutez vos articles au panier.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-7 py-3.5 mt-6 sm:mt-7 text-[13.5px] sm:text-base hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
        </div>
      </main>
    );
  }

  // Sélecteur de quantité — taille réduite pour les options.
  const selecteurQte = (it, petit) => (
    <div className="flex items-center rounded-full border border-line shrink-0">
      <button onClick={() => updateQuantite(it.id, it.quantite - 1)} disabled={it.quantite <= 1}
        className={`grid place-items-center hover:text-orange disabled:opacity-30 text-ink-soft ${petit ? "h-7 w-7 text-[13px]" : "h-8 w-8 sm:h-9 sm:w-9 text-base"}`}>−</button>
      <span className={`text-center font-semibold ${petit ? "w-5 text-[12.5px]" : "w-6 sm:w-9 text-[13.5px] sm:text-sm"}`}>{it.quantite}</span>
      <button onClick={() => updateQuantite(it.id, it.quantite + 1)}
        className={`grid place-items-center hover:text-orange text-ink-soft ${petit ? "h-7 w-7 text-[13px]" : "h-8 w-8 sm:h-9 sm:w-9 text-base"}`}>+</button>
    </div>
  );

  const boutonSuppr = (it, petit) => (
    <button onClick={() => removeItem(it.id)} aria-label="Retirer"
      className={`shrink-0 grid place-items-center rounded-lg text-ink-soft/70 hover:text-orange hover:bg-surface-2 transition ${petit ? "h-7 w-7" : "h-8 w-8"}`}>
      <svg width={petit ? 15 : 17} height={petit ? 15 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{ICONE_POUBELLE}</svg>
    </button>
  );

  // Ligne produit (parent) — image et texte en haut, quantité et prix en bas.
  const ligneParent = (it) => {
    const href = urlProduit({ categorieSlug: it.categorieSlug, sousCategorieSlug: it.sousCategorieSlug, slug: it.slug });
    return (
      <div key={it.id} className="rounded-2xl border border-line bg-surface p-3 sm:p-5">
        <div className="flex gap-3 sm:gap-5">
          <Link href={href} className="shrink-0 w-[76px] h-[76px] sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-surface-2 grid place-items-center">
            {it.image ? (
              <Image src={it.image} alt={it.designation} width={112} height={112} className="w-full h-full object-cover" />
            ) : (
              <svg width="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft/40">{ICONE_MEUBLE}</svg>
            )}
          </Link>
          <div className="flex-1 min-w-0 flex justify-between gap-2.5">
            <div className="min-w-0">
              {it.marque && <p className="text-[9.5px] sm:text-[11px] font-bold uppercase tracking-wide text-orange">{it.marque}</p>}
              <Link href={href} className="block font-semibold text-ink text-[13.5px] sm:text-base hover:text-orange transition line-clamp-2 leading-snug mt-0.5">{it.designation}</Link>
              {it.finition && <p className="text-[11.5px] sm:text-[12.5px] text-ink-soft mt-1">{it.finition}</p>}
            </div>
            {boutonSuppr(it)}
          </div>
        </div>

        {/* Quantité et prix sur leur propre ligne : à droite du texte, le prix
            était écrasé sur un écran étroit. */}
        <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 sm:pt-3 border-t border-line sm:border-none">
          {selecteurQte(it)}
          <div className="text-right">
            <p className="font-display font-bold text-ink text-[15px] sm:text-base">{fmt(it.prix * it.quantite)} <span className="text-[10.5px] sm:text-[12px] font-normal text-ink-soft">HT</span></p>
            {it.quantite > 1 && <p className="text-[10.5px] sm:text-[12px] text-ink-soft mt-0.5">{fmt(it.prix)} l&apos;unité</p>}
          </div>
        </div>
      </div>
    );
  };

  // Ligne option — trait de liaison à gauche pour montrer le rattachement au parent.
  const ligneOption = (it) => (
    <div key={it.id} className="ml-4 sm:ml-14 relative">
      <span className="absolute -left-2.5 top-0 bottom-6 w-[1.5px] bg-line rounded-full sm:hidden" />
      <div className="rounded-xl border border-line bg-surface sm:bg-surface-2/40 p-2.5 sm:px-3 sm:py-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="shrink-0 w-[46px] h-[46px] sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-surface-2 grid place-items-center">
            {it.image ? (
              <Image src={it.image} alt={it.designation} width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <svg width="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft/40">{ICONE_MEUBLE}</svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-orange-dark bg-orange-tint rounded px-1.5 py-0.5">Option</span>
            <p className="font-semibold text-ink text-[12.5px] sm:text-[13.5px] leading-snug mt-1 line-clamp-2 sm:truncate">{it.designation}</p>
          </div>

          {/* Sur desktop, quantité et prix restent sur la même ligne */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {selecteurQte(it, true)}
            <p className="font-display font-bold text-ink text-[14px] whitespace-nowrap min-w-[92px] text-right">{fmt(it.prix * it.quantite)} <span className="text-[11px] font-normal text-ink-soft">HT</span></p>
          </div>

          {boutonSuppr(it, true)}
        </div>

        {/* Sur mobile, quantité et prix passent en dessous */}
        <div className="sm:hidden flex items-center justify-between gap-3 mt-2.5 pt-2 border-t border-line">
          {selecteurQte(it, true)}
          <p className="font-display font-bold text-ink text-[13.5px] whitespace-nowrap">{fmt(it.prix * it.quantite)} <span className="text-[10px] font-normal text-ink-soft">HT</span></p>
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
    <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-6 sm:py-14 pb-[140px] lg:pb-14">
      <div className="pb-2 text-[11.5px] sm:text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">Panier</span>
      </div>
      <h1 className="font-display font-bold text-[25px] sm:text-4xl">Mon panier</h1>
      <p className="text-ink-soft text-[12.5px] sm:text-base mt-1 mb-5 sm:mb-8">{nbArticles} article{nbArticles > 1 ? "s" : ""}</p>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4 lg:gap-8 items-start">
        {/* Liste des articles */}
        <div className="flex flex-col gap-2.5 sm:gap-4">
          {lignes}
          <Link href="/catalogue" className="text-orange font-semibold hover:text-orange-dark transition mt-1 inline-flex items-center justify-center lg:justify-start gap-2 text-[13px] sm:text-base py-2">← Continuer mes achats</Link>
        </div>

        {/* Récapitulatif */}
        <aside className="lg:sticky lg:top-24 rounded-2xl lg:rounded-[20px] border border-line bg-surface p-4 sm:p-6 order-first lg:order-none">
          <h2 className="font-display font-bold text-[15.5px] sm:text-xl mb-3.5 sm:mb-5">Récapitulatif</h2>
          <div className="flex flex-col gap-2.5 sm:gap-3 text-[12.5px] sm:text-sm">
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
            <div className="h-px bg-line my-1 sm:my-2" />
            <div className="flex justify-between items-center">
              <span className="font-display font-bold text-[15px] sm:text-lg">Total TTC</span>
              <span className="font-display font-bold text-[19px] sm:text-lg text-orange">{fmt(totalTTCFinal)}</span>
            </div>
          </div>

          {!chargementFrais && fraisLivraison > 0 && resteAvantGratuit > 0 && (
            <p className="text-[11.5px] sm:text-[12.5px] text-orange-dark bg-orange-tint rounded-xl px-3.5 py-2.5 mt-3.5 sm:mt-4 leading-relaxed">
              Plus que <strong>{fmt(resteAvantGratuit)}</strong> d&apos;achat pour bénéficier de la livraison offerte !
            </p>
          )}

          {/* Boutons desktop — la barre fixe prend le relais sur mobile */}
          <div className="hidden lg:block">
            <Link href="/commande" className="block text-center rounded-full bg-orange text-white font-semibold px-6 py-3.5 mt-6 hover:bg-orange-dark transition">Passer la commande →</Link>
            <Link href="/contact" className="block text-center rounded-full border border-line font-semibold px-6 py-3 mt-3 hover:bg-ink hover:text-white transition">Demander un devis</Link>
          </div>

          <p className="hidden lg:block text-[12px] text-ink-soft text-center mt-4 leading-relaxed">Livraison et montage sur devis · Garantie 7 ans · Paiement sécurisé</p>
        </aside>
      </div>

      {/* ══ Barre de commande fixe (mobile) ══
          Sans elle, il faut faire défiler tous les articles pour atteindre
          le bouton de commande. */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <p className="text-[10.5px] text-ink-soft">Total TTC</p>
            <p className="font-display font-bold text-[20px] text-ink leading-tight">{fmt(totalTTCFinal)}</p>
          </div>
          {!chargementFrais && fraisLivraison === 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e8f6f0] text-[#1f7a52] shrink-0">Livraison offerte</span>
          )}
        </div>

        <div className="flex gap-2">
          <Link href="/commande" className="flex-1 text-center rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px]">
            Passer la commande
          </Link>
          <Link href="/contact" aria-label="Demander un devis"
            className="w-12 grid place-items-center rounded-full border border-line bg-white text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>
          </Link>
        </div>
      </div>
    </main>
  );
}