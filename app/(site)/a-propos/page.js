import Image from "next/image";
import CtaBand from "@/components/CtaBand";

export const metadata = {
  title: "Notre société",
  description:
    "Côté BURO, spécialiste de l'aménagement et du mobilier de bureau à Aix-en-Provence depuis plus de 20 ans. Conseil, proximité et garantie 7 ans.",
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  const VALUES = [
    { title: "Proximité", text: "Un interlocuteur unique et un showroom à Aix-en-Provence, au plus près de vos projets.", icon: (<><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>) },
    { title: "Expertise", text: "Plus de 20 ans d'expérience dans l'aménagement d'espaces de travail professionnels.", icon: (<><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>) },
    { title: "Sur-mesure", text: "Chaque projet est unique : nous concevons des espaces qui vous ressemblent.", icon: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>) },
    { title: "Durabilité", text: "Du mobilier de qualité, garanti 7 ans, et la reprise des emballages après pose.", icon: (<><path d="M5 19c0-8 6-13 14-13 0 8-5 14-14 13z" /><path d="M5 19c3-4 6-6 10-7" /></>) },
  ];

  const STATS = [
    { value: "+20 ans", label: "d'expérience" },
    { value: "7 ans", label: "de garantie offerte" },
    { value: "3", label: "marques partenaires" },
    { value: "PACA", label: "zone d'intervention" },
  ];

  return (
    <main>
      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pt-14 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Notre société</p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3 max-w-3xl">Le partenaire de vos espaces de travail</h1>
        <p className="text-ink-soft text-lg mt-5 max-w-[580px]">
          Spécialiste de l&apos;aménagement de bureaux à Aix-en-Provence, nous transformons vos espaces pour qu&apos;ils inspirent vos équipes.
        </p>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden border border-line">
            <Image src="https://images.unsplash.com/photo-1746021535489-00edc5efb203?auto=format&fit=crop&w=1000&q=80" alt="Espace de travail aménagé par Côté BURO" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">Depuis plus de 20 ans à Aix-en-Provence</h2>
            <p className="text-ink-soft mt-5">
              Côté BURO accompagne les entreprises d&apos;Aix-en-Provence et de la région PACA dans l&apos;aménagement de leurs espaces de travail. De la petite structure au grand plateau, nous concevons des bureaux qui allient confort, esthétique et fonctionnalité.
            </p>
            <p className="text-ink-soft mt-4">
              Notre conviction : un espace bien pensé inspire les équipes, favorise leur bien-être et renforce l&apos;image de l&apos;entreprise. Nous vous accompagnons à chaque étape, du conseil initial jusqu&apos;au montage final, avec un interlocuteur unique.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-tint text-orange-dark mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{v.icon}</svg>
              </span>
              <h3 className="font-display font-bold text-lg mb-1.5">{v.title}</h3>
              <p className="text-[14.5px] text-ink-soft">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
        <div className="rounded-[24px] bg-charcoal text-white p-9 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-display font-extrabold text-3xl sm:text-4xl text-orange">{s.value}</p>
              <p className="text-[13px] text-[#aab0b8] mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}