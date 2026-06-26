"use client";
import { useState, useRef, useEffect } from "react";

export function FormSelect({ label, value, onChange, options = [], placeholder = "Sélectionner", required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };

  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = norm.find((o) => o.value === value);
  const displayLabel = selected ? selected.label : "";

  const renderBadge = (badge) => {
    if (!badge) return null;
    return (
      <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, color: badge.color || "#d9551a", background: badge.bg || "rgba(240,102,27,0.12)" }}>
        {badge.dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.color || "#f0661b" }} />}
        {badge.label}
      </span>
    );
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && <label style={labelStyle}>{label}{required && <span style={{ color: "#f0661b" }}> *</span>}</label>}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 10,
          border: `1.5px solid ${open ? "#f0661b" : "#e8e3da"}`,
          background: "#faf8f4", fontSize: 14, color: displayLabel ? "#23262a" : "#9aa0a8",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          cursor: "pointer", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
          fontWeight: displayLabel ? 600 : 400, textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayLabel || placeholder}</span>
          {selected && renderBadge(selected.badge)}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a92a6" strokeWidth="2" style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60,
          background: "#fff", border: "1px solid #ece8e0", borderRadius: 12,
          boxShadow: "0 16px 40px rgba(33,38,42,0.14)", overflow: "hidden", padding: 6,
          maxHeight: 280, overflowY: "auto",
        }}>
          {norm.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8,
                  border: "none", cursor: "pointer", fontSize: 14,
                  background: active ? "rgba(240,102,27,0.12)" : "transparent",
                  color: active ? "#23262a" : "#3d4759", fontWeight: active ? 600 : 500,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f5f1ec"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                  {renderBadge(opt.badge)}
                </span>
                {active && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="3" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}