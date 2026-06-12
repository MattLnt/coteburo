import Image from "next/image";
import Link from "next/link";

export default function Realisations() {
  const ITEMS = [
    { sector: "Cabinet médical", title: "Sophia Santé", client: "Centre de consultations · 320 m²", image: "https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=900&q=80" },
    { sector: "Open space", title: "Provence Avocats", client: "Cabinet d'avocats · 18 postes", image: "https://images.unsplash.com/photo-1716703435453-a7733d600d68?auto=format&fit=crop&w=900&q=80" },
    { sector: "Domaine viticole", title: "Château Mistral", client: "Bureaux & accueil · 240 m²", image: "https://images.unsplash.com/photo-1746021535490-cd4d7fe7ab2a?auto=format&fit=crop&w=900&q=80" },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-9">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos réalisations</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[42px] mt-2">Des espaces qui ont pris vie</h2>
          <p className="text-ink-soft mt-2.5 max-w-[520px]">Découvrez quelques aménagements livrés par nos équipes en région PACA.</p>
        </div>
        <Link href="/realisations" className="shrink-0 font-semibold text-orange inline-flex items-center gap-1.5 group">
          Toutes les réalisations <span className="group-hover:translate-x-1 transition">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ITEMS.map((it) => (
          <Link key={it.title} href="/realisations" className="group relative flex flex-col justify-end overflow-hidden rounded-[24px] border border-line aspect-[4/3.2]">
            <Image src={it.image} alt={it.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-charcoal/5 via-charcoal/30 to-charcoal/85" />
            <span className="absolute top-5 left-5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-orange">{it.sector}</span>
            <div className="relative p-6 text-white">
              <h3 className="font-display font-bold text-[22px]">{it.title}</h3>
              <p className="text-[13px] text-white/80 mt-1">{it.client}</p>
              <span className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold">Voir l&apos;aménagement <span className="group-hover:translate-x-1 transition">→</span></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}