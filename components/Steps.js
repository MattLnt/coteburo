export default function Steps() {
  const STEPS = [
    { n: "01", title: "Étude de faisabilité", text: "Analyse des besoins, dans le respect de l'identité et de la singularité de votre entreprise." },
    { n: "02", title: "Étude d'aménagement", text: "Implantation, colorimétrie et signalétique pour des espaces cohérents et inspirants." },
    { n: "03", title: "Réalisation du plan", text: "Projet et plans 2D / 3D, puis livraison et montage clés en main dans vos locaux." },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
      <div className="mb-9">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Notre méthode</p>
        <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[42px] mt-2">Votre projet en 3 étapes</h2>
      </div>

      <div className="grid gap-9 lg:grid-cols-3 rounded-[24px] border border-line bg-surface p-8 sm:p-12">
        {STEPS.map((s, i) => (
          <div key={s.n} className={i !== STEPS.length - 1 ? "lg:border-r lg:border-line lg:pr-8" : ""}>
            <div className="font-display font-extrabold text-[46px] leading-none text-orange">{s.n}</div>
            <h3 className="font-display font-bold text-xl mt-3.5 mb-2">{s.title}</h3>
            <p className="text-[14.5px] text-ink-soft">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}