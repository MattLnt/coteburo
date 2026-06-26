const STEPS = [
  { n: "01", title: "Étude de faisabilité", text: "Analyse de vos besoins, dans le respect de l'identité et de la singularité de votre entreprise.", icon: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>) },
  { n: "02", title: "Étude d'aménagement", text: "Implantation, colorimétrie et signalétique pour des espaces cohérents et inspirants.", icon: (<><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></>) },
  { n: "03", title: "Réalisation du plan", text: "Plans 2D / 3D, puis livraison et montage clés en main dans vos locaux.", icon: (<><path d="m20 6-11 11-5-5" /></>) },
];

export default function Steps() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Notre méthode</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl mt-1.5">Votre projet en 3 étapes</h2>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {STEPS.map((s) => (
          <div key={s.n} className="relative rounded-3xl bg-surface border border-line p-8 hover:border-orange transition">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-orange text-5xl leading-none">{s.n}</span>
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-orange-tint text-orange-dark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              </span>
            </div>
            <h3 className="font-display font-bold text-ink text-xl mt-6">{s.title}</h3>
            <p className="text-ink-soft text-[14.5px] mt-2.5 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}