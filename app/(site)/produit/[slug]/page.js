import Link from "next/link";
import ProductGallery from "@/components/ProductGallery";
import ProductBuy from "@/components/ProductBuy";
import ProductCard from "@/components/ProductCard";
import CtaBand from "@/components/CtaBand";

const g = "https://images.unsplash.com/photo-1750306957077-b74e45fe1819?auto=format&fit=crop&w=900&q=80";
const gr = "https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?auto=format&fit=crop&w=900&q=80";
const b = "https://images.unsplash.com/photo-1685009336312-a3736e898268?auto=format&fit=crop&w=900&q=80";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: "Fauteuil ergonomique Atlas", alternates: { canonical: `/produit/${slug}` } };
}

export default async function ProduitPage({ params }) {
  await params;

  const SPECS = [
    ["Marque", "OfficePro"],
    ["Gamme", "Sièges ergonomiques"],
    ["Dossier", "Maille respirante"],
    ["Mécanisme", "Synchrone"],
    ["Accoudoirs", "Réglables 4D"],
    ["Réglage lombaire", "Oui"],
    ["Charge max.", "120 kg"],
    ["Garantie", "7 ans"],
  ];

  const RELATED = [
    { name: "Fauteuil direction Lisbonne", brand: "Buronomic", attr: "Cuir pleine fleur · têtière", price: "612,00 €", badge: { type: "stock", label: "En stock" }, image: gr },
    { name: "Fauteuil ergonomique Horra", brand: "Sokoa", attr: "Mécanisme synchrone · maille", price: "389,00 €", image: g },
    { name: "Siège opératif Pulse", brand: "OfficePro", attr: "Synchrone · réglage lombaire", price: "219,00 €", badge: { type: "stock", label: "En stock" }, image: b },
  ];

  return (
    <main>
      <div className="mx-auto max-w-[1240px] px-5 sm:px-7 pt-6 pb-4 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <Link href="/catalogue" className="hover:text-orange">Catalogue</Link> / <Link href="/catalogue/sieges" className="hover:text-orange">Sièges</Link> / <span className="text-ink">Fauteuil ergonomique Atlas</span>
      </div>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <ProductGallery images={[g, gr, b]} alt="Fauteuil ergonomique Atlas" />

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">OfficePro</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">Fauteuil ergonomique Atlas</h1>
            <div className="flex items-center gap-2 mt-3 text-sm text-ink-soft"><span className="text-orange tracking-[1px]">★★★★★</span> 24 avis</div>

            <div className="flex items-end gap-3 mt-5 flex-wrap">
              <span className="font-display font-bold text-3xl">263,20 €</span>
              <span className="text-ink-soft">HT</span>
              <span className="text-ink-soft line-through">329,00 €</span>
              <span className="rounded-full bg-orange text-white text-xs font-bold px-2.5 py-1">-20%</span>
            </div>
            <p className="text-[13px] text-ink-soft mt-1">315,84 € TTC · éco-participation 1,20 €</p>

            <p className="text-ink-soft mt-5">Assise ergonomique au dossier en maille respirante, mécanisme synchrone et accoudoirs réglables 4D. Conçu pour le confort sur de longues journées de travail.</p>

            <ProductBuy />

            <div className="grid grid-cols-3 gap-3 mt-7 text-center text-[12px]">
              <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Livraison</span><span className="text-ink-soft">& montage</span></div>
              <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Garantie 7 ans</span><span className="text-ink-soft">offerte</span></div>
              <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">En stock</span><span className="text-ink-soft">exp. 24 h</span></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-7 py-14 border-t border-line">
          <h2 className="font-display font-bold text-2xl mb-5">Caractéristiques</h2>
          <div className="rounded-[24px] border border-line bg-surface overflow-hidden">
            {SPECS.map(([k, v], i) => (
              <div key={k} className={`flex justify-between px-6 py-3.5 text-sm ${i % 2 ? "bg-surface-2/40" : ""}`}>
                <span className="text-ink-soft">{k}</span><span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-7 py-14 border-t border-line">
          <h2 className="font-display font-bold text-2xl mb-6">Vous aimerez aussi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RELATED.map((p) => (
              <ProductCard key={p.name} href="/produit/fauteuil-direction-lisbonne" {...p} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}