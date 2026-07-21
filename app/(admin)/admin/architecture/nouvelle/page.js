import { getDonneesCreationGamme } from "../actions";
import NouvelleGammeForm from "./NouvelleGammeForm";

export default async function NouvelleGammePage() {
  const donnees = await getDonneesCreationGamme();
  return <NouvelleGammeForm donnees={donnees} />;
}