import Link from "next/link";

export function PageLegale({ titre, sousTitre, maj, children }) {
  return (
    <main className="mx-auto max-w-[820px] px-5 sm:px-7 py-12 sm:py-16">
      <div className="pb-2 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <span className="text-ink">{titre}</span>
      </div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mt-3">{titre}</h1>
      {sousTitre && <p className="text-ink-soft text-lg mt-3">{sousTitre}</p>}
      {maj && <p className="text-[13px] text-ink-soft mt-2">Dernière mise à jour : {maj}</p>}
      <div className="mt-8 flex flex-col gap-7 leading-relaxed text-ink-soft">
        {children}
      </div>
    </main>
  );
}

export function Section({ titre, children }) {
  return (
    <section>
      <h2 className="font-display font-bold text-ink text-xl mb-3">{titre}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Placeholder({ children }) {
  return <span className="bg-orange-tint text-orange-dark font-semibold px-1.5 py-0.5 rounded text-[13px]">[{children}]</span>;
}