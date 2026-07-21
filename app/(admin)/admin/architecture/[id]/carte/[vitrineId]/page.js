import { notFound } from "next/navigation";
import { getCarteEdition } from "./actions";
import CarteEditForm from "./CarteEditForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { vitrineId } = await params;
  const carte = await getCarteEdition(vitrineId);
  return { title: carte ? `${carte.nom} · ${carte.gammeNom} · Admin` : "Carte introuvable" };
}

export default async function CartePage({ params }) {
  const { vitrineId } = await params;
  const carte = await getCarteEdition(vitrineId);
  if (!carte) notFound();

  return <CarteEditForm carte={carte} />;
}