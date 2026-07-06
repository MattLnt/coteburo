"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({ variant = "desktop" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState([]);
  const [total, setTotal] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResultats([]); setTotal(0); return; }
    clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recherche?q=${encodeURIComponent(q)}&limit=6`);
        const data = await res.json();
        setResultats(data.produits || []);
        setTotal(data.total || 0);
      } catch { setResultats([]); }
      setLoading(false);
    }, 220);
    return () => clearTimeout(debounce.current);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (q.trim().length >= 2) { setOuvert(false); router.push(`/recherche?q=${encodeURIComponent(q.trim())}`); }
  };

  const goToProduit = (slug) => { setOuvert(false); setQ(""); router.push(`/produit/${slug}`); };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} className="flex items-center gap-2.5 bg-surface border border-line rounded-full px-4 py-2.5 focus-within:border-orange focus-within:shadow-[0_0_0_3px_rgba(240,102,27,0.08)]" style={{ transition: "border-color .15s, box-shadow .15s" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-soft shrink-0"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)}
          placeholder="Rechercher un siège, un bureau, une marque…"
          className="w-full bg-transparent border-0 outline-0 text-sm text-ink placeholder:text-ink-soft"
        />
        {q && (
          <button type="button" onClick={() => { setQ(""); setResultats([]); }} className="text-ink-soft hover:text-orange shrink-0 grid place-items-center w-5 h-5 rounded-full hover:bg-orange-tint transition" aria-label="Effacer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </form>

      {/* Déroulant premium */}
      {ouvert && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 mt-3 bg-surface border border-line rounded-[20px] shadow-[0_40px_90px_-30px_rgba(33,36,40,0.45)] overflow-hidden z-[80]" style={{ width: "min(600px, 92vw)" }}>
          {loading && resultats.length === 0 ? (
            <div className="px-5 py-10 flex items-center justify-center gap-3 text-sm text-ink-soft">
              <span className="w-4 h-4 rounded-full border-2 border-orange border-t-transparent animate-spin" />
              Recherche en cours…
            </div>
          ) : resultats.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto mb-3 grid place-items-center w-11 h-11 rounded-full bg-surface-2 text-ink-soft/40">
                <svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <p className="text-sm text-ink">Aucun résultat pour « <span className="font-semibold">{q}</span> »</p>
              <p className="text-[12.5px] text-ink-soft mt-1">Essayez un autre mot-clé ou une marque.</p>
            </div>
          ) : (
            <>
              {/* En-tête */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Produits</span>
                <span className="text-[11px] font-semibold text-ink-soft">{total} résultat{total > 1 ? "s" : ""}</span>
              </div>

              {/* Résultats */}
              <div className="max-h-[400px] overflow-y-auto px-2 pb-2">
                {resultats.map((p) => (
                  <button key={p.codeRacine} onClick={() => goToProduit(p.slug)} className="group w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-orange-tint/60 transition text-left">
                    <div className="w-14 h-14 rounded-xl bg-white border border-line overflow-hidden shrink-0 grid place-items-center group-hover:border-orange/40 transition">
                      {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <svg width="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-ink-soft/30"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>}
                    </div>
                    <div className="min-w-0 flex-1">
                      {p.brand && <p className="text-[10.5px] font-bold uppercase tracking-wide text-orange">{p.brand}</p>}
                      <p className="text-[14px] font-semibold text-ink leading-snug line-clamp-1 group-hover:text-orange-dark transition mt-0.5">{p.designation}</p>
                      {p.gamme && <p className="text-[12px] text-ink-soft line-clamp-1 mt-0.5">{p.gamme}</p>}
                    </div>
                    <div className="text-right shrink-0 pr-1">
                      <p className="text-[14px] font-display font-bold text-ink whitespace-nowrap">{p.price}</p>
                      <p className="text-[10px] text-ink-soft">HT{p.promo ? "" : ""}</p>
                      {p.promo && <span className="inline-block mt-1 rounded-full bg-orange text-white text-[10px] font-bold px-2 py-0.5">{p.promo}</span>}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-ink-soft/0 group-hover:text-orange shrink-0 -ml-1 group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                ))}
              </div>

              {/* Pied charcoal premium */}
              <button onClick={submit} className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-charcoal text-white font-semibold text-sm hover:bg-[#2d3035] transition">
                Voir tous les résultats
                <span className="rounded-full bg-orange text-white text-[11px] font-bold px-2 py-0.5">{total}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}