import { prisma } from "@/lib/prisma";
import { VentesDashboard } from "./VentesDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ventes" };

export default async function VentesPage() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);

  // Seules les commandes payées comptent dans le chiffre d'affaires : une commande
  // "en_attente" peut ne jamais aboutir (abandon au paiement Stripe).
  const [
    aggMois,
    aggMoisPrecedent,
    aggTotal,
    nbATraiter,
    nbClients,
    dernieresCommandes,
    derniersClients,
  ] = await Promise.all([
    prisma.commande.aggregate({
      where: { paye: true, createdAt: { gte: debutMois } },
      _sum: { totalTTC: true },
      _count: true,
    }),
    prisma.commande.aggregate({
      where: { paye: true, createdAt: { gte: debutMoisPrecedent, lt: debutMois } },
      _sum: { totalTTC: true },
      _count: true,
    }),
    prisma.commande.aggregate({
      where: { paye: true },
      _sum: { totalTTC: true },
      _count: true,
    }),
    prisma.commande.count({ where: { paye: true, statut: { in: ["en_attente", "payee", "en_preparation"] } } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.commande.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, numero: true, prenom: true, nom: true, societe: true,
        totalTTC: true, statut: true, paye: true, createdAt: true,
        _count: { select: { lignes: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, nom: true, email: true, createdAt: true },
    }),
  ]);

  const caMois = aggMois._sum.totalTTC || 0;
  const caMoisPrecedent = aggMoisPrecedent._sum.totalTTC || 0;
  // Pas d'évolution calculable si le mois précédent est à zéro (division par zéro).
  const evolution = caMoisPrecedent > 0
    ? Math.round(((caMois - caMoisPrecedent) / caMoisPrecedent) * 100)
    : null;

  const nbMois = aggMois._count || 0;
  const nbTotal = aggTotal._count || 0;
  const caTotal = aggTotal._sum.totalTTC || 0;
  const panierMoyen = nbTotal > 0 ? caTotal / nbTotal : 0;

  const donnees = {
    caMois,
    caMoisPrecedent,
    evolution,
    nbMois,
    panierMoyen,
    caTotal,
    nbTotal,
    nbATraiter,
    nbClients,
    dernieresCommandes: dernieresCommandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      client: c.societe || `${c.prenom} ${c.nom}`.trim(),
      totalTTC: c.totalTTC,
      statut: c.statut,
      paye: c.paye,
      nbLignes: c._count.lignes,
      date: c.createdAt.toISOString(),
    })),
    derniersClients: derniersClients.map((u) => ({
      id: u.id,
      nom: u.nom || "—",
      email: u.email,
      date: u.createdAt.toISOString(),
    })),
  };

  return <VentesDashboard donnees={donnees} />;
}