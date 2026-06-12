import Link from "next/link";

export default function CtaBand() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-20">
      <div className="relative overflow-hidden rounded-[24px] bg-charcoal px-6 sm:px-14 py-14 sm:py-16 text-center">
        <div className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full opacity-55 bg-[radial-gradient(circle,#f0661b_0%,transparent_65%)]" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-[#ffb98a]">Vous avez un projet ?</p>
        <h2 className="relative font-display font-bold text-white text-3xl sm:text-5xl lg:text-[52px] mt-3">Parlons-en autour d&apos;un café.</h2>
        <p className="relative text-[#c4c9d0] max-w-[520px] mx-auto mt-4">
          Nos experts sont disponibles pour vous aider à avancer sur l&apos;aménagement de vos bureaux —
          d&apos;un poste isolé à plusieurs centaines de m².
        </p>
        <div className="relative flex flex-wrap justify-center gap-3.5 mt-8">
          <Link href="/devis" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3.5 transition hover:bg-orange-dark hover:-translate-y-0.5">Demander un devis →</Link>
          <a href="tel:0620391390" className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white font-semibold px-6 py-3.5 transition hover:bg-white hover:text-charcoal">06 20 39 13 90</a>
        </div>
      </div>
    </section>
  );
}