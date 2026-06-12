import Link from "next/link";

export default function Categories() {
  const CATS = [
    { title: "Sièges & fauteuils", count: "128 références", href: "/catalogue/sieges", icon: (<><path d="M15 9c0-2 1.5-3.5 3.5-3.5h11C31.5 5.5 33 7 33 9v15H15z" /><path d="M12 24h24l-2 9H14z" /><path d="M24 33v9" /><path d="M16 44l8-6 8 6" /></>) },
    { title: "Bureaux", count: "94 références", href: "/catalogue/bureaux", icon: (<><path d="M6 17h36" /><path d="M10 17v22M38 17v22" /><path d="M10 17l4-7h20l4 7" /></>) },
    { title: "Tables de réunion", count: "56 références", href: "/catalogue/tables", icon: (<><ellipse cx="24" cy="18" rx="18" ry="6" /><path d="M8 20v16M40 20v16M16 23v16M32 23v16" /></>) },
    { title: "Rangements", count: "73 références", href: "/catalogue/rangements", icon: (<><rect x="12" y="8" width="24" height="32" rx="2" /><path d="M12 19h24M12 30h24" /><path d="M22 13h4M22 24h4M22 35h4" /></>) },
    { title: "Acoustique", count: "41 références", href: "/catalogue/acoustique", icon: (<><path d="M13 40V20c0-6 5-11 11-11s11 5 11 11v20" /><path d="M13 40h22" /><path d="M19 40V27h10v13" /></>) },
    { title: "Mobilier d'accueil", count: "38 références", href: "/catalogue/accueil", icon: (<><path d="M8 32c0-2.5 2-4.5 4.5-4.5h23c2.5 0 4.5 2 4.5 4.5v6H8z" /><path d="M8 38v4M40 38v4" /><path d="M13 27.5v-5c0-2 1.5-3.5 3.5-3.5h15c2 0 3.5 1.5 3.5 3.5v5" /></>) },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-9">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Le catalogue</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[42px] mt-2">Tout pour équiper vos bureaux</h2>
          <p className="text-ink-soft mt-2.5 max-w-[520px]">
            Une sélection professionnelle de mobilier design, ergonomique et durable — disponible en achat direct ou sur devis.
          </p>
        </div>
        <Link href="/catalogue" className="shrink-0 font-semibold text-orange inline-flex items-center gap-1.5 group">
          Tout le catalogue <span className="group-hover:translate-x-1 transition">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CATS.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="group relative flex flex-col justify-between min-h-[230px] overflow-hidden rounded-[24px] border border-line bg-gradient-to-b from-surface to-surface-2 p-6 transition hover:-translate-y-1.5 hover:border-transparent hover:from-white hover:to-orange-tint hover:shadow-[0_30px_70px_-25px_rgba(33,36,40,0.28)]"
          >
            <span className="absolute top-6 right-6 grid place-items-center h-[34px] w-[34px] rounded-full border border-line text-ink-soft transition group-hover:bg-orange group-hover:border-orange group-hover:text-white group-hover:-rotate-45">→</span>
            <span className="text-ink opacity-85 transition group-hover:text-orange-dark">
              <svg width="54" height="54" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
            </span>
            <span>
              <span className="block font-display font-bold text-[22px]">{c.title}</span>
              <span className="block text-[13px] text-ink-soft mt-1">{c.count}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}