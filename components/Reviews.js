export default function Reviews() {
  const REVIEWS = [
    { initial: "C", name: "Chantal C.", role: "Gérante · Aix-en-Provence", text: "Travail sérieux et très bon suivi de dossier et de chantier. J'ai apprécié tout le conseil pour bien cibler nos besoins. Excellente prestation, je recommande !" },
    { initial: "Y", name: "Yvan G.", role: "Directeur · Marseille", text: "Conseillère professionnelle, attentive et impliquée du début à la fin. Pleinement satisfait de cette collaboration et du mobilier livré." },
    { initial: "A", name: "AP Ressources", role: "Responsable RH", text: "Excellent conseil sur l'implantation, de la réactivité et un bon rapport qualité-prix. Toute l'équipe a été au top." },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
      <div className="mb-9">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">★ 4,9 / 5 sur Google</p>
        <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[42px] mt-2">Ce qu&apos;en disent nos clients</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {REVIEWS.map((r) => (
          <div key={r.name} className="rounded-2xl border border-line bg-surface p-6">
            <div className="text-orange text-[15px] tracking-[2px] mb-3">★★★★★</div>
            <p className="text-[14.5px] text-ink">« {r.text} »</p>
            <div className="flex items-center gap-3 mt-5">
              <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-orange-tint text-orange-dark font-display font-bold">{r.initial}</span>
              <span>
                <span className="block text-sm font-bold">{r.name}</span>
                <span className="block text-xs text-ink-soft">{r.role}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}