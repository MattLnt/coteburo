import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CatalogueFilters from "@/components/CatalogueFilters";

const CATS = {
  sieges: "Sièges & fauteuils",
  bureaux: "Bureaux",
  tables: "Tables de réunion",
  rangements: "Rangements",
  acoustique: "Acoustique",
  accueil: "Mobilier d'accueil",
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const key = slug?.[0];
  const titre = (key && CATS[key]) || "Catalogue";
  return { title: titre, alternates: { canonical: key ? `/catalogue/${key}` : "/catalogue" } };
}

export default async function CataloguePage({ params }) {
  const { slug } = await params;
  const key = slug?.[0];
  const titre = (key && CATS[key]) || "Tout le catalogue";

  const g = "https://images.unsplash.com/photo-1750306957077-b74e45fe1819?auto=format&fit=crop&w=620&q=80";
  const gr = "https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?auto=format&fit=crop&w=620&q=80";
  const b = "https://images.unsplash.com/photo-1685009336312-a3736e898268?auto=format&fit=crop&w=620&q=80";

  const PRODUCTS = [
    { name: "Fauteuil ergonomique Atlas", brand: "OfficePro", attr: "Dossier maille · accoudoirs 4D", price: "263,20 €", oldPrice: "329,00 €", badge: { type: "promo", label: "-20%" }, image: g },
    { name: "Fauteuil direction Lisbonne", brand: "Buronomic", attr: "Cuir pleine fleur · têtière", price: "612,00 €", badge: { type: "stock", label: "En stock" }, image: gr },
    { name: "Chaise visiteur Nido", brand: "Sokoa", attr: "Piètement luge · tissu recyclé", price: "148,00 €", image: b },
    { name: "Siège opératif Pulse", brand: "OfficePro", attr: "Synchrone · réglage lombaire", price: "219,00 €", badge: { type: "stock", label: "En stock" }, image: gr },
    { name: "Chaise réunion Taurus", brand: "Buronomic", attr: "Empilable · 4 pieds chromés", price: "52,70 €", oldPrice: "62,00 €", badge: { type: "promo", label: "-15%" }, image: b },
    { name: "Fauteuil ergonomique Horra", brand: "Sokoa", attr: "Mécanisme synchrone · maille", price: "389,00 €", badge: { type: "stock", label: "En stock" }, image: g },
    { name: "Tabouret haut Stand", brand: "OfficePro", attr: "Assis-debout · repose-pieds", price: "174,00 €", image: b },
    { name: "Fauteuil direction Filo", brand: "Buronomic", attr: "Structure noire · cuir noir", price: "405,00 €", oldPrice: "540,00 €", badge: { type: "promo", label: "-25%" }, image: g },
    { name: "Chaise polyvalente Vence", brand: "Sokoa", attr: "4 pieds · coque colorée", price: "132,00 €", badge: { type: "stock", label: "En stock" }, image: gr },
  ];

  return (
    <main>
      <div className="mx-auto max-w-[1240px] px-5 sm:px-7">
        <div className="pt-6 pb-2 text-sm text-ink-soft">
          <Link href="/" className="hover:text-orange">Accueil</Link> / <Link href="/catalogue" className="hover:text-orange">Catalogue</Link>
          {key && <> / <span className="text-ink">{titre}</span></>}
        </div>
        <div className="pt-2 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Catalogue</p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3">{titre}</h1>
          <p className="text-ink-soft text-lg mt-4 max-w-[560px]">
            Du fauteuil de direction à la chaise visiteur : des assises confortables, ergonomiques et design.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
        <div className="grid lg:grid-cols-[268px_1fr] gap-8 items-start">
          <CatalogueFilters />

          <div>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <p className="text-sm text-ink-soft"><b className="text-ink">{PRODUCTS.length}</b> produits</p>
              <div className="flex items-center gap-2 bg-surface border border-line rounded-full px-4 py-2.5 text-sm font-medium">
                Trier : Pertinence
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PRODUCTS.map((p) => (
                <ProductCard key={p.name} href={"/produit/" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")} {...p} />
              ))}
            </div>

            <div className="flex justify-center gap-2 mt-10">
              {["‹", "1", "2", "3", "›"].map((n, i) => (
                <span key={i} className={`grid h-[42px] w-[42px] place-items-center rounded-xl border border-line text-sm font-semibold cursor-pointer ${n === "1" ? "bg-orange border-orange text-white" : "bg-surface hover:border-ink"}`}>{n}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-20">
        <div className="rounded-[24px] bg-charcoal text-white p-9 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div>
            <h3 className="font-display font-bold text-2xl">Un projet d&apos;aménagement complet ?</h3>
            <p className="text-[#bfc4cb] mt-1.5">Au-delà de la boutique, nos experts vous accompagnent sur devis avec plan 3D, livraison et montage.</p>
          </div>
          <Link href="/contact" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3.5 hover:bg-orange-dark transition">Demander un devis →</Link>
        </div>
      </section>
    </main>
  );
}