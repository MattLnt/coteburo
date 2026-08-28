import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MonDevisClient from "./MonDevisClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votre devis · Côté BURO", robots: { index: false } };

export default async function MonDevisPage({ params }) {
  const { token } = await params;

  const devis = await prisma.devis.findUnique({
    where: { token },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) notFound();

  // Un devis pas encore envoyé ne doit pas être consultable, même avec le lien.
  if (["nouveau", "en_cours"].includes(devis.statut)) notFound();

  // Finitions disponibles pour chaque ligne issue du catalogue.
  // Elles viennent de la fiche produit ET de sa gamme (deux niveaux possibles).
  const vitrineIds = [...new Set(devis.lignes.map((l) => l.vitrineId).filter(Boolean))];
  const vitrines = vitrineIds.length
    ? await prisma.produitVitrine.findMany({
        where: { id: { in: vitrineIds } },
        include: {
          groupesFinition: { include: { finitions: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } },
          gamme: {
            include: { groupesFinition: { include: { finitions: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } } },
          },
        },
      })
    : [];

  const finitionsParVitrine = {};
  for (const v of vitrines) {
    const groupes = [...(v.gamme?.groupesFinition || []), ...(v.groupesFinition || [])];
    finitionsParVitrine[v.id] = groupes
      .filter((g) => g.finitions.length > 0)
      .map((g) => ({
        id: g.id,
        nom: g.nom,
        finitions: g.finitions.map((f) => ({
          id: f.id,
          nom: f.nom,
          couleur: f.couleur,
          imageUrl: f.imageUrl,
          paletteNom: f.paletteNom,
        })),
      }));
  }

  const reglages = await prisma.reglages.findUnique({ where: { id: 1 } });

  return (
    <MonDevisClient
      devis={JSON.parse(JSON.stringify(devis))}
      finitionsParVitrine={JSON.parse(JSON.stringify(finitionsParVitrine))}
      telephone={reglages?.telephone || "07 81 02 06 31"}
      email={reglages?.email || "contact@coteburo.fr"}
    />
  );
}