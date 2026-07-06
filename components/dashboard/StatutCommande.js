const STATUTS = {
  en_attente: { label: "En attente", bg: "#fef3e2", color: "#b45309" },
  payee: { label: "Payée", bg: "#e8f6f0", color: "#1f7a52" },
  en_preparation: { label: "En préparation", bg: "#e7f0fb", color: "#1d4ed8" },
  expediee: { label: "Expédiée", bg: "#ede9fe", color: "#6d28d9" },
  livree: { label: "Livrée", bg: "#e8f6f0", color: "#166534" },
  annulee: { label: "Annulée", bg: "#f3f4f6", color: "#6b7280" },
  echec_paiement: { label: "Échec paiement", bg: "#fde8e8", color: "#c0392b" },
};

export function StatutCommande({ statut }) {
  const s = STATUTS[statut] || STATUTS.en_attente;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999, background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

export { STATUTS };