export default function ProjectTypes() {
  const TYPES = [
    { title: "Accueil", sub: "& salle d'attente", icon: (<><path d="M8 34c0-3 2-5 5-5h22c3 0 5 2 5 5v6H8z" /><path d="M8 40v4M40 40v4" /><path d="M14 29v-4c0-2 1-3 3-3h14c2 0 3 1 3 3v4" /></>) },
    { title: "Poste de travail", sub: "individuel", icon: (<><path d="M6 18h36" /><path d="M9 18v22M39 18v22" /><path d="M9 18l4-7h22l4 7" /><path d="M30 30h6" /></>) },
    { title: "Open space", sub: "& coworking", icon: (<><rect x="5" y="14" width="16" height="9" rx="1.5" /><rect x="27" y="14" width="16" height="9" rx="1.5" /><rect x="5" y="29" width="16" height="9" rx="1.5" /><rect x="27" y="29" width="16" height="9" rx="1.5" /></>) },
    { title: "Salle de réunion", sub: "& visio", icon: (<><ellipse cx="24" cy="20" rx="17" ry="6" /><path d="M9 22v12M39 22v12M17 25v13M31 25v13" /></>) },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TYPES.map((t) => (
          <div key={t.title} className="group flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(33,36,40,0.08)] hover:border-transparent transition">
            <span className="text-orange shrink-0">
              <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            </span>
            <span>
              <span className="block font-display font-bold text-base leading-tight">{t.title}</span>
              <span className="block text-[12.5px] text-ink-soft">{t.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}