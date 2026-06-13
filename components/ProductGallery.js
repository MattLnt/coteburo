"use client";
import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images, alt }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="relative aspect-square rounded-[24px] overflow-hidden border border-line bg-surface-2">
        <Image src={images[active]} alt={alt} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" priority />
      </div>
      <div className="flex gap-3 mt-3">
        {images.map((img, i) => (
          <button key={i} onClick={() => setActive(i)} className={`relative h-20 w-20 rounded-xl overflow-hidden border-2 transition ${i === active ? "border-orange" : "border-line hover:border-ink"}`}>
            <Image src={img} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}