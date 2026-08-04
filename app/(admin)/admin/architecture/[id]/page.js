import { notFound } from "next/navigation";
import { getGammeEdition } from "./actions";
import GammeEditForm from "./GammeEditForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await getGammeEdition(id);
  return { title: data ? `${data.gamme.nom} · Gammes · Admin` : "Gamme introuvable" };
}

export default async function GammeEditPage({ params }) {
  const { id } = await params;
  const data = await getGammeEdition(id);
  if (!data) notFound();

  return (
    <GammeEditForm
      gamme={data.gamme}
      categoriesMarque={data.categoriesMarque}
      marques={data.marques}
    />
  );
}