"use client";
import { useState, useRef, useEffect } from "react";
import { ICONES_CATEGORIE, LISTE_ICONES } from "@/lib/iconesCategories";

export default function SelecteurIcone({ valeur, onChange }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOuvert((v) => !v)}
        style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid #ece8e0", background: "#faf8f4", cursor: "pointer", display: "grid", placeItems: "center", color: "#5c616a" }}
        title="Choisir une icône">
        {valeur && ICONES_CATEGORIE[valeur] ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONES_CATEGORIE[valeur]}</svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 9h.01M15 9h.01M9 15c1 1 5 1 6 0" /></svg>
        )}
      </button>

      {ouvert && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 70, width: 300, background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, boxShadow: "0 20px 50px -20px rgba(0,0,0,0.3)", padding: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#9aa0a8", margin: "2px 4px 10px" }}>Choisir une icône</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {LISTE_ICONES.map(([cle, label]) => {
              const actif = valeur === cle;
              return (
                <button key={cle} type="button" title={label} onClick={() => { onChange(cle); setOuvert(false); }}
                  style={{ aspectRatio: "1/1", borderRadius: 10, border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"), background: actif ? "#fce6d6" : "#faf8f4", cursor: "pointer", display: "grid", placeItems: "center", color: actif ? "#d9551a" : "#5c616a" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONES_CATEGORIE[cle]}</svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}