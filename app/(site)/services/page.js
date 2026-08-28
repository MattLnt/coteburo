import Steps from "@/components/Steps";
import CtaBand from "@/components/CtaBand";

export const metadata = {
  title: "Nos services",
  description:
    "Aménagement de bureaux à Aix-en-Provence : analyse des besoins, conseil, plans 3D, choix du mobilier, livraison et montage. Garantie 7 ans.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const SERVICES = [
    { title: "Analyse des besoins", text: "Étude de vos espaces, effectifs et usages pour cerner précisément vos besoins.", icon: (<><rect x="5" y="6" width="14" height="15" rx="2" /><path d="M9 4h6v3H9z" /><path d="M9 12h6M9 16h4" /></>) },
    { title: "Conseils en aménagement", text: "Implantation, ergonomie, acoustique et colorimétrie pour des espaces qui fonctionnent.", icon: (<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z" /></>) },
    { title: "Plan 2D / 3D", text: "Visualisez votre futur aménagement avant tout achat, pour décider en confiance.", icon: (<><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="M4 7l8 4 8-4M12 11v10" /></>) },
    { title: "Choix de la gamme", text: "Sélection du mobilier adapté à votre budget et votre image parmi nos marques partenaires.", icon: (<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>) },
    { title: "Livraison & montage", text: "Installation clés en main par nos équipes, partout en région PACA.", icon: (<><path d="M3 7h11v8H3z" /><path d="M14 10h3l3 3v2h-6z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>) },
    { title: "Garantie 7 ans & SAV", text: "Extension de garantie offerte et reprise des emballages après installation.", icon: (<><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></>) },
  ];

  return (
    <main>
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-7 sm:pt-14 pb-5 sm:pb-8">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos services</p>
        <h1 className="font-display font-bold text-[29px] sm:text-5xl lg:text-6xl mt-2 sm:mt-3 max-w-3xl leading-tight">Un accompagnement de A à Z</h1>
        <p className="text-ink-soft text-[13.5px] sm:text-lg mt-3 sm:mt-5 max-w-[580px] leading-relaxed">
          De l&apos;analyse de vos besoins à l&apos;installation finale, nous gérons l&apos;ensemble de votre projet d&apos;aménagement.
        </p>
      </section>

      {/* Services — en ligne sur mobile : une icône de 48px au-dessus de trois
          lignes de texte fait des cartes très hautes pour six entrées. */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-9 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-line bg-surface p-4 sm:p-6 flex sm:block gap-3.5 sm:transition sm:hover:-translate-y-1 sm:hover:shadow-[0_8px_30px_rgba(33,36,40,0.08)]">
              <span className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-orange-tint text-orange-dark sm:mb-4 shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              </span>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[15.5px] sm:text-lg mb-1 sm:mb-1.5">{s.title}</h3>
                <p className="text-[12.5px] sm:text-[14.5px] text-ink-soft leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Steps />

      {/* Espace de respiration avant le bandeau CTA */}
      <div className="h-8 sm:h-14" />

      <CtaBand />
    </main>
  );
}