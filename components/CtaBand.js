import Link from "next/link";

export default function CtaBand() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="relative overflow-hidden rounded-3xl bg-charcoal px-6 py-14 sm:px-12 sm:py-16 text-center">
        <div className="absolute w-[520px] h-[520px] rounded-full -right-[160px] -top-[220px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.45),transparent_65%)]" />
        <div className="absolute w-[420px] h-[420px] rounded-full -left-[140px] -bottom-[200px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.25),transparent_65%)]" />

        <div className="relative max-w-[620px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Vous avez un projet ?</p>
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-[44px] leading-[1.05] mt-3">Parlons-en autour d'un café.</h2>
          <p className="text-[#c4c9d0] text-[15px] mt-4">Nos experts vous accompagnent sur l'aménagement de vos bureaux — d'un poste isolé à plusieurs centaines de m².</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/contact" className="bg-orange text-white font-semibold rounded-full px-7 py-3.5 hover:bg-orange-dark transition">Demander un devis →</Link>
            <a href="tel:0620391390" className="text-white font-semibold rounded-full px-7 py-3.5 border border-white/25 hover:bg-white/10 transition">06 20 39 13 90</a>
          </div>
        </div>
      </div>
    </section>
  );
}