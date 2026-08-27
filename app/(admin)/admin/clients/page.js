import { Icon } from "@/components/dashboard/Icon";
import { getClients } from "./actions";
import { ClientsTable } from "./ClientsTable";

export const dynamic = "force-dynamic";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default async function ClientsPage() {
  const clients = await getClients();

  const avecCompte = clients.filter((c) => c.possedeCompte).length;
  const caTotal = clients.reduce((s, c) => s + c.totalDepense, 0);

  return (
    <>
      <style>{`
        /* Mobile : une seule carte, le CA cumulé, avec le reste en sous-ligne.
           Desktop : les trois cartes de stats comme avant. */
        .cli-stats { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 22px; }
        .cli-stat-secondaire { display: none; }
        .cli-stat-sousligne { display: block; }
        @media (min-width: 1024px) {
          .cli-stats { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
          .cli-stat-secondaire { display: flex; }
          .cli-stat-sousligne { display: none; }
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Clients</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Tous les clients ayant commandé — avec ou sans compte créé.</p>
      </div>

      <div className="cli-stats">
        <StatPrincipale caTotal={euro(caTotal)} nbClients={clients.length} avecCompte={avecCompte} />
        <StatCard label="Clients" value={clients.length} icon="eye" />
        <StatCard label="Avec compte" value={avecCompte} icon="box" />
      </div>

      <ClientsTable clients={JSON.parse(JSON.stringify(clients))} />
    </>
  );
}

// Carte mise en avant : le CA cumulé, avec le détail des clients en sous-ligne
// (visible en mobile uniquement, où les deux autres cartes sont masquées).
function StatPrincipale({ caTotal, nbClients, avecCompte }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #f0661b 0%, #f6925a 100%)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="euro" size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>CA cumulé TTC</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "#fff", marginTop: 1 }}>{caTotal}</div>
          <div className="cli-stat-sousligne" style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: 500 }}>
            {nbClients} client{nbClients > 1 ? "s" : ""} · {avecCompte} avec compte
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="cli-stat-secondaire" style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "16px 18px", alignItems: "center", gap: 13 }}>
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