import Link from "next/link";
import ProductCard from "@/components/ProductCard";

export default function Featured() {
  const PRODUCTS = [
    { name: "Fauteuil ergonomique Atlas", brand: "OfficePro", attr: "Dossier maille · accoudoirs 4D", price: "263,20 €", oldPrice: "329,00 €", badge: { type: "promo", label: "-20%" }, image: "https://images.unsplash.com/photo-1750306957077-b74e45fe1819?auto=format&fit=crop&w=620&q=80" },
    { name: "Fauteuil direction Lisbonne", brand: "Buronomic", attr: "Cuir pleine fleur · têtière", price: "612,00 €", badge: { type: "stock", label: "En stock" }, image: "https://images.unsplash.com/photo-1685009336312-a3736e898268?auto=format&fit=crop&w=620&q=80" },
    { name: "Siège ergonomique Horra", brand: "Sokoa", attr: "Mécanisme synchrone · maille", price: "389,00 €", image: "https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?auto=format&fit=crop&w=620&q=80" },
    { name: "Bureau assis-debout Élévation", brand: "Buronomic", attr: "Plateau chêne · L120 × P80", price: "498,00 €", badge: { type: "stock", label: "En stock" }, image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=620&q=80" },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-9">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Sélection</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[42px] mt-2">Les préférés de nos clients</h2>
        </div>
        <Link href="/catalogue" className="shrink-0 font-semibold text-orange inline-flex items-center gap-1.5 group">
          Voir tout <span className="group-hover:translate-x-1 transition">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.name} href="/catalogue/sieges" {...p} />
        ))}
      </div>
    </section>
  );
}