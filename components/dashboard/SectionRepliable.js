"use client";
import { useState } from "react";

export default function SectionRepliable({ titre, sousTitre, defaultOpen = false, badge, children }) {
  const [ouvert, setOuvert] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOuvert((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          padding: "18px 24px",
          borderRadius: 16,
          border: "1px solid " + (ouvert ? "#f0661b" : "#ece8e0"),
          background: ouvert ? "#fef4ee" : "#fff",
          cursor: "pointer",
          textAlign: "left",
          transition: "all .15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: ouvert ? "#f0661b" : "#d8d3c9",
            }}
          />
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#23262a" }}>{titre}</span>
            {sousTitre && !ouvert && (
              <span style={{ fontSize: 12.5, color: "#9aa0a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sousTitre}</span>
            )}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {badge}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ouvert ? "#f0661b" : "#9aa0a8"} strokeWidth="2.4"
            style={{ transform: ouvert ? "rotate(180deg)" : "none", transition: "transform .2s" }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {ouvert && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}