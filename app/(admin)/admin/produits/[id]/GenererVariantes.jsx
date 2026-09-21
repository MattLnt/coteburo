"use client";

// Engendrer les variantes à chiffrer.
//
// POURQUOI CE BOUTON EXISTE
//   Une fiche saisie à la main n'avait aucune variante, et l'admin ne savait
//   pas en créer : on pouvait corriger un prix, jamais en ajouter un. Une
//   fiche créée à la main restait donc sans prix, définitivement.
//
//   Le croisement des réponses tarifaires les donne toutes : trois largeurs
//   par quatre coloris font douze variantes à chiffrer, et la matrice de
//   l'onglet Prix se remplit ligne à ligne.
//
// IL COMPTE AVANT D'ÉCRIRE
//   Sur une fiche déjà importée, le croisement complet dépasse souvent ce que
//   le fournisseur vend — l'armoire à rideaux croise cent cinquante-trois
//   variantes pour soixante et onze lignes au tarif. On annonce donc le
//   nombre avant de l'écrire, et l'on n'écrit rien sans confirmation.

import { useState, useTransition } from "react";
import { genererCombinaisons } from "./actions";

const BTN = "h-9 rounded-lg border border-line px-3 text-[13px] hover:border-orange hover:text-orange-dark disabled:opacity-40";

export default function GenererVariantes({ produitId }) {
  const [apercu, setApercu] = useState(null);   // null | {…} | { erreur }
  const [enCours, demarrer] = useTransition();

  const compter = () => demarrer(async () => {
    const r = await genererCombinaisons(produitId, { appliquer: false });
    setApercu(r?.ok === false ? { erreur: r.error } : r);
  });

  const ecrire = () => demarrer(async () => {
    const r = await genererCombinaisons(produitId, { appliquer: true });
    setApercu(r?.ok === false ? { erreur: r.error } : { fait: r.creees });
  });

  if (!apercu) {
    return (
      <button type="button" className={BTN} disabled={enCours} onClick={compter}>
        {enCours ? "Calcul…" : "Engendrer les variantes manquantes"}
      </button>
    );
  }

  if (apercu.erreur) {
    return (
      <span className="flex items-center gap-3">
        <span className="text-[12.5px] text-orange-dark">{apercu.erreur}</span>
        <button type="button" className={BTN} onClick={() => setApercu(null)}>Fermer</button>
      </span>
    );
  }

  if (apercu.fait != null) {
    return (
      <span className="flex items-center gap-3">
        <span className="text-[12.5px] text-ink-soft">
          {apercu.fait === 0
            ? "Rien à ajouter : toutes les variantes existaient déjà."
            : `${apercu.fait} variante${apercu.fait > 1 ? "s" : ""} créée${apercu.fait > 1 ? "s" : ""}, sans prix.`}
        </span>
        <button type="button" className={BTN} onClick={() => setApercu(null)}>Fermer</button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <span className="text-[12.5px] text-ink-soft">
        Le croisement complet fait <strong>{apercu.total}</strong> variantes ;
        la fiche en porte {apercu.existantes}.
        {apercu.manquantes === 0
          ? " Rien à ajouter."
          : ` ${apercu.manquantes} seraient créées, sans prix, à chiffrer une par une.`}
      </span>
      <button type="button" className={BTN} onClick={() => setApercu(null)}>Annuler</button>
      {apercu.manquantes > 0 && (
        <button
          type="button"
          className={`${BTN} border-orange font-semibold text-orange-dark`}
          disabled={enCours}
          onClick={ecrire}
        >
          {enCours ? "Écriture…" : `Créer les ${apercu.manquantes}`}
        </button>
      )}
    </span>
  );
}
