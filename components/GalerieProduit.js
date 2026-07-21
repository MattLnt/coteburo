"use client";
import { useState } from "react";

export default function GalerieProduit({ images = [], alt = "" }) {
  const [imgActive, setImgActive] = useState(0);

  return (
    <div className="flex gap-4">
      {images.length > 1 && (
        <div className="galerie-scroll flex flex-col gap-3 w-[84px] shrink-0 max-h-[560px] overflow-y-auto pr-1">
          {images.map((img, i) => (
            <button key={i} onClick={() => setImgActive(i)}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 shrink-0 transition ${i === imgActive ? "border-orange shadow-[0_4px_14px_rgba(240,102,27,0.18)]" : "border-line hover:border-orange/40"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1 aspect-square rounded-[24px] overflow-hidden border border-line bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f0ece4)]">
        {images[imgActive] ? (
          <img src={images[imgActive]} alt={alt} className="w-full h-full object-contain p-6" />
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