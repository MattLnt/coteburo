import { getContexteImport } from "./actions";
import ImportForm from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const contexte = await getContexteImport();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Import de gamme</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>
          Déposez un fichier JSON, vérifiez l&apos;aperçu, puis importez. Les produits arrivent en brouillon — prix et photos restent à compléter.
        </p>
      </div>

      <ImportForm contexte={contexte} />
    </>
  );
}