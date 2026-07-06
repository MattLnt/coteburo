"use client";
import { useState, useRef, useEffect } from "react";

export default function FinitionSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[13px] font-semibold mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-surface px-4 py-3 text-sm text-left transition ${
          open ? "border-orange" : "border-line"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-orange/60"}`}
      >
        <span className={value ? "text-ink" : "text-ink-soft"}>{value || "— Choisir —"}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-ink-soft transition ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-2 max-h-[260px] overflow-y-auto overflow-x-hidden rounded-xl border border-line bg-surface shadow-[0_20px_45px_-18px_rgba(33,36,40,0.35)]">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-soft text-center">Aucune option</p>
          ) : (
            options.map((o) => {
              const on = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    on ? "bg-orange-tint text-orange-dark font-semibold" : "text-ink hover:bg-surface-2"
                  }`}
                >
                  {o}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}