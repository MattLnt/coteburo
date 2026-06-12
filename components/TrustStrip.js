export default function TrustStrip() {
  const ITEMS = [
    { title: "Conseil sur-mesure", sub: "Un expert dédié à votre projet", icon: (<><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></>) },
    { title: "Plan 3D offert", sub: "Projetez vos futurs espaces", icon: (<><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></>) },
    { title: "Livraison & montage", sub: "Installation par nos équipes", icon: (<><path d="M3 7h13v8H3z" /><path d="M16 10h3l2 3v2h-5z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>) },
    { title: "Garantie 7 ans", sub: "Extension de 2 ans offerte", icon: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>) },
    { title: "Paiement sécurisé", sub: "Cryptage SSL · CB & virement", icon: (<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>) },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
      <div className="bg-charcoal text-white rounded-[24px] p-8 sm:p-9">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-7 gap-x-3">
          {ITEMS.map((it, i) => (
            <div key={it.title} className={`flex flex-col items-center text-center gap-2.5 px-2 ${i !== ITEMS.length - 1 ? "lg:border-r lg:border-white/10" : ""}`}>
              <span className="text-orange">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
              </span>
              <span className="font-display font-bold text-[15px]">{it.title}</span>
              <span className="text-[12.5px] text-[#aab0b8] leading-snug">{it.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}