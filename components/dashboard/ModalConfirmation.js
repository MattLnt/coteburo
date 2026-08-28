"use client";
import { useEffect } from "react";

// Modale de confirmation partagée — remplace les confirm() natifs, qui ne se
// stylent pas et affichent le nom de domaine sur mobile.
//
// ton : "normal" (action neutre) | "danger" (suppression, irréversible)
export default function ModalConfirmation({
  ouvert,
  titre,
  message,
  labelConfirmer = "Confirmer",
  labelAnnuler = "Annuler",
  ton = "normal",
  chargement = false,
  onConfirmer,
  onAnnuler,
}) {
  // Échap ferme la modale, et le scroll de la page est bloqué derrière.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e) => { if (e.key === "Escape" && !chargement) onAnnuler?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [ouvert, chargement, onAnnuler]);

  if (!ouvert) return null;

  const danger = ton === "danger";
  const accent = danger ? "#c4735a" : "#f0661b";
  const accentFond = danger ? "#fbe9e7" : "#fce6d6";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}>
      <style>{`
        .mc-boite { width: 100%; border-radius: 22px 22px 0 0; }
        @media (min-width: 640px) {
          .mc-boite { width: 400px; border-radius: 20px; margin: auto; }
        }
      `}</style>

      <div onClick={() => !chargement && onAnnuler?.()}
        style={{ position: "absolute", inset: 0, background: "rgba(33,36,40,0.5)", backdropFilter: "blur(2px)" }} />

      <div className="mc-boite" style={{
        position: "relative", background: "#fff", padding: "22px 20px",
        paddingBottom: "calc(22px + env(safe-area-inset-bottom))",
        boxShadow: "0 -8px 40px rgba(33,36,40,0.2)",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: accentFond,
          display: "grid", placeItems: "center", color: accent, marginBottom: 14,
        }}>
          {danger ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
          )}
        </div>

        <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#23262a", margin: "0 0 6px", lineHeight: 1.3 }}>
          {titre}
        </p>
        {message && (
          <p style={{ fontSize: 13, color: "#5c616a", margin: 0, lineHeight: 1.6 }}>{message}</p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onAnnuler} disabled={chargement}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 999, border: "1px solid #ece8e0",
              background: "#fff", fontSize: 13.5, fontWeight: 600, color: "#5c616a",
              cursor: chargement ? "default" : "pointer", fontFamily: "inherit", opacity: chargement ? 0.5 : 1,
            }}>
            {labelAnnuler}
          </button>
          <button onClick={onConfirmer} disabled={chargement}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 999, border: "none",
              background: accent, fontSize: 13.5, fontWeight: 700, color: "#fff",
              cursor: chargement ? "default" : "pointer", fontFamily: "inherit", opacity: chargement ? 0.6 : 1,
            }}>
            {chargement ? "…" : labelConfirmer}
          </button>
        </div>
      </div>
    </div>
  );
}