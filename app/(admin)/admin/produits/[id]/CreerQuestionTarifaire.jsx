"use client";

// Croiser deux groupes de finition pour en faire une question tarifaire.
//
// POURQUOI CE BOUTON EXISTE
//   Quand la finition fait le prix, le fournisseur ne vend pas « une
//   structure » et « des portes » : il vend la paire, sous une référence
//   unique. La question porte donc dix-sept libellés « NOIR METAL / NOIR ».
//
//   Les taper à la main est hors de question. On part des deux groupes, on
//   croise, et les paires qui ne se vendent pas se décochent ensuite dans le
//   tableau croisé de la question — une case, un clic.
//
// QUAND NE PAS S'EN SERVIR
//   Si la finition ne change pas le prix, ce qui est le cas de deux cent
//   trente-trois fiches du catalogue, les deux groupes restent deux groupes
//   de finition et il n'y a pas de question tarifaire à créer.

import { useState } from "react";
import { croiserGroupes } from "./actions";
import Selecteur from "@/components/dashboard/Selecteur";

const BTN = "h-9 rounded-lg border border-line px-3 text-[13px] hover:border-orange hover:text-orange-dark disabled:opacity-40";

export default function CreerQuestionTarifaire({ produit, finitions, agir }) {
  const [ouvert, setOuvert] = useState(false);
  const [a, setA] = useState(finitions[0]?.id || "");
  const [b, setB] = useState(finitions[1]?.id || "");
  const [nom, setNom] = useState("");

  if (finitions.length < 2) return null;

  const gA = finitions.find((g) => g.id === a);
  const gB = finitions.find((g) => g.id === b);
  const paires = (gA?.valeurs.length || 0) * (gB?.valeurs.length || 0);

  if (!ouvert) {
    return (
      <button type="button" className={BTN} onClick={() => setOuvert(true)}>
        Croiser deux groupes…
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-orange bg-orange-tint/30 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
        Une question tarifaire à partir de deux groupes
      </div>
      <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
        À n'employer que si la finition change le prix. Le fournisseur vend
        alors la paire sous une référence unique, et la question doit porter
        les paires — pas les pièces séparément.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Première pièce</span>
          <Selecteur
            className="w-[220px]"
            ariaLabel="Première pièce"
            valeur={a}
            onChange={setA}
            options={finitions.map((g) => ({
              valeur: g.id, libelle: g.nom, detail: `${g.valeurs.length} teintes`,
              couleur: g.valeurs[0]?.couleur, imageUrl: g.valeurs[0]?.imageUrl,
            }))}
          />
        </label>
        <span className="pb-2 text-ink-soft">×</span>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Seconde pièce</span>
          <Selecteur
            className="w-[220px]"
            ariaLabel="Seconde pièce"
            valeur={b}
            onChange={setB}
            options={finitions.map((g) => ({
              valeur: g.id, libelle: g.nom, detail: `${g.valeurs.length} teintes`,
              couleur: g.valeurs[0]?.couleur, imageUrl: g.valeurs[0]?.imageUrl,
            }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Nom de la question</span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder={gA && gB ? `${gA.nom} et ${gB.nom}` : "Finition"}
            className="h-9 w-[220px] rounded-lg border border-line px-2.5 text-[13px]"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] text-ink-soft">
          {a === b
            ? "Choisissez deux groupes différents."
            : `${paires} paire${paires > 1 ? "s" : ""} seront créées — décochez ensuite celles qui ne se vendent pas.`}
        </span>
        <span className="flex-1" />
        <button type="button" className={BTN} onClick={() => setOuvert(false)}>Annuler</button>
        <button
          type="button"
          className={`${BTN} border-orange font-semibold text-orange-dark`}
          disabled={a === b || !paires}
          onClick={() => {
            agir(croiserGroupes(produit.id, { nom, groupeAId: a, groupeBId: b }));
            setOuvert(false);
            setNom("");
          }}
        >
          Créer la question
        </button>
      </div>
    </div>
  );
}
