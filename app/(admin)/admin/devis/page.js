import { prisma } from "@/lib/prisma";
import DevisTable from "./DevisTable";

export const dynamic = "force-dynamic";

export default async function DevisAdminPage() {
  const devis = await prisma.devis.findMany({
    orderBy: { createdAt: "desc" },
    include: { lignes: { select: { id: true } } },
  });

  const nouveaux = devis.filter((d) => d.statut === "nouveau").length;
  const enCours = devis.filter((d) => ["en_cours", "envoye"].includes(d.statut)).length;
  const acceptes = devis.filter((d) => d.statut === "accepte");
  const caAccepte = acceptes.reduce((s, d) => s + (d.totalTTC || 0), 0);
  // Taux de transformation sur les devis effectivement envoyés — les demandes
  // encore à chiffrer fausseraient le calcul.
  const traites = devis.filter((d) => ["accepte", "refuse", "expire"].includes(d.statut)).length;
  const tauxAccept = traites > 0 ? Math.round((acceptes.length / traites) * 100) : null;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Devis</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Demandes reçues, chiffrage et suivi des propositions.</p>
      </div>

      <DevisTable
        devis={JSON.parse(JSON.stringify(devis))}
        stats={{ total: devis.length, nouveaux, enCours, acceptes: acceptes.length, caAccepte, tauxAccept }}
      />
    </>
  );
}