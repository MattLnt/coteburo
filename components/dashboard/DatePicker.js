"use client";
import { useState, useRef, useEffect } from "react";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["lu", "ma", "me", "je", "ve", "sa", "di"];

// "2026-06-26" -> Date locale (sans décalage timezone)
function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
// Date -> "2026-06-26"
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatFr(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function DatePicker({ value, onChange, placeholder = "jj/mm/aaaa" }) {
  const selected = parseISO(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(selected || new Date());
  const ref = useRef(null);

  useEffect(() => {
    if (selected) setView(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const pick = (date) => { onChange(toISO(date)); setOpen(false); };
  const prevMonth = () => setView(new Date(year, month - 1, 1));
  const nextMonth = () => setView(new Date(year, month + 1, 1));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: open ? "1.5px solid #f0661b" : "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: selected ? "#23262a" : "#9aa0a8", outline: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
        <span>{selected ? formatFr(selected) : placeholder}</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9aa0a8" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50, width: 300, background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, boxShadow: "0 24px 50px -18px rgba(33,36,40,0.3)", padding: 16 }}>
          {/* En-tête mois */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button type="button" onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "#5c616a" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", textTransform: "capitalize" }}>{MOIS[month]} {year}</span>
            <button type="button" onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "#5c616a" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          {/* Jours de la semaine */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
            {JOURS.map((j) => (
              <span key={j} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#9aa0a8", textTransform: "uppercase" }}>{j}</span>
            ))}
          </div>

          {/* Grille des jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((date, i) => {
              if (!date) return <span key={i} />;
              const isSel = isSameDay(date, selected);
              const isToday = isSameDay(date, today);
              return (
                <button key={i} type="button" onClick={() => pick(date)}
                  style={{
                    height: 36, borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: isSel ? 700 : 500,
                    background: isSel ? "#f0661b" : "transparent",
                    color: isSel ? "#fff" : isToday ? "#d9551a" : "#23262a",
                    boxShadow: isToday && !isSel ? "inset 0 0 0 1.5px #f0661b" : "none",
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "#fce6d6"; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f2efe9" }}>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} style={{ fontSize: 13, fontWeight: 600, color: "#9aa0a8", background: "none", border: "none", cursor: "pointer" }}>Effacer</button>
            <button type="button" onClick={() => pick(new Date())} style={{ fontSize: 13, fontWeight: 600, color: "#f0661b", background: "none", border: "none", cursor: "pointer" }}>Aujourd&apos;hui</button>
          </div>
        </div>
      )}
    </div>
  );
}