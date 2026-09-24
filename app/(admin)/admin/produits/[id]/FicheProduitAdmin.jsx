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
import { Icon } from "@/components/dashboard/Icon";
import {
  majIdentite, creerChoix, majChoix, supprimerChoix,
  creerValeur, majValeur, supprimerValeur, tirerDUnNuancier,
  majCombinaison, majVisuel, mettreEnAvant, reordonnerVisuels, supprimerVisuel, ajouterVisuels,
} from "./actions";
import EditeurFinitions from "./EditeurFinitions";
import EditeurTarifaire from "./EditeurTarifaire";
import CreerQuestionTarifaire from "./CreerQuestionTarifaire";
import GenererVariantes from "./GenererVariantes";
import OngletIdentite from "./OngletIdentite";
import OngletDescriptif from "./OngletDescriptif";
import { AjouterVisuels } from "./AjouterVisuels";
import { surFondBlanc } from "@/lib/imageProduit";
import {
  etapesDe, choixTarifaires, choixFinition, assemblerReference,
  decomposerComposite, choixRecouverts,
} from "@/lib/modeleProduit";
import { prixLigne } from "@/lib/prixCatalogue";
import Selecteur from "@/components/dashboard/Selecteur";
import OngletOptions from "./OngletOptions";

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

export default function FicheProduitAdmin({ produit, marge, surDevis, nuanciers, bibliotheque = [], rangements = null, optionsLieesIds = [] }) {
  const [onglet, setOnglet] = useState("choix");
  const [message, setMessage] = useState(null);
  const [, demarrer] = useTransition();

  const etapes = useMemo(() => etapesDe(produit), [produit]);
  const tarifaires = useMemo(() => choixTarifaires(produit), [produit]);
  const finitions = useMemo(() => choixFinition(produit), [produit]);

  // Une question tarifaire dont chaque valeur agrège deux pièces — « NOIR
  // METAL / NEBRASKA » — est lue par des groupes de finition qui n'ajoutent
  // aucune question. L'écran montrait les trois côte à côte sans dire lequel
  // porte le prix, ce qui les faisait passer pour des doublons.
  const composites = useMemo(() => {
    const m = new Map();
    for (const c of choixTarifaires(produit)) {
      const d = decomposerComposite(c, produit);
      if (d) m.set(c.cle, d);
    }
    return m;
  }, [produit]);
  const recouverts = useMemo(() => choixRecouverts(produit), [produit]);

  /**
   * L'ordre de lecture des blocs : une question composite se place après les
   * groupes de finition qu'elle croise.
   *
   * Elle en naît — « Finition » n'existe que parce que le tarif vend la paire
   * « Structure × Portes » — et la lire avant eux oblige à deviner ce que
   * « NOIR METAL / NOIR » agrège. L'ordre enregistré ne bouge pas : c'est
   * celui des questions posées au client, où les groupes ne paraissent pas.
   */
  const blocs = useMemo(() => {
    const rang = new Map(etapes.map((c, i) => [c.cle, i]));
    const differes = new Map();
    const reste = [];

    for (const c of etapes) {
      const d = composites.get(c.cle);
      if (d) {
        const lus = new Set(d.positions.map((p) => p.nom));
        const dernier = etapes.filter((x) => lus.has(x.nom)).pop();
        if (dernier && rang.get(dernier.cle) > rang.get(c.cle)) {
          differes.set(dernier.cle, [...(differes.get(dernier.cle) || []), c]);
          continue;
        }
      }
      reste.push(c);
    }

    const ordonnes = [];
    for (const c of reste) {
      ordonnes.push(c);
      for (const suivant of differes.get(c.cle) || []) ordonnes.push(suivant);
    }
    return ordonnes;
  }, [etapes, composites]);

  const agir = (promesse) => demarrer(async () => {
    const r = await promesse;
    setMessage(r?.ok === false ? { type: "erreur", texte: r.error } : null);
    if (r?.ok === false) setTimeout(() => setMessage(null), 5000);
  });

  // Ce qui manque à la fiche, nommé. Le rayon en fait partie : il se coche
  // dans l'onglet Identité et ne relève d'aucun autre.
  const manques = [
    !produit.visuels.length && "visuel",
    !produit.combinaisons.some((c) => c.prixTarifHT != null) && "prix",
    !etapes.length && "choix",
    !finitions.length && "finition",
    !(produit.sousCategories || []).length && "rayon",
  ].filter(Boolean);

  // Un exemple de référence assemblée, avec la première valeur de chaque choix.
  const exempleRef = useMemo(() => {
    const reponses = {};
    for (const c of etapes) if (c.valeurs[0]) reponses[c.cle] = c.valeurs[0].libelle;
    return assemblerReference(produit, reponses);
  }, [produit, etapes]);

  // Chaque onglet porte son compte et, s'il manque quelque chose, un point.
  // Le compte seul ne dit pas si la fiche est en état : vingt et un visuels et
  // aucun prix se lisaient pareil.
  const sansTarif = produit.combinaisons.filter((c) => c.prixTarifHT == null).length;
  const ONGLETS = [
    { cle: "identite", nom: "Identité", icone: "box" },
    {
      cle: "descriptif", nom: "Descriptif", icone: "edit",
      compte: (produit.sectionsDevis || []).length,
      alerte: (produit.sectionsDevis || []).length ? null : "aucune section",
    },
    {
      cle: "choix", nom: "Choix", icone: "layers",
      compte: etapes.length,
      alerte: etapes.length ? null : "aucune question",
    },
    {
      cle: "prix", nom: "Prix", icone: "euro",
      compte: produit.combinaisons.length,
      // Toujours une chaîne ou null : « 0 && "…" » vaut 0, que JSX affiche.
      alerte: !produit.combinaisons.length
        ? "aucune variante"
        : sansTarif ? `${sansTarif} sans tarif` : null,
    },
    {
      cle: "visuels", nom: "Visuels", icone: "image",
      compte: produit.visuels.length,
      alerte: produit.visuels.length ? null : "aucun visuel",
    },
    { cle: "options", nom: "Options", icone: "layers", compte: optionsLieesIds.length },
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
          {/* Les cinq pastilles de complétude ont disparu d'ici : les onglets
              les disent mieux, chacune à sa place, et l'une d'elles — le
              rayon — était codée en dur à vert quoi qu'il arrive. */}
          <span className="ml-auto text-[12.5px] text-ink-soft">
            {manques.length
              ? `à compléter : ${manques.join(" · ")}`
              : "fiche complète"}
          </span>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-orange bg-orange-tint px-4 py-3 text-[13px] text-orange-dark">
          {message.texte}
        </div>
      )}

      {/* Un sélecteur segmenté plutôt qu'un trait sous le mot actif : les
          cinq onglets se voient d'un bloc, l'actif se détache par son fond,
          et chacun porte son compte au lieu d'un « · 5 » accolé au nom. */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface-2/60 p-1">
        {ONGLETS.map((o) => {
          const actif = onglet === o.cle;
          return (
            <button
              key={o.cle}
              type="button"
              onClick={() => setOnglet(o.cle)}
              title={o.alerte || undefined}
              className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                actif
                  ? "bg-surface font-semibold text-ink shadow-sm ring-1 ring-line"
                  : "text-ink-soft hover:bg-surface/70 hover:text-ink"
              }`}
            >
              <Icon name={o.icone} size={15} strokeWidth={actif ? 2.2 : 1.8} />
              {o.nom}
              {o.compte != null && (
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  actif ? "bg-surface-2 text-ink-soft" : "bg-surface/70 text-ink-soft/80"
                }`}>
                  {o.compte}
                </span>
              )}
              {o.alerte && (
                <span
                  aria-label={o.alerte}
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange"
                />
              )}
            </button>
          );
        })}
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
            <CreerQuestionTarifaire produit={produit} finitions={finitions} agir={agir} />
          </div>

          {!etapes.length && (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
              Ce produit ne pose aucune question. Il se vend tel quel.
            </div>
          )}

          {blocs.map((choix) => (
            <BlocChoix
              key={choix.id}
              choix={choix}
              agir={agir}
              bibliotheque={bibliotheque}
              estFinition={choix.nature === "finition"}
              decomposition={composites.get(choix.cle) || null}
              nomDuComposite={recouverts.has(choix.cle)
                ? produit.choix.find((c) => composites.get(c.cle)
                  ?.positions.some((x) => x.nom === choix.nom))?.nom || null
                : null}
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
            <GenererVariantes produitId={produit.id} />
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

      {/* ── Options liées ──────────────────────────────────────────── */}
      {onglet === "options" && (
        <OngletOptions vitrineId={produit.id} idsInitiaux={optionsLieesIds} agir={agir} />
      )}

      {/* ── Visuels ────────────────────────────────────────────────── */}
      {onglet === "visuels" && (
        <div className="flex flex-col gap-4">
          <AjouterVisuels vitrineId={produit.id} ajouter={ajouterVisuels} />

          {!produit.visuels.length && (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-soft">
              Aucun visuel pour l&apos;instant. Déposez-en ci-dessus, ou rattachez
              un dépôt en attente depuis la médiathèque.
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {produit.visuels.map((v, i) => (
              <BlocVisuel
                key={v.id}
                visuel={v}
                valeursFinition={finitions}
                agir={agir}
                position={i}
                total={produit.visuels.length}
                // Les flèches : on échange avec le voisin et on renvoie
                // l'ordre complet — l'action réécrit tous les rangs.
                onDeplacer={(sens) => {
                  const ids = produit.visuels.map((x) => x.id);
                  const j = i + sens;
                  if (j < 0 || j >= ids.length) return;
                  [ids[i], ids[j]] = [ids[j], ids[i]];
                  agir(reordonnerVisuels(produit.id, ids));
                }}
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
function BlocChoix({ choix, agir, estFinition, bibliotheque = [], decomposition = null, nomDuComposite = null }) {
  const [ouvert, setOuvert] = useState(false);
  const n = NATURES[choix.nature] || NATURES.finition;

  return (
    <div className={`rounded-2xl border bg-surface ${
      ouvert ? "border-orange" : nomDuComposite ? "border-line/60" : "border-line"
    }`}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
      >
        <span className="w-[200px] text-sm font-semibold">
          {choix.nom}
          {/* Deux rôles, et l'écran ne les distinguait pas : la question qui
              porte le prix, et les groupes qui servent seulement à la lire. */}
          {decomposition && (
            <span className="mt-0.5 block text-[11px] font-normal leading-tight text-orange-dark">
              croise {decomposition.positions.map((p) => p.nom).join(" × ")}
              <span className="block text-ink-soft">porte le prix et la référence</span>
            </span>
          )}
          {nomDuComposite && (
            <span className="mt-0.5 block text-[11px] font-normal leading-tight text-ink-soft">
              lu depuis « {nomDuComposite} », pas reposé au client
            </span>
          )}
        </span>
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

      {ouvert && (
        <div className="border-t border-line">
          {estFinition ? (
            <EditeurFinitions choix={choix} bibliotheque={bibliotheque} agir={agir} />
          ) : (
            <EditeurTarifaire choix={choix} decomposition={decomposition} agir={agir} />
          )}
        </div>
      )}
    </div>
  );
}

function BlocVisuel({ visuel, valeursFinition, agir, position = 0, total = 1, onDeplacer = null }) {
  const estVignette = visuel.role === "vignette";
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
      {/* Fond blanc, comme en boutique : beaucoup de visuels fournisseurs sont
          des PNG détourés, et l'aperçu doit montrer ce que le client verra. */}
      <div className="relative flex h-[140px] items-center justify-center bg-white">
        {visuel.url ? (
          <img src={surFondBlanc(visuel.url, 460)} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[12px] text-ink-soft">sans image</span>
        )}
        {/* L'étoile : la vignette, celle que la carte montre. Un clic la
            choisit et la remonte en tête — un seul geste, pas un menu. */}
        <button
          type="button"
          title={estVignette ? "Vignette de la fiche" : "Mettre en avant"}
          aria-pressed={estVignette}
          disabled={estVignette}
          onClick={() => agir(mettreEnAvant(visuel.id))}
          className={`absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full border transition ${
            estVignette
              ? "border-orange bg-orange text-white"
              : "border-line bg-white/90 text-ink-soft hover:border-orange hover:text-orange"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={estVignette ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        {/* Ambiance et schéma restent des rôles à part : l'ambiance ferme la
            galerie, le schéma ne fait jamais vignette. Une pastille chacun,
            qui se décoche en recliquant. */}
        {!estVignette && (
          <div className="flex gap-1.5">
            {[["ambiance", "Ambiance"], ["schema", "Schéma"]].map(([role, libelle]) => (
              <button
                key={role}
                type="button"
                aria-pressed={visuel.role === role}
                onClick={() => agir(majVisuel(visuel.id, { role: visuel.role === role ? "galerie" : role }))}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  visuel.role === role
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>
        )}

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

        <div className="mt-1 flex items-center gap-1.5">
          {/* Déplacer d'un cran : la galerie du site suit cet ordre. */}
          <button
            type="button"
            title="Vers la gauche"
            disabled={position === 0}
            onClick={() => onDeplacer?.(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:border-ink hover:text-ink disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            title="Vers la droite"
            disabled={position >= total - 1}
            onClick={() => onDeplacer?.(1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:border-ink hover:text-ink disabled:opacity-30"
          >
            →
          </button>
          <span className="text-[11px] text-ink-soft">{position + 1}/{total}</span>
          <button
            type="button"
            onClick={() => agir(supprimerVisuel(visuel.id))}
            className="ml-auto text-[12px] text-ink-soft hover:text-orange-dark"
          >
            Retirer
          </button>
        </div>
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
      <Selecteur
        className="w-[200px]"
        ariaLabel="Nature du choix"
        valeur={nature}
        onChange={setNature}
        options={[
          { valeur: "tarifaire", libelle: "Tarifaire", detail: "fait le prix" },
          { valeur: "finition", libelle: "Finition", detail: "couleur et image" },
          { valeur: "option", libelle: "Option", detail: "article ajouté" },
        ]}
      />
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
      <Selecteur
        className="w-[230px]"
        ariaLabel="Nuancier"
        valeur={paletteId}
        onChange={setPaletteId}
        options={nuanciers.map((n) => ({
          valeur: n.id, libelle: n.nom, groupe: n.marque || null,
          detail: `${n._count.finitions} teintes`,
        }))}
      />
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
