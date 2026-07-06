"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import FinitionSelect from "@/components/cart/FinitionSelect";
import { decomposerFinition, nomsNiveaux, optionsNiveau, recomposerFinition } from "@/lib/finitions";

export default function ProductBuy({ produit, finitions = [] }) {
  const { addItem } = useCart();
  const [choix, setChoix] = useState([]);   // niveaux choisis successivement
  const [qty, setQty] = useState(1);
  const [ajoute, setAjoute] = useState(false);

  // Nombre de niveaux (basé sur la 1re finition)
  const nbNiveaux = useMemo(() => {
    if (finitions.length === 0) return 0;
    return decomposerFinition(finitions[0]).length;
  }, [finitions]);

  const labels = useMemo(() => nomsNiveaux(nbNiveaux), [nbNiveaux]);

  const aFinitions = finitions.length > 0 && nbNiveaux > 0;
  const finitionComplete = !aFinitions || choix.length === nbNiveaux;

  // Niveaux à afficher : tous ceux déjà ouverts (choix faits) + le prochain
  const niveauxAffiches = [];
  for (let i = 0; i <= choix.length && i < nbNiveaux; i++) {
    niveauxAffiches.push({
      index: i,
      label: labels[i],
      options: optionsNiveau(finitions, choix.slice(0, i)),
      valeur: choix[i] || "",
    });
  }

  const choisir = (index, valeur) => {
    setAjoute(false);
    setChoix((prev) => {
      const next = prev.slice(0, index);
      if (valeur) next[index] = valeur;
      return next;
    });
  };

  const handleAdd = () => {
    if (!finitionComplete) return;
    const finition = aFinitions ? recomposerFinition(choix) : null;
    addItem(produit, finition, qty);
    setAjoute(true);
    setTimeout(() => setAjoute(false), 2500);
  };

  return (
    <div className="mt-6">
      {aFinitions && (
        <div className="space-y-3">
          {niveauxAffiches.map((niv) => (
            <FinitionSelect
              key={niv.index}
              label={niv.label}
              value={niv.valeur}
              options={niv.options}
              onChange={(v) => choisir(niv.index, v)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <div className="flex items-center rounded-full border border-line shrink-0">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-11 grid place-items-center text-lg hover:text-orange">−</button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="h-11 w-11 grid place-items-center text-lg hover:text-orange">+</button>
        </div>
        <button
          onClick={handleAdd}
          disabled={!finitionComplete}
          className={`flex-1 rounded-full font-semibold px-6 py-3.5 transition ${
            !finitionComplete
              ? "bg-surface-2 text-ink-soft cursor-not-allowed"
              : ajoute
              ? "bg-[#249e7c] text-white"
              : "bg-orange text-white hover:bg-orange-dark"
          }`}
        >
          {ajoute ? "✓ Ajouté au panier" : !finitionComplete ? "Choisissez une finition" : "Ajouter au panier"}
        </button>
      </div>

      <Link href="/contact" className="mt-3 block text-center rounded-full border border-line font-semibold px-6 py-3.5 hover:bg-ink hover:text-white transition">Demander un devis pour ce produit</Link>
    </div>
  );
}