import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DevisEditForm from "./DevisEditForm";
import { TVA_DEFAUT } from "@/lib/tva";

export const dynamic = "force-dynamic";

export default async function DevisDetailPage({ params }) {
  const { id } = await params;

  const devis = await prisma.devis.findUnique({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) notFound();

  // Taux de TVA courant : le chiffrage d un devis est un calcul EN COURS, il
  // suit donc le reglage actuel.
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 }, select: { tva: true } });

  return <DevisEditForm devis={JSON.parse(JSON.stringify(devis))} tauxTva={reglages?.tva ?? TVA_DEFAUT} />;
}