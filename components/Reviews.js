const REVIEWS = [
  { stars: 5, text: "Travail sérieux et très bon suivi de dossier et de chantier. J'ai apprécié tout le conseil pour bien cibler nos besoins. Excellente prestation, je recommande !", name: "Chantal C.", role: "Gérante · Aix-en-Provence", initial: "C" },
  { stars: 5, text: "Conseillère professionnelle, attentive et impliquée du début à la fin. Pleinement satisfait de cette collaboration et du mobilier livré.", name: "Yvan G.", role: "Directeur · Marseille", initial: "Y" },
  { stars: 5, text: "Excellent conseil sur l'implantation, de la réactivité et un bon rapport qualité-prix. Toute l'équipe a été au top.", name: "AP Ressources", role: "Responsable RH", initial: "A" },
];

function Stars({ n }) {
  return (
    <div className="flex gap-0.5 text-orange">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} className="w-[14px] h-[14px] sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5L6.7 13.7 1.4 9.1l7-.6z" /></svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 mb-4 sm:mb-8">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">★ 4,9 / 5 sur Google</p>
        <h2 className="font-display font-bold text-ink text-[21px] sm:text-3xl mt-1 sm:mt-1.5">Ce qu&apos;en disent nos clients</h2>
      </div>

      {/* Défilement horizontal sur mobile : trois avis empilés font beaucoup
          de texte à faire défiler avant la suite de la page. */}
      <div className="mx-auto max-w-[1400px] flex md:grid md:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto md:overflow-visible px-5 sm:px-7 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none]">
        {REVIEWS.map((r, i) => (
          <div key={i} className="shrink-0 md:shrink w-[280px] md:w-auto rounded-[18px] sm:rounded-3xl bg-surface border border-line p-5 sm:p-7 flex flex-col [scroll-snap-align:start]">
            <Stars n={r.stars} />
            <p className="text-ink text-[13.5px] sm:text-[15px] leading-relaxed mt-3 sm:mt-4 flex-1">« {r.text} »</p>
            <div className="flex items-center gap-3 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-line">
              <span className="grid place-items-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-tint text-orange-dark font-display font-bold text-[14px] sm:text-base shrink-0">{r.initial}</span>
              <div className="min-w-0">
                <p className="font-display font-bold text-ink text-[13px] sm:text-sm leading-tight">{r.name}</p>
                <p className="text-ink-soft text-[11px] sm:text-xs mt-0.5 truncate">{r.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}