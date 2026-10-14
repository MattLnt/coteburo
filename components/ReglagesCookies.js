"use client";
import { useConsentement } from "@/components/ConsentementContext";

// Revenir sur son choix, depuis la page confidentialité.
//
// Un consentement qu'on ne peut pas retirer n'en est pas un. Ce bloc dit
// l'état courant en français, et offre le geste inverse de celui qui a été
// fait — sans jamais présenter « refuser » comme une sortie de secours
// cachée.

const LIBELLES = {
  accepte: "Vous avez accepté les cookies de mesure.",
  refuse: "Vous avez refusé les cookies de mesure. Aucune mesure d'audience n'est effectuée.",
  inconnu: "Vous n'avez pas encore fait de choix. En attendant, aucune mesure d'audience n'est effectuée.",
};

export default function ReglagesCookies() {
  const { etat, charge, accepter, refuser } = useConsentement();

  // Le temps de relire le choix : un encadré de la bonne taille, pour que la
  // page ne saute pas sous le doigt.
  if (!charge) {
    return <div className="h-[132px] rounded-2xl border border-line bg-surface animate-pulse" />;
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-[13.5px] text-ink">{LIBELLES[etat]}</p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {etat !== "accepte" && (
          <button
            type="button"
            onClick={accepter}
            className="rounded-full bg-orange px-6 py-3 text-[13.5px] font-semibold text-white transition hover:bg-orange-dark"
          >
            Accepter les cookies de mesure
          </button>
        )}
        {etat !== "refuse" && (
          <button
            type="button"
            onClick={refuser}
            className="rounded-full border border-line bg-white px-6 py-3 text-[13.5px] font-semibold text-ink transition hover:bg-ink hover:text-white"
          >
            Refuser les cookies de mesure
          </button>
        )}
      </div>
    </div>
  );
}
