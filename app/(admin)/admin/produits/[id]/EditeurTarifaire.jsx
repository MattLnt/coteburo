"use client";

// L'éditeur d'une question tarifaire — celle qui fait le prix.
//
// CE QU'IL REMPLACE
//   « Nom du choix », puis dix-sept lignes « NOIR METAL / NOIR » les unes
//   sous les autres. On ne voyait ni ce que ces lignes veulent dire, ni ce
//   que le client en verra, ni ce que le fournisseur vend vraiment.
//
// CE QU'IL MONTRE, DANS CET ORDRE
//   1. Ce que le client choisit. Une rangée de pastilles par pièce quand la
//      question en agrège plusieurs, la liste des réponses sinon.
//   2. Ce que le fournisseur vend. Un tableau croisé : en ligne la première
//      pièce, en colonne la seconde, et une case remplie là où la paire
//      existe au tarif. Les trous s'y voient — sur l'armoire à rideaux,
//      quatre paires sur vingt et une ne sont pas vendues.
//   3. Les lignes du tarif, repliées. C'est la donnée brute ; on la corrige
//      rarement et on ne la lit jamais pour comprendre.

import { useState, useTransition } from "react";
import {
  majChoix, supprimerChoix, creerValeur, majValeur, supprimerValeur, basculerPaire,
} from "./actions";

const BTN = "h-9 rounded-lg border border-line px-3 text-[13px] hover:border-orange hover:text-orange-dark disabled:opacity-40";
const ETIQ = "text-[11px] font-semibold uppercase tracking-wider text-ink-soft";

function Champ({ valeur, onEnregistrer, className = "", ...props }) {
  const [v, setV] = useState(valeur ?? "");
  const [erreur, setErreur] = useState(null);
  const [enCours, demarrer] = useTransition();

  return (
    <span className="flex flex-col">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (String(v) === String(valeur ?? "")) return;
          demarrer(async () => {
            const r = await onEnregistrer(v);
            if (r?.ok === false) { setErreur(r.error); setV(valeur ?? ""); }
            else setErreur(null);
          });
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={`h-9 rounded-lg border px-2.5 text-[13px] ${
          erreur ? "border-orange" : "border-line"
        } ${enCours ? "opacity-60" : ""} ${className}`}
        {...props}
      />
      {erreur && <span className="mt-1 text-[11px] leading-tight text-orange-dark">{erreur}</span>}
    </span>
  );
}

function Pastille({ couleur, imageUrl, taille = 18 }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full border border-line bg-cover bg-center align-middle"
      style={{
        width: taille, height: taille,
        ...(imageUrl ? { backgroundImage: `url(${imageUrl})` } : { background: couleur || "#f3efe8" }),
      }}
    />
  );
}

/**
 * Le tableau croisé des paires vendues.
 *
 * Il ne vaut que pour deux pièces : au-delà, un tableau à trois entrées ne se
 * lit plus, et les rangées de pastilles ci-dessus disent déjà l'essentiel.
 */
function TableauCroise({ decomposition, choix, agir }) {
  // Le séparateur est celui qu'emploie déjà le tarif de cette fiche : certains
  // fournisseurs écrivent « A / B », d'autres « A - B ».
  const sep = choix.valeurs[0]?.libelle.match(/\s+\/\s+|\s+-\s+/)?.[0] || " / ";
  const [lignes, colonnes] = decomposition.positions;
  let vendues = 0;
  for (const L of lignes.valeurs) {
    for (const C of colonnes.valeurs) {
      if (decomposition.recomposer([L.part, C.part])) vendues += 1;
    }
  }
  const possibles = lignes.valeurs.length * colonnes.valeurs.length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className={ETIQ}>Ce que le fournisseur vend</span>
        <span className="text-[12.5px] text-ink-soft">
          {vendues} paire{vendues > 1 ? "s" : ""} sur {possibles} possible{possibles > 1 ? "s" : ""}
          {vendues < possibles && ` — ${possibles - vendues} au tarif n'existe${possibles - vendues > 1 ? "nt" : ""} pas`}
        </span>
        <span className="flex-1" />
        <span className="text-[12px] text-ink-soft/80">
          Cliquez une case pour vendre la paire, ou cesser de la vendre.
        </span>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-2 py-1.5 text-left font-semibold">
                <span className="text-ink-soft">{lignes.nom}</span>
                <span className="px-1 text-ink-soft/50">╲</span>
                <span className="text-ink-soft">{colonnes.nom}</span>
              </th>
              {colonnes.valeurs.map((C) => (
                <th key={C.part} className="px-1.5 py-1.5 align-bottom font-normal">
                  <span className="flex flex-col items-center gap-1">
                    <Pastille couleur={C.couleur} imageUrl={C.imageUrl} taille={16} />
                    <span className="max-w-[70px] leading-tight">{C.libelle}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.valeurs.map((L) => (
              <tr key={L.part} className="border-t border-line/60">
                <th className="sticky left-0 z-10 bg-surface px-2 py-1.5 text-left font-normal">
                  <span className="flex items-center gap-1.5">
                    <Pastille couleur={L.couleur} imageUrl={L.imageUrl} taille={16} />
                    {L.libelle}
                  </span>
                </th>
                {colonnes.valeurs.map((C) => {
                  const paire = decomposition.recomposer([L.part, C.part]);
                  const libelle = paire || `${L.part}${sep}${C.part}`;
                  return (
                    <td key={C.part} className={`p-0 text-center ${paire ? "" : "bg-surface-2/60"}`}>
                      <button
                        type="button"
                        title={paire ? `${paire} — vendue, cliquer pour retirer` : `${libelle} — cliquer pour vendre`}
                        onClick={() => agir(basculerPaire(choix.id, libelle))}
                        className="h-full w-full px-2.5 py-1.5 hover:bg-orange-tint/50"
                        aria-label={libelle}
                      >
                        {paire
                          ? <span className="text-emerald-600">●</span>
                          : <span className="text-ink-soft/30">·</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EditeurTarifaire({ choix, decomposition, agir }) {
  const [brutes, setBrutes] = useState(false);
  const [nouvelle, setNouvelle] = useState("");

  return (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-4">

      {/* ── Le réglage du choix ────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={ETIQ}>Nom de la question</span>
          <Champ
            valeur={choix.nom}
            onEnregistrer={(v) => majChoix(choix.id, { nom: v })}
            className="w-[240px]"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={ETIQ}>Clé</span>
          <code className="flex h-9 items-center rounded-lg bg-surface-2 px-2.5 text-[12.5px]">{choix.cle}</code>
        </div>
        <span className="flex-1" />
        <button type="button" onClick={() => agir(supprimerChoix(choix.id))} className={BTN}>
          Supprimer cette question
        </button>
      </div>

      <p className="max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
        Cette question porte le prix et la référence : chacune de ses réponses
        est une ligne du tarif fournisseur. La clé est celle qu'emploient les
        combinaisons de l'onglet Prix — la renommer les détacherait, aussi
        reste-t-elle fixe.
      </p>

      {/* ── 1. Ce que le client choisit ────────────────────────────── */}
      {decomposition ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={ETIQ}>Ce que le client choisit</span>
            <span className="text-[12.5px] text-ink-soft">
              Chaque réponse agrège {decomposition.positions.length} pièces. Le
              client les choisit une par une, jamais dans la liste brute.
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {decomposition.positions.map((pos, i) => (
              <div key={pos.nom || i} className="flex flex-wrap items-center gap-2">
                <span className="w-[170px] shrink-0 text-[12.5px] font-semibold">{pos.nom}</span>
                {pos.valeurs.map((v) => (
                  <span
                    key={v.part}
                    title={`${v.part} → ${v.libelle}`}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-2.5 text-[12px]"
                  >
                    <Pastille couleur={v.couleur} imageUrl={v.imageUrl} />
                    {v.libelle}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <span className={ETIQ}>Les réponses</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {choix.valeurs.map((v) => (
              <span key={v.id} className="flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 text-[13px]">
                {v.libelle}
                <button
                  type="button"
                  onClick={() => agir(supprimerValeur(v.id))}
                  className="px-1 text-ink-soft hover:text-orange-dark"
                  aria-label={`Supprimer ${v.libelle}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={nouvelle}
              onChange={(e) => setNouvelle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !nouvelle.trim()) return;
                agir(creerValeur(choix.id, { libelle: nouvelle.trim() }));
                setNouvelle("");
              }}
              placeholder="Ajouter…"
              className="h-8 w-[150px] rounded-full border border-dashed border-line px-3 text-[12.5px]"
            />
          </div>
        </div>
      )}

      {/* ── 2. Ce que le fournisseur vend ──────────────────────────── */}
      {decomposition?.positions.length === 2 && (
        <TableauCroise decomposition={decomposition} choix={choix} agir={agir} />
      )}

      {/* ── 3. La donnée brute, repliée ────────────────────────────── */}
      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setBrutes((b) => !b)}
          className="text-[13px] font-semibold text-orange-dark hover:underline"
        >
          {brutes ? "▴ Masquer" : "▾ Voir"} les {choix.valeurs.length} lignes du tarif
        </button>

        {brutes && (
          <div className="mt-3">
            <p className="mb-2 text-[12px] text-ink-soft">
              Renommer une ligne réécrit du même mouvement les combinaisons qui
              la citent : le prix ne se perd pas en chemin.
            </p>
            {choix.valeurs.map((valeur) => (
              <div key={valeur.id} className="flex items-center gap-3 border-b border-line/50 py-1.5">
                <Champ
                  valeur={valeur.libelle}
                  onEnregistrer={(v) => majValeur(valeur.id, { libelle: v })}
                  className="w-[320px]"
                />
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => agir(supprimerValeur(valeur.id))}
                  className="text-[13px] text-ink-soft hover:text-orange-dark"
                  aria-label={`Supprimer ${valeur.libelle}`}
                >
                  ×
                </button>
              </div>
            ))}
            {decomposition && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={nouvelle}
                  onChange={(e) => setNouvelle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !nouvelle.trim()) return;
                    agir(creerValeur(choix.id, { libelle: nouvelle.trim() }));
                    setNouvelle("");
                  }}
                  placeholder="NOIR METAL / YUKON"
                  className="h-9 w-[280px] rounded-lg border border-dashed border-line px-3 text-[13px]"
                />
                <span className="text-[12px] text-ink-soft">
                  une pièce par position, séparées par «&nbsp;/&nbsp;»
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
