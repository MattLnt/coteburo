import { Icon } from "@/components/dashboard/Icon";
import { RealisationsManager } from "./RealisationsManager";
import { getRealisations } from "./actions";

export const dynamic = "force-dynamic";

export default async function RealisationsAdminPage() {
  const realisations = await getRealisations();

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Réalisations</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Présentez vos aménagements réalisés sur le site.</p>
      </div>

      <RealisationsManager realisations={JSON.parse(JSON.stringify(realisations))} />
    </>
  );
}