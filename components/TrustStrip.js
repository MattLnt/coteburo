const ITEMS = [
  { title: "Conseil sur-mesure", sub: "Un expert dédié à votre projet", icon: (<><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></>) },
  { title: "Plan 3D offert", sub: "Projetez vos futurs espaces", icon: (<><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></>) },
  { title: "Livraison & montage", sub: "Installé par nos équipes", icon: (<><path d="M3 7h13v8H3z" /><path d="M16 10h3l2 3v2h-5z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>) },
  { title: "Garantie 7 ans", sub: "Extension de 2 ans offerte", icon: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>) },
  { title: "Paiement sécurisé", sub: "CB & virement · SSL", icon: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>) },
];

export default function TrustStrip() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="rounded-[20px] sm:rounded-3xl bg-charcoal px-4 py-6 sm:px-10 sm:py-9">
        {/* Une colonne sur mobile : à deux, le titre et le sous-titre se cassent
            sur trois lignes à côté d'une icône de 48px. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 sm:gap-y-8">
          {ITEMS.map((it) => (
            <div key={it.title} className="flex items-center gap-3 sm:gap-3.5">
              <span className="shrink-0 grid place-items-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange/15 text-orange">
                <svg className="w-[19px] h-[19px] sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
              </span>
              <div className="min-w-0">
                <p className="font-display font-bold text-white text-[13.5px] sm:text-[15px] leading-tight">{it.title}</p>
                <p className="text-[#9aa0a8] text-[11.5px] sm:text-[12.5px] mt-0.5 leading-snug">{it.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}