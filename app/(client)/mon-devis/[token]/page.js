import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rafraichirStatutsDevis } from "@/lib/devis";
import MonDevisClient from "./MonDevisClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votre devis · Côté BURO", robots: { index: false } };

export default async function MonDevisPage({ params }) {
  const { token } = await params;

  // Même ménage que côté admin : un client qui revient après un abandon de
  // paiement doit retrouver son devis dans un état cohérent.
  await rafraichirStatutsDevis();

  const devis = await prisma.devis.findUnique({
    where: { token },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) notFound();

  // Un devis pas encore envoyé ne doit pas être consultable, même avec le lien.
  if (["nouveau", "en_cours"].includes(devis.statut)) notFound();

  // Finitions disponibles pour chaque ligne issue du catalogue.
  //
  // Elles viennent des groupes de finition du modèle à choix, et non plus de
  // l'ancienne table GroupeFinition que la boutique ne lit plus : un client
  // acceptant son devis se voyait proposer des teintes d'avant la refonte,
  // ou aucune.
  const vitrineIds = [...new Set(devis.lignes.map((l) => l.vitrineId).filter(Boolean))];
  const vitrines = vitrineIds.length
    ? await prisma.produitVitrine.findMany({
        where: { id: { in: vitrineIds } },
        select: {
          id: true,
          choix: {
            where: { nature: "finition" },
            orderBy: { ordre: "asc" },
            select: {
              id: true, nom: true,
              valeurs: {
                orderBy: { ordre: "asc" },
                select: {
                  id: true, libelle: true, couleur: true, imageUrl: true,
                  // La teinte hérite de son modèle de nuancier ce qu'elle ne
                  // porte pas elle-même : corriger la bibliothèque corrige le
                  // devis du même mouvement.
                  modele: { select: { couleur: true, imageUrl: true } },
                  palette: { select: { nom: true } },
                },
              },
            },
          },
        },
      })
    : [];

  const finitionsParVitrine = {};
  for (const v of vitrines) {
    finitionsParVitrine[v.id] = v.choix
      .filter((g) => g.valeurs.length > 0)
      .map((g) => ({
        id: g.id,
        nom: g.nom,
        finitions: g.valeurs.map((f) => ({
          id: f.id,
          nom: f.libelle,
          couleur: f.couleur ?? f.modele?.couleur ?? null,
          imageUrl: f.imageUrl ?? f.modele?.imageUrl ?? null,
          paletteNom: f.palette?.nom ?? null,
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