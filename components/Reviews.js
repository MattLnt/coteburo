import { getAvisGoogle, URL_FICHE_GOOGLE } from "@/lib/googleAvis";

function Stars({ n }) {
  return (
    <div className="flex gap-0.5 text-orange">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} className="w-[14px] h-[14px] sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5L6.7 13.7 1.4 9.1l7-.6z" /></svg>
      ))}
    </div>
  );
}

// Initiale de repli quand Google ne fournit pas de photo de profil.
const initiale = (nom) => (nom || "?").trim().charAt(0).toUpperCase();

export default async function Reviews() {
  const { note, nombre, avis, url } = await getAvisGoogle();

  if (!avis || avis.length === 0) return null;

  // L'URL renvoyée par l'API est la plus fiable ; sinon on retombe sur
  // l'URL Maps construite à partir du Place ID.
  const lienGoogle = url || URL_FICHE_GOOGLE;
  const noteAffichee = Number(note).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="flex items-end justify-between gap-4 mb-4 sm:mb-8">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">
            ★ {noteAffichee} / 5 sur Google{nombre ? ` · ${nombre} avis` : ""}
          </p>
          <h2 className="font-display font-bold text-ink text-[21px] sm:text-3xl mt-1 sm:mt-1.5">Ce qu&apos;en disent nos clients</h2>
        </div>
        <a href={lienGoogle} target="_blank" rel="noopener noreferrer"
          className="text-orange font-semibold whitespace-nowrap text-[12.5px] sm:text-[15px] hover:text-orange-dark transition">
          <span className="sm:hidden">Tous les avis →</span>
          <span className="hidden sm:inline">Voir tous les avis →</span>
        </a>
      </div>

      {/* L'API Places renvoie au maximum 5 avis : on garde le défilement
          horizontal, qui s'adapte au nombre reçu. */}
      <div className="flex md:grid md:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto md:overflow-visible pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none]">
        {avis.slice(0, 3).map((r, i) => (
          <div key={i} className="shrink-0 md:shrink w-[280px] md:w-auto rounded-[18px] sm:rounded-3xl bg-surface border border-line p-5 sm:p-7 flex flex-col [scroll-snap-align:start]">
            <Stars n={r.note} />
            <p className="text-ink text-[13.5px] sm:text-[15px] leading-relaxed mt-3 sm:mt-4 flex-1 line-clamp-[10]">« {r.texte} »</p>
            <div className="flex items-center gap-3 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-line">
              {r.photo ? (
                <img src={r.photo} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0" />
              ) : (
                <span className="grid place-items-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-tint text-orange-dark font-display font-bold text-[14px] sm:text-base shrink-0">
                  {initiale(r.auteur)}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-display font-bold text-ink text-[13px] sm:text-sm leading-tight truncate">{r.auteur}</p>
                <p className="text-ink-soft text-[11px] sm:text-xs mt-0.5">Avis Google</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}