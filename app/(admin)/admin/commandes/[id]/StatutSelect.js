"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStatutCommande } from "../actions";
import { STATUTS } from "@/components/dashboard/StatutCommande";

const ORDRE = ["en_attente", "payee", "en_preparation", "expediee", "livree", "annulee"];

export function StatutSelect({ commandeId, statutActuel }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statut, setStatut] = useState(statutActuel);
  const [saved, setSaved] = useState(false);

  const changer = (nouveau) => {
    setStatut(nouveau);
    setSaved(false);
    startTransition(async () => {
      await updateStatutCommande(commandeId, nouveau);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ORDRE.map((s) => {
          const info = STATUTS[s];
          const actif = statut === s;
          return (
            <button
              key={s}
              onClick={() => changer(s)}
              disabled={isPending}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10,
                border: actif ? `1.5px solid ${info.color}` : "1px solid #e8e3da",
                background: actif ? info.bg : "#fff",
                cursor: isPending ? "default" : "pointer", textAlign: "left", width: "100%",
                transition: "all .12s", opacity: isPending ? 0.6 : 1,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: info.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: actif ? 700 : 500, color: actif ? info.color : "#23262a" }}>{info.label}</span>
            </button>
          );
        })}
      </div>
      {saved && <p style={{ fontSize: 12.5, color: "#1f7a52", fontWeight: 600, marginTop: 10, textAlign: "center" }}>✓ Statut mis à jour</p>}
    </div>
  );
}