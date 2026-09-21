import { listerGammesATrier } from "./actions";
import TriVisuels from "./TriVisuels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visuels · Admin" };

// Le tri des visuels ne vaut qu'en local : il lit un dossier du disque que le
// serveur de production n'a pas. L'écran le dit plutôt que de rester vide.
export default async function VisuelsPage() {
  const r = await listerGammesATrier();

  if (!r.ok) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10">
        <h1 className="font-display text-xl font-bold">Tri des visuels</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
          {r.error} Cet écran lit les fichiers d'un disque : il ne fonctionne
          que sur le poste qui porte la médiathèque. Renseignez
          {" "}<code>MEDIATHEQUE_LOCALE</code> si elle est ailleurs que sur le
          Bureau.
        </p>
      </div>
    );
  }

  return <TriVisuels gammes={r.gammes} racine={r.racine} />;
}
