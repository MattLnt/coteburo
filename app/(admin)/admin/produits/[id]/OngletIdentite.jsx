"use client";

// L'onglet Identité : ce qu'est la fiche, et où elle paraît.
//
// CE QU'IL RASSEMBLE
//   Le nom et l'adresse publique, la gamme, les rayons, ce qui décide de sa
//   visibilité. C'était éclaté entre l'ancien éditeur de carte — qui écrit
//   dans des champs que la boutique ne lit plus — et rien du tout.
//
// LES RAYONS, ET POURQUOI ILS SE COCHENT ICI
//   Une fiche paraît dans les rayons qu'on lui coche ; la catégorie suit
//   toute seule. Les laisser se saisir séparément a produit des fiches
//   visibles dans un rayon dont la catégorie les ignorait.

import { useState, useTransition } from "react";
import Link from "next/link";
import { majIdentite, majRayons } from "./actions";

const BTN = "h-9 rounded-lg border border-line px-3 text-[13px] hover:border-orange hover:text-orange-dark disabled:opacity-40";
const CARTE = "flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6";
const ETIQ = "text-[11px] font-semibold uppercase tracking-wider text-ink-soft";

/** Un champ qui s'enregistre en le quittant, et dit ce qui s'est passé. */
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

function Bascule({ coche, onChanger, titre, detail }) {
  return (
    <label className="flex max-w-sm items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        defaultChecked={coche}
        onChange={(e) => onChanger(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-orange"
      />
      <span>
        {titre}
        {detail && <span className="block text-[12px] leading-snug text-ink-soft">{detail}</span>}
      </span>
    </label>
  );
}

export default function OngletIdentite({ produit, rangements, agir }) {
  const { categories = [], gammes = [] } = rangements || {};
  const [rayons, setRayons] = useState(
    () => new Set((produit.sousCategories || []).map((s) => s.id)),
  );
  const [adresseOuverte, setAdresseOuverte] = useState(false);

  const basculerRayon = (id) => {
    const suivant = new Set(rayons);
    if (suivant.has(id)) suivant.delete(id); else suivant.add(id);
    setRayons(suivant);
    agir(majRayons(produit.id, [...suivant]));
  };

  const urlPublique = `/${produit.gamme?.slug || ""}/${produit.slug}`;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Ce qu'elle est ─────────────────────────────────────────── */}
      <div className={CARTE}>
        <label className="flex flex-col gap-2">
          <span className={ETIQ}>Nom</span>
          <Champ
            valeur={produit.nom}
            onEnregistrer={(v) => majIdentite(produit.id, { nom: v })}
            className="max-w-xl"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className={ETIQ}>Descriptif</span>
          <textarea
            defaultValue={produit.descriptif || ""}
            onBlur={(e) => agir(majIdentite(produit.id, { descriptif: e.target.value }))}
            rows={5}
            className="max-w-3xl rounded-lg border border-line px-3 py-2 text-[13px]"
            placeholder="La phrase qui paraît sous le titre, sur la fiche."
          />
        </label>

        <div className="flex flex-wrap items-end gap-5 border-t border-line pt-5">
          <label className="flex flex-col gap-2">
            <span className={ETIQ}>Gamme</span>
            <select
              defaultValue={produit.gamme?.id || ""}
              onChange={(e) => agir(majIdentite(produit.id, { gammeId: e.target.value }))}
              className="h-9 min-w-[260px] rounded-lg border border-line px-2 text-[13px]"
            >
              {gammes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.marque?.nom ? `${g.marque.nom} · ` : ""}{g.nom}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className={ETIQ}>Prix « à partir de »</span>
            <Champ
              valeur={produit.prixAPartir ?? ""}
              onEnregistrer={(v) => majIdentite(produit.id, { prixAPartir: v })}
              className="w-[130px]"
              placeholder="calculé"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className={ETIQ}>Adresse publique</span>
            <div className="flex items-center gap-2">
              {adresseOuverte ? (
                <Champ
                  valeur={produit.slug}
                  onEnregistrer={(v) => majIdentite(produit.id, { slug: v })}
                  className="w-[300px] font-display"
                />
              ) : (
                <code className="rounded-lg bg-surface-2 px-2.5 py-2 text-[12.5px]">{urlPublique}</code>
              )}
              <button type="button" className={BTN} onClick={() => setAdresseOuverte((o) => !o)}>
                {adresseOuverte ? "Terminé" : "Changer"}
              </button>
              <Link href={urlPublique} target="_blank" className={`${BTN} inline-flex items-center`}>
                Voir
              </Link>
            </div>
          </div>
        </div>

        {adresseOuverte && (
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-soft">
            Changer l'adresse casse les liens déjà partagés — un devis envoyé,
            un favori, ce que les moteurs ont indexé. Renommer la fiche ne la
            touche pas : c'est délibéré.
          </p>
        )}
      </div>

      {/* ── Où elle paraît ─────────────────────────────────────────── */}
      <div className={CARTE}>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={ETIQ}>Rayons</span>
          <span className="text-[12.5px] text-ink-soft">
            {rayons.size === 0
              ? "Aucun rayon — la fiche ne paraît dans aucune liste du site."
              : `${rayons.size} rayon${rayons.size > 1 ? "s" : ""}. La catégorie suit toute seule.`}
          </span>
        </div>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id}>
              <div className="border-b border-line pb-1 text-[12.5px] font-semibold">{c.nom}</div>
              <div className="mt-1.5 flex flex-col gap-1">
                {c.sousCategories.map((sc) => (
                  <label key={sc.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={rayons.has(sc.id)}
                      onChange={() => basculerRayon(sc.id)}
                      className="h-3.5 w-3.5 accent-orange"
                    />
                    <span className={rayons.has(sc.id) ? "font-medium" : "text-ink-soft"}>{sc.nom}</span>
                  </label>
                ))}
                {!c.sousCategories.length && (
                  <span className="text-[12px] text-ink-soft/70">aucun rayon</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ce qui décide de sa visibilité ─────────────────────────── */}
      <div className={CARTE}>
        <span className={ETIQ}>Visibilité</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <Bascule
            coche={produit.publie}
            onChanger={(v) => agir(majIdentite(produit.id, { publie: v }))}
            titre="Publiée sur le site"
            detail="Décochée, la fiche reste un brouillon que seul l'admin voit."
          />
          <Bascule
            coche={produit.venteSurDevis}
            onChanger={(v) => agir(majIdentite(produit.id, { venteSurDevis: v }))}
            titre="Vendue sur devis"
            detail="Le prix ne s'affiche pas ; le client demande un devis."
          />
          <Bascule
            coche={produit.bestSeller}
            onChanger={(v) => agir(majIdentite(produit.id, { bestSeller: v }))}
            titre="Best-seller"
            detail="Alimente le carrousel de la page d'accueil."
          />
          <Bascule
            coche={produit.enAvant}
            onChanger={(v) => agir(majIdentite(produit.id, { enAvant: v }))}
            titre="Mise en avant"
            detail="Paraît dans « Le meilleur de chaque rayon », classée par catégorie."
          />
          <Bascule
            coche={produit.accessoireSeul}
            onChanger={(v) => agir(majIdentite(produit.id, { accessoireSeul: v }))}
            titre="Vendue uniquement comme accessoire"
            detail="Sort des rayons et de la recherche, reste joignable par son adresse et cochable sur les fiches qui la citent."
          />
        </div>
      </div>
    </div>
  );
}
