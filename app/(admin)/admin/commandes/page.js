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
      <style>{`
        /* Mobile : seul "À préparer" est utile (le CA vit sur la page Ventes).
           Desktop : on garde les trois cartes de stats comme avant. */
        .cmd-stats { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 22px; }
        .cmd-stat-secondaire { display: none; }
        @media (min-width: 1024px) {
          .cmd-stats { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
          .cmd-stat-secondaire { display: flex; }
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Commandes</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Suivez et traitez les commandes passées sur le site.</p>
      </div>

      <div className="cmd-stats">
        <StatPrincipale aTraiter={aTraiter} />
        <StatCard label="Commandes payées" value={payees.length} icon="box" />
        <StatCard label="Chiffre d'affaires TTC" value={euro(caTotal)} icon="euro" />
      </div>

      <CommandesTable commandes={JSON.parse(JSON.stringify(commandes))} />
    </>
  );
}

// Carte mise en avant : le seul chiffre sur lequel on agit depuis cette page.
function StatPrincipale({ aTraiter }) {
  return (
    <div style={{
      background: aTraiter > 0
        ? "linear-gradient(135deg, #d9551a 0%, #f0661b 100%)"
        : "linear-gradient(135deg, #2c3137 0%, #212428 100%)",
      borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="bell" size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>À préparer</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "#fff", marginTop: 1 }}>{aTraiter}</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="cmd-stat-secondaire" style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "16px 18px", alignItems: "center", gap: 13 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: "#faf3ee", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={20} color="#f0661b" />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#9aa0a8", fontWeight: 600 }}>{label}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "#23262a", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}