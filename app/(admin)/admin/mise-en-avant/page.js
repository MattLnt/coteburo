import { listerCibles } from "./actions";
import MiseEnAvantClient from "./MiseEnAvantClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mise en avant · Admin" };

// Les douze premières cartes de chaque catégorie et de chaque rayon. L'arbre
// à gauche, la sélection à droite ; le reste des fiches en dessous, pour
// piocher.
export default async function MiseEnAvantPage() {
  const cibles = await listerCibles();
  return <MiseEnAvantClient cibles={cibles} />;
}
