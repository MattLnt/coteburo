"use client";
import { useState, useEffect, useRef } from "react";

// Nombre de miniatures visibles avant scroll (colonne desktop).
const VIGNETTES_VISIBLES = 5;
const HAUTEUR_VIGNETTE = 80;
const GAP = 12;
const HAUTEUR_COLONNE = VIGNETTES_VISIBLES * HAUTEUR_VIGNETTE + (VIGNETTES_VISIBLES - 1) * GAP;
const PAS_SCROLL = HAUTEUR_VIGNETTE + GAP;

// Deplacement horizontal minimal pour qu un geste compte comme un balayage.
// Trop bas, un defilement vertical un peu oblique ferait changer la photo.
const SEUIL_BALAYAGE = 45;

// Une photo d'ambiance montre le produit en situation : elle doit
// remplir le cadre, le décor faisant partie de l'image. On les reconnaît
// à leur nom de fichier, les catalogues fournisseurs les préfixant ainsi.
const MOTS_AMBIANCE = ["amb_", "amb-", "ambiance", "_amb", "bodegon"];

// Libellé du coloris, lu dans le nom du fichier.
//
// Les captures du configurateur le portent : « BX995N_Blanc_Chêne-fil.png »
// = piètement blanc, plateau chêne fil. Le réimport conserve ce nom dans
// l'identifiant Cloudinary, si bien qu'il suffit de le relire — aucun
// rapprochement avec le nuancier n'est nécessaire.
//
// Le premier segment est la référence produit, pas un décor : on le laisse.
// Une ambiance n'est pas une déclinaison de finition : pas de pastille.
const libelleFinition = (url) => {
  if (!url || estAmbiance(url)) return null;
  const fichier = decodeURIComponent(url.split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
  const jetons = fichier.split("_").slice(1).map((t) => t.replace(/-/g, " ").trim()).filter(Boolean);
  return jetons.length ? jetons.join(" · ") : null;
};
const estAmbiance = (url) => {
  const nom = decodeURIComponent(url || "").toLowerCase();
  return MOTS_AMBIANCE.some((m) => nom.includes(m));
};

export default function GalerieProduit({ images = [], alt = "" }) {
  const [imgActive, setImgActive] = useState(0);
  const [modes, setModes] = useState({});
  const listeRef = useRef(null);
  const [peutMonter, setPeutMonter] = useState(false);
  const [peutDescendre, setPeutDescendre] = useState(false);

  useEffect(() => { setImgActive(0); }, [images]);

  // Détermine le cadrage de chaque image, indexé par URL.
  //
  // Un packshot — fond transparent ou uniformément clair — doit tenir
  // entier dans le cadre : le rogner couperait le produit. Une photo
  // d'ambiance, elle, remplit le cadre sans qu'on perde l'essentiel.
  //
  // Les captures du configurateur pCon ont un fond blanc opaque : la
  // seule détection de transparence les classait à tort en « cover »,
  // et les armoires hautes se retrouvaient tronquées.
  useEffect(() => {
    images.forEach((url) => {
      if (!url) return;

      // Le nom de fichier tranche avant toute analyse : une ambiance
      // reste une ambiance même sur fond clair.
      if (estAmbiance(url)) {
        setModes((m) => ({ ...m, [url]: "cover" }));
        return;
      }

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
          // On échantillonne les bords : c'est là que le fond se voit,
          // le produit occupant le centre.
          const bords = [];
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              if (data[i + 3] < 200) transparents++;
              const surBord = x < 2 || x >= w - 2 || y < 2 || y >= h - 2;
              if (surBord) bords.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
            }
          }

          const partTransparente = transparents / (w * h);
          const clairs = bords.filter(([r, g, b, a]) => a > 200 && r > 225 && g > 225 && b > 225);
          const partClaire = bords.length ? clairs.length / bords.length : 0;

          const packshot = partTransparente > 0.12 || partClaire > 0.75;
          setModes((m) => ({ ...m, [url]: packshot ? "contain" : "cover" }));
        } catch {
          // Canvas verrouillé par le navigateur : on se rabat sur
          // l'extension, le PNG servant aux packshots.
          setModes((m) => ({ ...m, [url]: /\.png(\?|$)/i.test(url) ? "contain" : "cover" }));
        }
      };

      probe.onerror = () =>
        setModes((m) => ({ ...m, [url]: /\.png(\?|$)/i.test(url) ? "contain" : "cover" }));

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

  // Tant que la détection n'a pas répondu, « contain » est le choix sûr :
  // une image affichée entière avec des marges vaut mieux qu'un produit
  // rogné le temps du chargement.
  const modeActive = (urlActive && modes[urlActive]) || "contain";
  const libelleActive = libelleFinition(urlActive);
  const avecScroll = images.length > VIGNETTES_VISIBLES;

  const styleFleche = (actif) => ({
    width: 80, height: 22, display: "grid", placeItems: "center",
    borderRadius: 8, border: "1px solid #ece8e0", background: "#fff",
    cursor: actif ? "pointer" : "default", opacity: actif ? 1 : 0.35,
    color: "#5c616a", flexShrink: 0,
  });

  // ── Balayage tactile ──
  // On ne touche jamais à preventDefault : le défilement vertical de la page
  // doit rester libre. C'est touch-action: pan-y qui dit au navigateur que
  // l'horizontale nous revient — sans lui, un balayage déclencherait le
  // « précédent/suivant » du navigateur au lieu de changer de photo.
  const debutToucher = useRef(null);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    debutToucher.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e) => {
    const debut = debutToucher.current;
    debutToucher.current = null;
    if (!debut || images.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - debut.x;
    const dy = t.clientY - debut.y;
    // Geste franchement horizontal seulement : en deçà, c'est un défilement
    // vertical ou un simple appui, et changer d'image serait intempestif.
    if (Math.abs(dx) < SEUIL_BALAYAGE || Math.abs(dx) <= Math.abs(dy)) return;
    setImgActive((i) => {
      const suivant = i + (dx < 0 ? 1 : -1);
      return Math.min(images.length - 1, Math.max(0, suivant));
    });
  };

  const imagePrincipale = (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
      className="relative flex-1 aspect-square rounded-[16px] lg:rounded-[24px] overflow-hidden border border-line bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)]">
      {urlActive ? (
        <img src={urlActive} alt={alt} className={`w-full h-full ${modeActive === "contain" ? "object-contain" : "object-cover"}`} />
      ) : (
        <div className="w-full h-full grid place-items-center text-charcoal/15">
          <svg width="38%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
        </div>
      )}

      {/* Pastille du coloris — dit quelle finition la photo montre. Placée en
          haut, la pagination occupant le bas sur mobile.
          Fond sombre et opaque : les packshots sont détourés sur blanc, une
          pastille claire s'y dissolvait faute de contour perceptible. */}
      {libelleActive && (
        <span className="absolute top-2.5 left-2.5 rounded-full bg-ink/88 px-2.5 py-1 text-[10.5px] lg:text-[11.5px] font-semibold text-white shadow-[0_1px_6px_rgba(33,36,40,0.25)] max-w-[calc(100%-20px)] truncate">
          {libelleActive}
        </span>
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
              const m = modes[img] || "contain";
              return (
                <button
                  key={img + i}
                  type="button"
                  onClick={() => setImgActive(i)}
                  aria-label={`Voir l'image ${i + 1}`}
                  aria-pressed={i === imgActive}
                  className={`relative w-[52px] h-[52px] rounded-[10px] overflow-hidden border-2 shrink-0 transition bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] ${i === imgActive ? "border-orange" : "border-line"}`}
                >
                  <img src={img} alt="" className={`w-full h-full ${m === "contain" ? "object-contain" : "object-cover"}`} />
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
                const m = modes[img] || "contain";
                return (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setImgActive(i)}
                    aria-label={`Voir l'image ${i + 1}`}
                    aria-pressed={i === imgActive}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 shrink-0 transition bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] ${i === imgActive ? "border-orange shadow-[0_4px_14px_rgba(240,102,27,0.18)]" : "border-line hover:border-orange/40"}`}
                  >
                    <img src={img} alt="" className={`w-full h-full ${m === "contain" ? "object-contain" : "object-cover"}`} />
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