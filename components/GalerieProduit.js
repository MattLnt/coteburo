"use client";
import { useState, useEffect, useRef } from "react";

// Nombre de miniatures visibles avant scroll (colonne desktop).
const VIGNETTES_VISIBLES = 5;
const HAUTEUR_VIGNETTE = 80;
const GAP = 12;
const HAUTEUR_COLONNE = VIGNETTES_VISIBLES * HAUTEUR_VIGNETTE + (VIGNETTES_VISIBLES - 1) * GAP;
const PAS_SCROLL = HAUTEUR_VIGNETTE + GAP;

export default function GalerieProduit({ images = [], alt = "" }) {
  const [imgActive, setImgActive] = useState(0);
  const [modes, setModes] = useState({});
  const listeRef = useRef(null);
  const [peutMonter, setPeutMonter] = useState(false);
  const [peutDescendre, setPeutDescendre] = useState(false);

  useEffect(() => { setImgActive(0); }, [images]);

  // Détection fond transparent (⇒ contain) vs photo pleine (⇒ cover). Indexé par URL.
  useEffect(() => {
    images.forEach((url) => {
      if (!url) return;
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.onload = () => {
        try {
          const c = document.createElement("canvas");
          const w = (c.width = 40), h = (c.height = 40);
          const ctx = c.getContext("2d");
          ctx.drawImage(probe, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let transparents = 0;
          for (let p = 3; p < data.length; p += 4) if (data[p] < 200) transparents++;
          setModes((m) => ({ ...m, [url]: transparents / (w * h) > 0.12 ? "contain" : "cover" }));
        } catch {
          setModes((m) => ({ ...m, [url]: /\.png(\?|$)/i.test(url) ? "contain" : "cover" }));
        }
      };
      probe.onerror = () => setModes((m) => ({ ...m, [url]: /\.png(\?|$)/i.test(url) ? "contain" : "cover" }));
      probe.src = url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  // Active/désactive les flèches selon la position de scroll (desktop).
  const majFleches = () => {
    const el = listeRef.current;
    if (!el) return;
    setPeutMonter(el.scrollTop > 2);
    setPeutDescendre(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  useEffect(() => {
    majFleches();
    const el = listeRef.current;
    if (!el) return;
    el.addEventListener("scroll", majFleches, { passive: true });
    return () => el.removeEventListener("scroll", majFleches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, modes]);

  const defiler = (sens) => {
    listeRef.current?.scrollBy({ top: sens * PAS_SCROLL, behavior: "smooth" });
  };

  const urlActive = images[imgActive];
  const modeActive = (urlActive && modes[urlActive]) || "cover";
  const avecScroll = images.length > VIGNETTES_VISIBLES;

  const styleFleche = (actif) => ({
    width: 80, height: 22, display: "grid", placeItems: "center",
    borderRadius: 8, border: "1px solid #ece8e0", background: "#fff",
    cursor: actif ? "pointer" : "default", opacity: actif ? 1 : 0.35,
    color: "#5c616a", flexShrink: 0,
  });

  const imagePrincipale = (
    <div className="relative flex-1 aspect-square rounded-[16px] lg:rounded-[24px] overflow-hidden border border-line bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)]">
      {urlActive ? (
        <img src={urlActive} alt={alt} className={`w-full h-full ${modeActive === "contain" ? "object-contain p-4 lg:p-6" : "object-cover"}`} />
      ) : (
        <div className="w-full h-full grid place-items-center text-charcoal/15">
          <svg width="38%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
        </div>
      )}

      {/* Pagination par points — mobile uniquement, la colonne de vignettes
          n'existe pas sur un écran étroit. */}
      {images.length > 1 && (
        <div className="lg:hidden absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => setImgActive(i)} aria-label={`Image ${i + 1}`}
              className={`h-[5px] rounded-full transition-all ${i === imgActive ? "w-[18px] bg-orange" : "w-[5px] bg-white/90 border border-line"}`} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ── Mobile : image en haut, vignettes en bande sous l'image ── */}
      <div className="lg:hidden">
        {imagePrincipale}

        {images.length > 1 && (
          <div className="galerie-scroll flex gap-1.5 overflow-x-auto mt-2 pb-1">
            {images.map((img, i) => {
              const m = modes[img] || "cover";
              return (
                <button
                  key={img + i}
                  type="button"
                  onClick={() => setImgActive(i)}
                  aria-label={`Voir l'image ${i + 1}`}
                  aria-pressed={i === imgActive}
                  className={`relative w-[52px] h-[52px] rounded-[10px] overflow-hidden border-2 shrink-0 transition bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] ${i === imgActive ? "border-orange" : "border-line"}`}
                >
                  <img src={img} alt="" className={`w-full h-full ${m === "contain" ? "object-contain p-1" : "object-cover"}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Desktop : colonne de vignettes à gauche ── */}
      <div className="hidden lg:flex gap-4">
        {images.length > 1 && (
          <div className="flex flex-col gap-2 w-[84px] shrink-0">
            {avecScroll && (
              <button type="button" onClick={() => defiler(-1)} disabled={!peutMonter} aria-label="Vignettes précédentes" style={styleFleche(peutMonter)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 15 6-6 6 6" /></svg>
              </button>
            )}

            <div ref={listeRef} className="galerie-scroll flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: HAUTEUR_COLONNE }}>
              {images.map((img, i) => {
                const m = modes[img] || "cover";
                return (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setImgActive(i)}
                    aria-label={`Voir l'image ${i + 1}`}
                    aria-pressed={i === imgActive}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 shrink-0 transition bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] ${i === imgActive ? "border-orange shadow-[0_4px_14px_rgba(240,102,27,0.18)]" : "border-line hover:border-orange/40"}`}
                  >
                    <img src={img} alt="" className={`w-full h-full ${m === "contain" ? "object-contain p-1.5" : "object-cover"}`} />
                  </button>
                );
              })}
            </div>

            {avecScroll && (
              <button type="button" onClick={() => defiler(1)} disabled={!peutDescendre} aria-label="Vignettes suivantes" style={styleFleche(peutDescendre)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            )}
          </div>
        )}

        {imagePrincipale}
      </div>

      <style jsx>{`
        /* Scroll molette conservé, barre de scroll masquée */
        .galerie-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .galerie-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>
    </div>
  );
}