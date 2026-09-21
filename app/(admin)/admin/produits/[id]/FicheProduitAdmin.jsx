"use client";

// La fiche produit en administration — quatre onglets.
//
//   Identité   nom, descriptif, publication
//   Choix      les questions posées au client, leurs valeurs, leurs suffixes
//   Prix       la matrice des combinaisons
//   Visuels    la galerie et son rattachement aux valeurs
//
// LA RÈGLE
//   Ce qui tient dans un champ s'édite en ligne, et s'enregistre en quittant
//   le champ. Pas de gros bouton « Enregistrer » qui réécrirait tout : deux
//   corrections au même moment ne doivent pas s'écraser l'une l'autre.

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  majIdentite, creerChoix, majChoix, supprimerChoix,
  creerValeur, majValeur, supprimerValeur, tirerDUnNuancier,
  majCombinaison, majVisuel, supprimerVisuel,
} from "./actions";
import EditeurFinitions from "./EditeurFinitions";
import OngletIdentite from "./OngletIdentite";
import OngletDescriptif from "./OngletDescriptif";
import { etapesDe, choixTarifaires, choixFinition, assemblerReference } from "@/lib/modeleProduit";
import { prixLigne } from "@/lib/prixCatalogue";

const euros = (n) =>
  n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const NATURES = {
  tarifaire: { libelle: "tarifaire", fond: "bg-orange-tint", texte: "text-orange-dark" },
  finition: { libelle: "finition", fond: "bg-surface-2", texte: "text-ink-soft" },
  option: { libelle: "option", fond: "bg-emerald-50", texte: "text-emerald-700" },
};

/** Un champ qui s'enregistre en le quittant, et dit ce qui s'est passé. */
function ChampAuto({ valeur, onEnregistrer, className = "", type = "text", ...props }) {
  const [v, setV] = useState(valeur ?? "");
  const [etat, setEtat] = useState(null); // null | "ok" | message d'erreur
  const [enCours, demarrer] = useTransition();

  const quitter = () => {
    if (String(v) === String(valeur ?? "")) return;
    demarrer(async () => {
      const r = await onEnregistrer(v);
      if (r?.ok === false) { setEtat(r.error); setV(valeur ?? ""); }
      else { setEtat("ok"); setTimeout(() => setEtat(null), 1200); }
    });
  };

  return (
    <span className="relative inline-flex flex-col">
      <input
        type={type}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={quitter}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={`h-9 rounded-lg border px-2.5 text-[13px] ${
          etat && etat !== "ok" ? "border-orange" : "border-line"
        } ${enCours ? "opacity-60" : ""} ${className}`}
        {...props}
      />
      {etat && etat !== "ok" && (
        <span className="mt-1 text-[11px] leading-tight text-orange-dark">{etat}</span>
      )}
    </span>
  );
}

export default function FicheProduitAdmin({ produit, marge, surDevis, nuanciers, bibliotheque = [], rangements = null }) {
  const [onglet, setOnglet] = useState("choix");
  const [message, setMessage] = useState(null);
  const [, demarrer] = useTransition();

  const etapes = useMemo(() => etapesDe(produit), [produit]);
  const tarifaires = useMemo(() => choixTarifaires(produit), [produit]);
  const finitions = useMemo(() => choixFinition(produit), [produit]);

  const agir = (promesse) => demarrer(async () => {
    const r = await promesse;
    setMessage(r?.ok === false ? { type: "erreur", texte: r.error } : null);
    if (r?.ok === false) setTimeout(() => setMessage(null), 5000);
  });

  // La complétude, les cinq mêmes pastilles que la liste.
  const sante = [
    ["visuel", produit.visuels.length > 0],
    ["prix", produit.combinaisons.some((c) => c.prixTarifHT != null)],
    ["choix", etapes.length > 0],
    ["finition", finitions.length > 0],
    ["rayon", true],
  ];

  // Un exemple de référence assemblée, avec la première valeur de chaque choix.
  const exempleRef = useMemo(() => {
    const reponses = {};
    for (const c of etapes) if (c.valeurs[0]) reponses[c.cle] = c.valeurs[0].libelle;
    return assemblerReference(produit, reponses);
  }, [produit, etapes]);

  const ONGLETS = [
    ["identite", "Identité"],
    ["descriptif", `Descriptif · ${(produit.sectionsDevis || []).length}`],
    ["choix", `Choix · ${etapes.length}`],
    ["prix", `Prix · ${produit.combinaisons.length}`],
    ["visuels", `Visuels · ${produit.visuels.length}`],
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Entête ─────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/produits" className="text-[13px] text-orange-dark hover:underline">
          ← Tous les produits
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{produit.nom}</h1>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-ink-soft">
            {produit.gamme?.marque?.nom} · {produit.gamme?.nom}
          </span>
          {produit.publie ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">publié</span>
          ) : (
            <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-ink-soft">brouillon</span>
          )}
          {surDevis && (
            <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-ink-soft">sur devis</span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {sante.map(([nom, ok]) => (
              <span
                key={nom}
                title={nom}
                className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-600" : "bg-line"}`}
              />
            ))}
          </span>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-orange bg-orange-tint px-4 py-3 text-[13px] text-orange-dark">
          {message.texte}
        </div>
      )}

      <div className="flex gap-1 border-b border-line">
        {ONGLETS.map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => setOnglet(cle)}
            className={`border-b-2 px-4 py-2.5 text-sm ${
              onglet === cle ? "border-orange font-semibold text-ink" : "border-transparent text-ink-soft"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {/* ── Identité ───────────────────────────────────────────────── */}
      {onglet === "identite" && (
        <OngletIdentite produit={produit} rangements={rangements} agir={agir} />
      )}

      {onglet === "descriptif" && <OngletDescriptif produit={produit} />}

      {/* ── Choix ──────────────────────────────────────────────────── */}
      {onglet === "choix" && (
        <div className="flex flex-col gap-4">

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Les questions posées au client
            </span>
            <span className="flex-1" />
            <FormulaireChoix onCreer={(nom, nature) => agir(creerChoix(produit.id, { nom, nature }))} />
            <FormulaireNuancier
              nuanciers={nuanciers}
              onTirer={(paletteId, nom) => agir(tirerDUnNuancier(produit.id, paletteId, nom))}
            />
          </div>

          {!etapes.length && (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
              Ce produit ne pose aucune question. Il se vend tel quel.
            </div>
          )}

          {etapes.map((choix) => (
            <BlocChoix
              key={choix.id}
              choix={choix}
              agir={agir}
              bibliotheque={bibliotheque}
              estFinition={choix.nature === "finition"}
            />
          ))}

          {exempleRef && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Référence assemblée
              </div>
              <div className="mt-2 font-display text-xl font-bold tracking-wide">{exempleRef}</div>
              <p className="mt-2 text-[12.5px] text-ink-soft">
                Base de la combinaison, puis le suffixe de chaque choix dans
                l'ordre de son rang — qui n'est pas celui de l'affichage.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Prix ───────────────────────────────────────────────────── */}
      {onglet === "prix" && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
            <span className="text-sm font-semibold">La matrice</span>
            <span className="text-[12.5px] text-ink-soft">
              une ligne par combinaison de choix tarifaires
            </span>
            <span className="flex-1" />
            <span className="text-[12.5px] text-ink-soft">
              vente = tarif × (1 {marge < 0 ? "−" : "+"} {Math.abs(Math.round(marge * 100))} %)
            </span>
          </div>

          <div className="flex bg-surface-2/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {tarifaires.map((c) => (
              <span key={c.cle} className="w-[120px]">{c.nom}</span>
            ))}
            <span className="w-[110px]">Réf. base</span>
            <span className="w-[120px] text-right">Tarif HT</span>
            <span className="w-[100px] text-right">Éco</span>
            <span className="flex-1 text-right">Vente HT</span>
          </div>

          {produit.combinaisons.map((comb, i) => {
            const vente = prixLigne(comb, marge);
            const vide = comb.prixTarifHT == null;
            return (
              <div
                key={comb.id}
                className={`flex items-center px-5 py-2 text-[13px] ${
                  vide ? "bg-orange-tint/30" : i % 2 ? "bg-surface-2/30" : ""
                }`}
              >
                {tarifaires.map((c) => (
                  <span key={c.cle} className="w-[120px]">{comb.valeurs?.[c.cle] ?? "—"}</span>
                ))}
                <span className="w-[110px]">
                  <ChampAuto
                    valeur={comb.referenceBase || ""}
                    onEnregistrer={(v) => majCombinaison(comb.id, { referenceBase: v })}
                    className="w-[96px] font-display font-semibold tracking-wide"
                  />
                </span>
                <span className="w-[120px] text-right">
                  <ChampAuto
                    valeur={comb.prixTarifHT ?? ""}
                    onEnregistrer={(v) => majCombinaison(comb.id, { prixTarifHT: v })}
                    className="w-[100px] text-right"
                    placeholder="à saisir"
                  />
                </span>
                <span className="w-[100px] text-right">
                  <ChampAuto
                    valeur={comb.ecoContribution ?? ""}
                    onEnregistrer={(v) => majCombinaison(comb.id, { ecoContribution: v })}
                    className="w-[80px] text-right"
                  />
                </span>
                <span className={`flex-1 text-right font-display font-semibold ${vide ? "text-ink-soft/50" : ""}`}>
                  {euros(vente)}
                </span>
              </div>
            );
          })}

          {produit.combinaisons.some((c) => c.prixTarifHT == null) && (
            <div className="border-t border-line bg-orange-tint/40 px-5 py-3 text-[13px] text-orange-dark">
              {produit.combinaisons.filter((c) => c.prixTarifHT == null).length} combinaison(s)
              sans prix. Le produit ne peut pas être commandé dessus tant qu'elles restent vides.
            </div>
          )}

          <div className="border-t border-line bg-surface-2/40 px-5 py-3 text-[12.5px] text-ink-soft">
            La colonne « Vente HT » n'est pas saisissable : elle naît du tarif et
            de la marge des Réglages. Aucun prix de vente n'est stocké, sans quoi
            il finirait par diverger du panier.
          </div>
        </div>
      )}

      {/* ── Visuels ────────────────────────────────────────────────── */}
      {onglet === "visuels" && (
        <div className="flex flex-col gap-4">
          {!produit.visuels.length && (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
              Aucun visuel. Les dépôts en attente se rattachent depuis la médiathèque.
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {produit.visuels.map((v) => (
              <BlocVisuel
                key={v.id}
                visuel={v}
                valeursFinition={finitions}
                agir={agir}
              />
            ))}
          </div>

          <div className="rounded-xl bg-surface-2 p-4 text-[12.5px] leading-relaxed text-ink-soft">
            Un visuel rattaché à des valeurs ne s'affiche que lorsque toutes sont
            retenues par le client : une photo qui montre un piétement noir et un
            plateau nebraska n'a rien à faire sur un bureau blanc. Le rattachement
            est une donnée, plus un nom de fichier — renommer une image ne casse
            plus rien.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Un choix replié en une ligne, déplié en son éditeur.
 *
 * Les finitions ont le leur, une grille de pastilles : un nuancier se juge à
 * l oeil, pas dans un tableau de codes hexadécimaux. Les choix tarifaires et
 * les options gardent le tableau, qui leur convient — ce sont des libellés
 * et des jetons, rien à voir.
 */
function BlocChoix({ choix, agir, estFinition, bibliotheque = [] }) {
  const [ouvert, setOuvert] = useState(false);
  const n = NATURES[choix.nature] || NATURES.finition;

  return (
    <div className={`rounded-2xl border bg-surface ${ouvert ? "border-orange" : "border-line"}`}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
      >
        <span className="w-[200px] text-sm font-semibold">{choix.nom}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${n.fond} ${n.texte}`}>
          {n.libelle}
        </span>

        {/* Un aperçu qu on lit d un coup d oeil : les teintes pour une
            finition, les libellés pour le reste. */}
        {estFinition ? (
          <span className="flex flex-1 items-center gap-1 overflow-hidden">
            {choix.valeurs.slice(0, 14).map((v) => (
              <span
                key={v.id}
                title={v.libelle}
                className="h-5 w-5 shrink-0 rounded border border-line bg-cover bg-center"
                style={v.imageUrl
                  ? { backgroundImage: `url(${v.imageUrl})` }
                  : { background: v.couleur || "#f3efe8" }}
              />
            ))}
            {choix.valeurs.length > 14 && (
              <span className="text-[12px] text-ink-soft">+{choix.valeurs.length - 14}</span>
            )}
          </span>
        ) : (
          <span className="flex-1 truncate text-[13px] text-ink-soft">
            {choix.valeurs.slice(0, 6).map((v) => v.libelle).join(" · ")}
            {choix.valeurs.length > 6 ? " …" : ""}
          </span>
        )}

        <span className="text-[13px] text-ink-soft/70">
          {choix.valeurs.length} {estFinition ? "teintes" : "valeurs"}
        </span>
        <span className="text-ink-soft">{ouvert ? "▴" : "▾"}</span>
      </button>

      {ouvert && (estFinition ? (
        <div className="border-t border-line">
          <EditeurFinitions choix={choix} bibliotheque={bibliotheque} agir={agir} />
        </div>
      ) : (
        <div className="border-t border-line px-5 pb-5 pt-4">
          <div className="mb-3 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Nom du choix</span>
              <ChampAuto
                valeur={choix.nom}
                onEnregistrer={(v) => majChoix(choix.id, { nom: v })}
                className="w-[220px]"
              />
            </label>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => agir(supprimerChoix(choix.id))}
              className="h-9 rounded-lg border border-line px-3 text-[13px] text-ink-soft hover:border-orange hover:text-orange-dark"
            >
              Supprimer ce choix
            </button>
          </div>

          <div className="flex gap-3 border-b border-line pb-2 pl-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            <span className="w-[260px]">Libellé</span>
            <span className="flex-1" />
          </div>

          {choix.valeurs.map((valeur) => (
            <div key={valeur.id} className="flex items-center gap-3 border-b border-line/50 py-2 pl-1">
              <ChampAuto
                valeur={valeur.libelle}
                onEnregistrer={(v) => majValeur(valeur.id, { libelle: v })}
                className="w-[260px]"
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

          <FormulaireValeur onCreer={(libelle) => agir(creerValeur(choix.id, { libelle }))} />

          <p className="mt-4 text-[12px] leading-relaxed text-ink-soft">
            Renommer une valeur tarifaire réécrit du même mouvement les
            combinaisons qui la citent : le prix ne se perd pas en chemin.
          </p>
        </div>
      ))}
    </div>
  );
}

function BlocVisuel({ visuel, valeursFinition, agir }) {
  const rattachees = new Set((visuel.valeurs || []).map((v) => v.valeurChoixId));
  const [selection, setSelection] = useState(rattachees);

  const basculer = (id) => {
    const suite = new Set(selection);
    if (suite.has(id)) suite.delete(id); else suite.add(id);
    setSelection(suite);
    agir(majVisuel(visuel.id, { valeurIds: [...suite] }));
  };

  return (
    <div className="w-[230px] overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex h-[140px] items-center justify-center bg-surface-2/50">
        {visuel.url ? (
          <img src={visuel.url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[12px] text-ink-soft">sans image</span>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Rôle</span>
          <select
            defaultValue={visuel.role}
            onChange={(e) => agir(majVisuel(visuel.id, { role: e.target.value }))}
            className="h-8 rounded-lg border border-line px-2 text-[12px]"
          >
            <option value="vignette">vignette</option>
            <option value="galerie">galerie</option>
            <option value="ambiance">ambiance</option>
            <option value="schema">schéma</option>
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Illustre</span>
          <div className="flex max-h-[104px] flex-col gap-1 overflow-y-auto">
            {valeursFinition.flatMap((c) =>
              c.valeurs.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={selection.has(v.id)}
                    onChange={() => basculer(v.id)}
                    className="h-3.5 w-3.5 accent-orange"
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-line"
                    style={{ background: v.couleur || "#e8e3da" }}
                  />
                  <span className="truncate text-ink-soft">{c.nom} · {v.libelle}</span>
                </label>
              )))}
            {!valeursFinition.length && (
              <span className="text-[11.5px] text-ink-soft">aucune finition sur ce produit</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => agir(supprimerVisuel(visuel.id))}
          className="mt-1 text-left text-[12px] text-ink-soft hover:text-orange-dark"
        >
          Retirer ce visuel
        </button>
      </div>
    </div>
  );
}

function FormulaireChoix({ onCreer }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [nature, setNature] = useState("finition");

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="h-9 rounded-lg border border-line bg-surface px-3.5 text-[13px] font-medium"
      >
        + un choix
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <input
        autoFocus
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom du choix"
        className="h-9 w-[180px] rounded-lg border border-line px-2.5 text-[13px]"
      />
      <select
        value={nature}
        onChange={(e) => setNature(e.target.value)}
        className="h-9 rounded-lg border border-line px-2 text-[13px]"
      >
        <option value="tarifaire">tarifaire</option>
        <option value="finition">finition</option>
        <option value="option">option</option>
      </select>
      <button
        type="button"
        onClick={() => { if (nom.trim()) { onCreer(nom, nature); setNom(""); setOuvert(false); } }}
        className="h-9 rounded-lg bg-orange px-3.5 text-[13px] font-semibold text-white"
      >
        Créer
      </button>
      <button type="button" onClick={() => setOuvert(false)} className="text-[13px] text-ink-soft">
        Annuler
      </button>
    </span>
  );
}

function FormulaireNuancier({ nuanciers, onTirer }) {
  const [ouvert, setOuvert] = useState(false);
  const [paletteId, setPaletteId] = useState(nuanciers[0]?.id || "");
  const [nom, setNom] = useState("");

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="h-9 rounded-lg border border-line bg-surface px-3.5 text-[13px] font-medium"
      >
        Tirer d'un nuancier
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <select
        value={paletteId}
        onChange={(e) => setPaletteId(e.target.value)}
        className="h-9 rounded-lg border border-line px-2 text-[13px]"
      >
        {nuanciers.map((n) => (
          <option key={n.id} value={n.id}>
            {n.nom}{n.marque ? ` · ${n.marque}` : ""} ({n._count.finitions})
          </option>
        ))}
      </select>
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom du choix (facultatif)"
        className="h-9 w-[180px] rounded-lg border border-line px-2.5 text-[13px]"
      />
      <button
        type="button"
        onClick={() => { if (paletteId) { onTirer(paletteId, nom); setNom(""); setOuvert(false); } }}
        className="h-9 rounded-lg bg-orange px-3.5 text-[13px] font-semibold text-white"
      >
        Tirer
      </button>
      <button type="button" onClick={() => setOuvert(false)} className="text-[13px] text-ink-soft">
        Annuler
      </button>
    </span>
  );
}

function FormulaireValeur({ onCreer }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-3 flex items-center gap-2 pl-1">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onCreer(v); setV(""); } }}
        placeholder="+ une valeur"
        className="h-9 w-[200px] rounded-lg border border-dashed border-line px-2.5 text-[13px]"
      />
      {v.trim() && (
        <button
          type="button"
          onClick={() => { onCreer(v); setV(""); }}
          className="h-9 rounded-lg bg-orange px-3 text-[13px] font-semibold text-white"
        >
          Ajouter
        </button>
      )}
    </div>
  );
}
