import { Icon } from "@/components/dashboard/Icon";
import { CommandesTable } from "./CommandesTable";
import { getCommandes } from "./actions";

export const dynamic = "force-dynamic";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function CommandesPage() {
  const commandes = await getCommandes();

  const payees = commandes.filter((c) => c.paye);
  const caTotal = payees.reduce((s, c) => s + c.totalTTC, 0);
  const aTraiter = commandes.filter((c) => c.statut === "payee").length;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Commandes</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Suivez et traitez les commandes passées sur le site.</p>
      </div>

      {/* Stats rapides */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Commandes payées" value={payees.length} icon="box" />
        <StatCard label="À préparer" value={aTraiter} icon="bell" accent />
        <StatCard label="Chiffre d'affaires TTC" value={euro(caTotal)} icon="euro" />
      </div>

      <CommandesTable commandes={JSON.parse(JSON.stringify(commandes))} />
    </>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div style={{ background: accent ? "#f0661b" : "#fff", border: "1px solid " + (accent ? "#f0661b" : "#ece8e0"), borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: accent ? "rgba(255,255,255,0.2)" : "#faf3ee", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={20} color={accent ? "#fff" : "#f0661b"} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: accent ? "rgba(255,255,255,0.85)" : "#9aa0a8", fontWeight: 600 }}>{label}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: accent ? "#fff" : "#23262a", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}