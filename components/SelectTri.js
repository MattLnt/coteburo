"use client";
import { useState, useRef, useEffect } from "react";

export default function SelectTri({ value, onChange, options }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const actuel = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOuvert((v) => !v)}
        className={`flex items-center gap-2.5 rounded-full border bg-surface pl-4 pr-3 py-2.5 text-sm font-semibold transition ${ouvert ? "border-orange" : "border-line hover:border-orange"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="text-ink-soft"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
        <span className="text-ink whitespace-nowrap">{actuel.label}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`text-ink-soft transition-transform ${ouvert ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {ouvert && (
        <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-surface border border-line rounded-2xl shadow-[0_30px_70px_-25px_rgba(33,36,40,0.32)] overflow-hidden z-50 p-1.5">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOuvert(false); }}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm text-left transition ${on ? "bg-orange-tint text-orange-dark font-semibold" : "text-ink hover:bg-surface-2"}`}
              >
                {o.label}
                {on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}