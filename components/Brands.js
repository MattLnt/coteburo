export default function Brands() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 sm:px-7 pb-16">
      <div className="rounded-[24px] border border-line bg-gradient-to-b from-surface to-bg px-6 sm:px-10 py-11 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos marques partenaires</p>
        <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-[34px] mt-2">Le meilleur du mobilier européen</h2>
        <p className="text-ink-soft max-w-[560px] mx-auto mt-3">
          Nous sélectionnons des fabricants reconnus pour leur qualité, leur design et leur durabilité.
          Une gamme complète disponible sur devis avec conseil et installation.
        </p>

        <div className="flex flex-wrap justify-center items-center gap-4 mt-8">
          <BrandPill>buro<span className="text-orange">nomic</span></BrandPill>
          <BrandPill>SOKOA</BrandPill>
          <BrandPill>Office<span className="text-orange">Pro</span></BrandPill>
        </div>
      </div>
    </section>
  );
}

function BrandPill({ children }) {
  return (
    <a href="#" className="font-display font-extrabold text-2xl sm:text-[26px] tracking-tight rounded-2xl border border-line bg-surface px-7 sm:px-9 py-4 transition hover:-translate-y-1 hover:text-orange hover:shadow-[0_8px_30px_rgba(33,36,40,0.08)]">
      {children}
    </a>
  );
}