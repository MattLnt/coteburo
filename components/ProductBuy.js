"use client";
import { useState } from "react";
import Link from "next/link";

const FINITIONS = [
  { name: "Noir", color: "#23262A" },
  { name: "Gris anthracite", color: "#5C616A" },
  { name: "Bleu pétrole", color: "#3C6E8F" },
  { name: "Vert sauge", color: "#7E8B6A" },
];

export default function ProductBuy() {
  const [finition, setFinition] = useState(0);
  const [qty, setQty] = useState(1);

  return (
    <div className="mt-6">
      <div>
        <p className="text-[13px] font-semibold mb-2">Finition : <span className="font-normal text-ink-soft">{FINITIONS[finition].name}</span></p>
        <div className="flex gap-3">
          {FINITIONS.map((f, i) => (
            <button key={f.name} onClick={() => setFinition(i)} aria-label={f.name} className={`h-9 w-9 rounded-full transition ${i === finition ? "ring-2 ring-orange ring-offset-2 ring-offset-[#f7f4ef]" : "ring-1 ring-line"}`} style={{ background: f.color }} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <div className="flex items-center rounded-full border border-line">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-11 grid place-items-center text-lg hover:text-orange">−</button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="h-11 w-11 grid place-items-center text-lg hover:text-orange">+</button>
        </div>
        <button className="flex-1 rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Ajouter au panier</button>
      </div>

      <Link href="/contact" className="mt-3 block text-center rounded-full border border-line font-semibold px-6 py-3.5 hover:bg-ink hover:text-white transition">Demander un devis pour ce produit</Link>
    </div>
  );
}