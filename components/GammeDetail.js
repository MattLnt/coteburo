"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";

const fmt = (n) => n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function GammeDetail({ gamme }) {
  const { add } = useCart();
  const produits = gamme.produits || [];

  // Galerie
  const images = gamme.images?.length ? gamme.images : (gamme.imageUrl ? [gamme.imageUrl] : []);
  const [imgActive, setImgActive] = useState(0);

  // Étape 1 : dimension (= produit / code racine)
  const [produitId, setProduitId] = useState(produits[0]?.codeRacine || null);
  const produit = useMemo(() => produits.find((p) => p.codeRacine === produitId), [produits, produitId]);

  // Étape 2 : finition (= variante du produit choisi)
  const finitions = produit?.variantes || [];
  const [codeArticle, setCodeArticle] = useState(null);
  const variante = useMemo(() => finitions.find((v) => v.codeArticle === codeArticle), [finitions, codeArticle]);

  // Quand on change de dimension, on réinitialise la finition
  const choisirProduit = (cr) => {
    setProduitId(cr);
    setCodeArticle(null);
  };

  // Prix affiché : celui de la variante choisie, sinon prix mini du produit
  const prixAffiche = variante?.prixPublicHT ?? produit?.prixPublicHT;
  const ttc = prixAffiche != null ? prixAffiche * 1.2 : null;

  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);

  const peutAjouter = produit && (finitions.length === 0 || variante);

  const ajouterPanier = () => {
    if (!peutAjouter) return;
    add({
      codeRacine: produit.codeRacine,
      codeArticle: variante?.codeArticle || produit.codeRacine,
      designation: produit.designation,
      marque: gamme.marque?.nom || "Buronomic",
      finition: variante?.finition || null,
      prix: prixAffiche,
      image: images[0] || null,
      quantite: qte,
    });
    setAjoute(true);
    setTimeout(() => setAjoute(false), 2000);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-10 items-start">
      {/* Galerie */}
      <div>
        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)] border border-line">
          {images[imgActive] ? (
            <img src={images[imgActive]} alt={gamme.nom} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-charcoal/20">
              <svg width="35%" viewBox="0 0 120 140" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M38 22c0-5 4-9 9-9h26c5 0 9 4 9 9v40H38z" /><path d="M32 62h56l-4 20H36z" /><path d="M60 82v28" /><path d="M40 130l20-16 20 16" /></svg>
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2.5 mt-3 flex-wrap">
            {images.map((img, i) => (
              <button key={i} onClick={() => setImgActive(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${i === imgActive ? "border-orange" : "border-line hover:border-orange/40"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Infos + sélecteur */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{gamme.categorie?.nom}</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">{gamme.nom}</h1>
        {gamme.descriptif && <p className="text-ink-soft mt-4 leading-relaxed">{gamme.descriptif}</p>}

        {/* Prix */}
        <div className="flex items-end gap-3 mt-6 flex-wrap">
          <span className="font-display font-bold text-3xl">{fmt(prixAffiche)}</span>
          <span className="text-ink-soft mb-1">HT</span>
          {ttc != null && <span className="text-[13px] text-ink-soft mb-1.5">· {fmt(ttc)} TTC</span>}
        </div>

        {/* Étape 1 : Dimension / Modèle */}
        {produits.length > 0 && (
          <div className="mt-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="grid place-items-center w-5 h-5 rounded-full bg-orange text-white text-[11px] font-bold">1</span>
              <p className="font-semibold text-ink text-[15px]">Choisissez le modèle</p>
            </div>
            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {produits.map((p) => {
                const on = p.codeRacine === produitId;
                return (
                  <button key={p.codeRacine} onClick={() => choisirProduit(p.codeRacine)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition ${on ? "border-orange bg-orange-tint" : "border-line hover:border-orange/50"}`}>
                    <span className={`font-medium ${on ? "text-orange-dark" : "text-ink"}`}>{p.designation}</span>
                    <span className="block text-[12px] text-ink-soft mt-0.5">Réf. {p.codeRacine} · à partir de {fmt(p.prixPublicHT)} HT</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 2 : Finition */}
        {produit && finitions.length > 0 && (
          <div className="mt-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="grid place-items-center w-5 h-5 rounded-full bg-orange text-white text-[11px] font-bold">2</span>
              <p className="font-semibold text-ink text-[15px]">Choisissez la finition</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {finitions.map((v) => {
                const on = v.codeArticle === codeArticle;
                return (
                  <button key={v.codeArticle} onClick={() => setCodeArticle(v.codeArticle)}
                    className={`px-3.5 py-2 rounded-lg border text-[13px] font-medium transition ${on ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50"}`}>
                    {v.finition || "Standard"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantité + panier */}
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <div className="flex items-center border border-line rounded-full overflow-hidden">
            <button onClick={() => setQte((q) => Math.max(1, q - 1))} className="w-10 h-11 grid place-items-center text-ink hover:bg-surface-2 transition">−</button>
            <span className="w-10 text-center font-semibold">{qte}</span>
            <button onClick={() => setQte((q) => q + 1)} className="w-10 h-11 grid place-items-center text-ink hover:bg-surface-2 transition">+</button>
          </div>
          <button onClick={ajouterPanier} disabled={!peutAjouter}
            className="flex-1 min-w-[200px] rounded-full bg-charcoal text-white font-semibold px-8 py-3.5 hover:bg-[#2d3035] transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
            {ajoute ? "✓ Ajouté au panier" : "Ajouter au panier"}
          </button>
        </div>
        {!peutAjouter && finitions.length > 0 && (
          <p className="text-[12.5px] text-ink-soft mt-2">Sélectionnez une finition pour ajouter au panier.</p>
        )}

        {/* Réassurance */}
        <div className="grid grid-cols-3 gap-3 mt-8 text-center text-[12px]">
          <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Livraison</span><span className="text-ink-soft">& montage</span></div>
          <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Garantie 7 ans</span><span className="text-ink-soft">offerte</span></div>
          <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Conseil 3D</span><span className="text-ink-soft">sur devis</span></div>
        </div>
      </div>
    </div>
  );
}