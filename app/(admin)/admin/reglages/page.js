import { Icon } from "@/components/dashboard/Icon";
import { getReglages, getPaliersInstallation } from "./actions";
import { ReglagesForm } from "./ReglagesForm";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  const [reglages, paliers] = await Promise.all([
    getReglages(),
    getPaliersInstallation(),
  ]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="settings" size={22} />
        </span>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0, lineHeight: 1.1 }}>Réglages</h1>
          <p style={{ fontSize: 14, color: "#5c616a", margin: "3px 0 0" }}>Paramètres généraux de la boutique.</p>
        </div>
      </div>

      <ReglagesForm reglages={JSON.parse(JSON.stringify(reglages))} paliersInitiaux={JSON.parse(JSON.stringify(paliers))} />
    </>
  );
}