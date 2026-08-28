const BRANDS = [
  { name: (<>buro<span className="text-orange">nomic</span></>), tag: "Bureaux & rangements · fabrication française" },
  { name: "SOKOA", tag: "Sièges ergonomiques · éco-conçus" },
  { name: (<>Office<span className="text-orange">Pro</span></>), tag: "Assises & accessoires · rapport qualité-prix" },
];

export default function Brands() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-3xl bg-charcoal px-5 py-8 sm:px-12 sm:py-14">
        <div className="absolute w-[420px] h-[420px] rounded-full -right-[140px] -top-[160px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.4),transparent_65%)]" />

        <div className="relative text-center max-w-[640px] mx-auto">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Nos marques partenaires</p>
          <h2 className="font-display font-bold text-white text-[21px] sm:text-3xl mt-1 sm:mt-1.5">Le meilleur du mobilier européen</h2>
          <p className="text-[#9aa0a8] text-[13px] sm:text-[15px] mt-2.5 sm:mt-3 leading-relaxed">Des fabricants reconnus pour leur qualité, leur design et leur durabilité — disponibles sur devis avec conseil et installation.</p>
        </div>

        <div className="relative grid sm:grid-cols-3 gap-2.5 sm:gap-5 mt-6 sm:mt-10">
          {BRANDS.map((b, i) => (
            <div key={i} className="rounded-[16px] sm:rounded-2xl bg-white/[0.04] border border-white/10 px-5 py-5 sm:px-6 sm:py-8 text-center hover:bg-white/[0.07] hover:border-orange/40 transition">
              <p className="font-display font-bold text-white text-[21px] sm:text-[26px] tracking-tight">{b.name}</p>
              <p className="text-[#9aa0a8] text-[12px] sm:text-[13px] mt-2 sm:mt-3 leading-snug">{b.tag}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}