"use client";
import { useState, useEffect } from "react";

export default function GalerieProduit({ images = [], alt = "" }) {
  const [imgActive, setImgActive] = useState(0);
  // Pour chaque image : "cover" (photo pleine) ou "contain" (PNG détouré). Analysé à la volée.
  const [modes, setModes] = useState({});

  // Détecte si une image a un fond transparent (⇒ détourée ⇒ contain), sinon photo pleine (⇒ cover).
  useEffect(() => {
    images.forEach((url, i) => {
      if (!url || modes[i]) return;
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
          const ratio = transparents / (w * h);
          setModes((m) => ({ ...m, [i]: ratio > 0.12 ? "contain" : "cover" }));
        } catch {
          // Canvas "tainted" (CORS) → repli sur l'extension .png
          setModes((m) => ({ ...m, [i]: /\.png(\?|$)/i.test(url) ? "contain" : "cover" }));
        }
      };
      probe.onerror = () => setModes((m) => ({ ...m, [i]: /\.png(\?|$)/i.test(url) ? "contain" : "cover" }));
      probe.src = url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const modeActive = modes[imgActive] || "cover";

  return (
    <div className="flex gap-4">
      {images.length > 1 && (
        <div className="galerie-scroll flex flex-col gap-3 w-[84px] shrink-0 max-h-[560px] overflow-y-auto pr-1">
          {images.map((img, i) => {
            const m = modes[i] || "cover";
            return (
              <button key={i} onClick={() => setImgActive(i)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 shrink-0 transition bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] ${i === imgActive ? "border-orange shadow-[0_4px_14px_rgba(240,102,27,0.18)]" : "border-line hover:border-orange/40"}`}>
                <img src={img} alt="" className={`w-full h-full ${m === "contain" ? "object-contain p-1.5" : "object-cover"}`} />
              </button>
            );
          })}
        </div>
      )}
      <div className="relative flex-1 aspect-square rounded-[24px] overflow-hidden border border-line bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)]">
        {images[imgActive] ? (
          <img src={images[imgActive]} alt={alt} className={`w-full h-full ${modeActive === "contain" ? "object-contain p-6" : "object-cover"}`} />
        ) : (
          <div className="w-full h-full grid place-items-center text-charcoal/15">
            <svg width="38%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
          </div>
        )}
      </div>

      <style jsx>{`
        .galerie-scroll {
          scrollbar-width: thin;
          scrollbar-color: #e0dacf transparent;
        }
        .galerie-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .galerie-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .galerie-scroll::-webkit-scrollbar-thumb {
          background-color: #e0dacf;
          border-radius: 999px;
        }
        .galerie-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #d9551a;
        }
      `}</style>
    </div>
  );
}