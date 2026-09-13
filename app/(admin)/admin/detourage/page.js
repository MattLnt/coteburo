import { getProduitsAvecImages, getMarques } from "./actions";
import DetourageClient from "./DetourageClient";

export const dynamic = "force-dynamic";

export default async function DetouragePage() {
  const [produits, marques] = await Promise.all([
    getProduitsAvecImages(),
    getMarques(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0 }}>
          Détourage en lot
        </h1>
        <p style={{ fontSize: 13.5, color: "#5c616a", margin: "6px 0 0", lineHeight: 1.6 }}>
          Retire le fond des visuels produits pour ne garder que l'objet.
          Le traitement se fait dans votre navigateur — laissez l'onglet ouvert.
        </p>
      </div>

      <DetourageClient
        produits={JSON.parse(JSON.stringify(produits))}
        marques={JSON.parse(JSON.stringify(marques))}
      />
    </>
  );
}