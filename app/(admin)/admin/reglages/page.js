import { Icon } from "@/components/dashboard/Icon";
import { getReglages, getPaliersInstallation } from "./actions";
import { getCampagnesActives } from "@/lib/promotions";
import { libelleRemise } from "@/lib/bandeau";
import { ReglagesForm } from "./ReglagesForm";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  const [reglages, paliers, campagnes] = await Promise.all([
    getReglages(),
    getPaliersInstallation(),
    getCampagnesActives(),
  ]);

  // De quoi afficher, à côté de l'interrupteur, le message qui sortira
  // réellement — celui rédigé dans la campagne, ou la remise chiffrée à défaut.
  const campagnesLisibles = campagnes
    .filter((c) => c.valeur > 0)
    .map((c) => ({ id: c.id, libelle: (c.messageBandeau || "").trim() || libelleRemise(c) }));

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

      <ReglagesForm reglages={JSON.parse(JSON.stringify(reglages))} paliersInitiaux={JSON.parse(JSON.stringify(paliers))} campagnes={campagnesLisibles} />
    </>
  );
}