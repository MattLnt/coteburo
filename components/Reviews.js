const REVIEWS = [
  { stars: 5, text: "Travail sérieux et très bon suivi de dossier et de chantier. J'ai apprécié tout le conseil pour bien cibler nos besoins. Excellente prestation, je recommande !", name: "Chantal C.", role: "Gérante · Aix-en-Provence", initial: "C" },
  { stars: 5, text: "Conseillère professionnelle, attentive et impliquée du début à la fin. Pleinement satisfait de cette collaboration et du mobilier livré.", name: "Yvan G.", role: "Directeur · Marseille", initial: "Y" },
  { stars: 5, text: "Excellent conseil sur l'implantation, de la réactivité et un bon rapport qualité-prix. Toute l'équipe a été au top.", name: "AP Ressources", role: "Responsable RH", initial: "A" },
];

function Stars({ n }) {
  return (
    <div className="flex gap-0.5 text-orange">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5L6.7 13.7 1.4 9.1l7-.6z" /></svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">★ 4,9 / 5 sur Google</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">Ce qu'en disent nos clients</h2>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {REVIEWS.map((r, i) => (
          <div key={i} className="rounded-3xl bg-surface border border-line p-7 flex flex-col">
            <Stars n={r.stars} />
            <p className="text-ink text-[15px] leading-relaxed mt-4 flex-1">« {r.text} »</p>
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-line">
              <span className="grid place-items-center w-10 h-10 rounded-full bg-orange-tint text-orange-dark font-display font-bold">{r.initial}</span>
              <div>
                <p className="font-display font-bold text-ink text-sm leading-tight">{r.name}</p>
                <p className="text-ink-soft text-xs mt-0.5">{r.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}