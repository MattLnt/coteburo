import { notFound } from "next/navigation";
import Link from "next/link";
import { getRealisation, getProduitsPourLiaison } from "../actions";
import { RealisationEditForm } from "./RealisationEditForm";

export const dynamic = "force-dynamic";

export default async function RealisationDetailAdminPage({ params }) {
  const { id } = await params;
  const [realisation, produitsDisponibles] = await Promise.all([
    getRealisation(id),
    getProduitsPourLiaison(),
  ]);
  if (!realisation) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13.5, color: "#5c616a", flexWrap: "wrap" }}>
        <Link href="/admin/realisations" style={{ color: "#f0661b", textDecoration: "none", fontWeight: 600 }}>← Réalisations</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: "#23262a" }}>{realisation.titre}</span>
      </div>

      <RealisationEditForm
        realisation={JSON.parse(JSON.stringify(realisation))}
        produitsDisponibles={JSON.parse(JSON.stringify(produitsDisponibles))}
      />
    </>
  );
}