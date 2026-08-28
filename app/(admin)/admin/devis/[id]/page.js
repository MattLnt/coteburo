import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DevisEditForm from "./DevisEditForm";

export const dynamic = "force-dynamic";

export default async function DevisDetailPage({ params }) {
  const { id } = await params;

  const devis = await prisma.devis.findUnique({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) notFound();

  return <DevisEditForm devis={JSON.parse(JSON.stringify(devis))} />;
}