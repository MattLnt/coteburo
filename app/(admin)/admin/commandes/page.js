import { Icon } from "@/components/dashboard/Icon";
import { CommandesTable } from "./CommandesTable";
import { getCommandes } from "./actions";

export const dynamic = "force-dynamic";

const euro0 = (v) => `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;

export default async function CommandesPage() {
  const commandes = await getCommandes();

  const payees = commandes.filter((c) => c.paye);
  const caTotal = payees.reduce((s, c) => s + c.totalTTC, 0);
  const aTraiter = commandes.filter((c) => c.statut === "payee").length;

  const titreSection = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#9aa0a8", margin: "0 0 10px",
  };

  return (
    <>
      <style>{`
        .cmd-resume { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 22px; }
        .cmd-resume-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (min-width: 1024px) {
          .cmd-resume { grid-template-columns: 1.4fr 1fr 1fr; }
          .cmd-resume-duo { display: contents; }
        }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Commandes</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Suivez et traitez les commandes passées sur le site.</p>
      </div>

      {/* ─── En résumé ─── */}
      <p style={titreSection}>En résumé</p>
      <div className="cmd-resume">
        <div style={{
          background: aTraiter > 0
            ? "linear-gradient(135deg, #d9551a 0%, #f0661b 100%)"
            : "linear-gradient(135deg, #2c3137 0%, #212428 100%)",
          borderRadius: 16, padding: "18px 20px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", bottom: -40, right: 10, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", margin: "0 0 8px", fontWeight: 500 }}>À préparer</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>{aTraiter}</p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.78)", margin: "8px 0 0", fontWeight: 500 }}>
                {aTraiter > 0 ? "Payées, en attente d'envoi" : "Rien en attente"}
              </p>
            </div>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="bell" size={18} color="#fff" />
            </span>
          </div>
        </div>

        <div className="cmd-resume-duo">
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 6px", fontWeight: 500 }}>Commandes payées</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "#23262a", margin: 0, lineHeight: 1.1 }}>{payees.length}</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 6px", fontWeight: 500 }}>Chiffre d'affaires TTC</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "#23262a", margin: 0, lineHeight: 1.1 }}>{euro0(caTotal)}</p>
          </div>
        </div>
      </div>

      <CommandesTable commandes={JSON.parse(JSON.stringify(commandes))} />
    </>
  );
}