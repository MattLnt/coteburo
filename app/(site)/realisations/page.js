import Image from "next/image";
import CtaBand from "@/components/CtaBand";

export const metadata = {
  title: "Réalisations",
  description:
    "Découvrez les aménagements de bureaux réalisés par Côté BURO en région PACA : cabinets, open spaces, sièges sociaux et espaces d'accueil.",
  alternates: { canonical: "/realisations" },
};

export default function RealisationsPage() {
  const ITEMS = [
    { sector: "Cabinet médical", title: "Sophia Santé", client: "Centre de consultations · 320 m²", image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=900&q=80" },
    { sector: "Open space", title: "Provence Avocats", client: "Cabinet d'avocats · 18 postes", image: "https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=900&q=80" },
    { sector: "Domaine viticole", title: "Château Mistral", client: "Bureaux & accueil · 240 m²", image: "https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=900&q=80" },
    { sector: "Coworking", title: "La Ruche Aixoise", client: "Espace coworking · 40 postes", image: "https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=900&q=80" },
    { sector: "Siège social", title: "Groupe Calanques", client: "Réaménagement complet · 600 m²", image: "https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=900&q=80" },
    { sector: "Agence", title: "Méditerranée Immobilier", client: "Accueil & bureaux · 180 m²", image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=900&q=80" },
  ];

  return (
    <main>
      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pt-14 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos réalisations</p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3 max-w-3xl">Des espaces qui ont pris vie</h1>
        <p className="text-ink-soft text-lg mt-5 max-w-[580px]">
          Quelques aménagements livrés clés en main par nos équipes en région PACA — du cabinet au grand plateau.
        </p>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ITEMS.map((it) => (
            <div key={it.title} className="group relative flex flex-col justify-end overflow-hidden rounded-[24px] border border-line aspect-[4/3.2]">
              <Image src={it.image} alt={it.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-b from-charcoal/5 via-charcoal/30 to-charcoal/85" />
              <span className="absolute top-5 left-5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-orange">{it.sector}</span>
              <div className="relative p-6 text-white">
                <h3 className="font-display font-bold text-[22px]">{it.title}</h3>
                <p className="text-[13px] text-white/80 mt-1">{it.client}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}