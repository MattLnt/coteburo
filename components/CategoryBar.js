import Link from "next/link";

const CATS = [
  { label: "Sièges & fauteuils", href: "/catalogue/sieges", icon: (<><path d="M7 11V6a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 6v5" /><path d="M5 11h14l-1.2 5H6.2z" /><path d="M12 16v4" /><path d="M8.5 22l3.5-3 3.5 3" /></>) },
  { label: "Bureaux", href: "/catalogue/bureaux", icon: (<><path d="M3 9h18" /><path d="M5 9v11M19 9v11" /><path d="M5 9l2-4.5h10L19 9" /><path d="M14 14h4" /></>) },
  { label: "Tables de réunion", href: "/catalogue/tables", icon: (<><ellipse cx="12" cy="8" rx="8.5" ry="2.8" /><path d="M5 9.2v9M19 9.2v9M9.5 10v8.5M14.5 10v8.5" /></>) },
  { label: "Rangements", href: "/catalogue/rangements", icon: (<><rect x="6.5" y="3.5" width="11" height="17" rx="1.5" /><path d="M6.5 9.2h11M6.5 14.8h11" /><path d="M11 6.2h2M11 11.8h2M11 17.4h2" /></>) },
  { label: "Acoustique", href: "/catalogue/acoustique", icon: (<><path d="M6 20.5V11a6 6 0 0 1 12 0v9.5" /><path d="M6 20.5h12" /><path d="M9.5 20.5v-5.5h5v5.5" /></>) },
  { label: "Mobilier d'accueil", href: "/catalogue/accueil", icon: (<><path d="M5 11.5v-1.2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1.2" /><path d="M3.5 13.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5h-17z" /><path d="M5.5 18.5v2M18.5 18.5v2" /></>) },
];

export default function CategoryBar() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7" style={{ paddingTop: 8, paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Le catalogue</p>
          <h2 className="font-display font-bold text-ink text-2xl sm:text-3xl" style={{ marginTop: 6 }}>Parcourez nos catégories</h2>
        </div>
        <Link href="/catalogue" className="text-orange font-semibold whitespace-nowrap hover:text-orange-dark transition" style={{ fontSize: 15 }}>Tout le catalogue →</Link>
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6 }}>
        {CATS.map((c) => (
          <Link key={c.href} href={c.href} className="group" style={{ flex: "0 0 auto", width: 178, textAlign: "center" }}>
            <div className="bg-surface border border-line group-hover:border-orange group-hover:bg-orange-tint transition" style={{ width: 178, height: 158, borderRadius: 20, display: "grid", placeItems: "center", boxShadow: "0 1px 4px rgba(33,36,40,0.06)" }}>
              <span className="text-charcoal group-hover:text-orange-dark transition">
                <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              </span>
            </div>
            <p className="text-ink group-hover:text-orange font-semibold transition" style={{ marginTop: 12, fontSize: 14 }}>{c.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}