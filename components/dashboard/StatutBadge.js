export function StatutBadge({ publie }) {
  const ok = !!publie;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
        color: ok ? "#1f7a52" : "#9aa0a8",
        background: ok ? "rgba(36,158,124,0.12)" : "#f0ece4",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#249e7c" : "#b4b2a9" }} />
      {ok ? "Publié" : "Brouillon"}
    </span>
  );
}