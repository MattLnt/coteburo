"use client";

// La liste des produits en administration.
//
// CE QU'ELLE CORRIGE
//   L'ancien tableau dépliait une ligne par déclinaison : cinq mille vingt-deux
//   lignes pour cinq cent cinquante-cinq produits, et huit virgule huit
//   mégaoctets envoyés au navigateur à chaque affichage. Ce n'était pas une
//   liste de produits mais une liste de lignes tarifaires.
//
//   Ici, une ligne par produit, vingt-cinq par page, la pagination au serveur.
//
// CE QU'ELLE MONTRE EN PLUS
//   Cinq pastilles par ligne — visuel, prix, choix, finition, rayon. Au lieu de
//   chercher ce qui manque, on le voit ; et les vues enregistrées y mènent d'un
//   clic.
//
// LES FILTRES VIVENT DANS L'URL
//   Un lien vers « les fiches Buronomic sans visuel » se met en favori et
//   s'envoie à quelqu'un. C'est aussi ce qui rend la pagination serveur
//   possible.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toggleProduitPublie } from "./actions";

const euros = (n) => (n == null ? "—" : Math.round(n).toLocaleString("fr-FR") + " €");
const SANTE = ["visuel", "prix", "choix", "finition", "rayon"];

export default function ProduitsListe({
  lignes, total, page, parPage, filtres, marques, gammes, rayons, vues, totalCatalogue,
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, demarrer] = useTransition();
  const [selection, setSelection] = useState(new Set());
  const [recherche, setRecherche] = useState(filtres.q || "");

  const naviguer = (modifs) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modifs)) {
      if (v === "" || v == null) p.delete(k);
      else p.set(k, v);
    }
    // Changer un filtre ramène à la première page : rester en page 7 d'une
    // liste qui n'en compte plus que 2 donne un écran vide sans explication.
    if (!("page" in modifs)) p.delete("page");
    router.push(`/admin/produits?${p.toString()}`);
  };

  const basculer = (id) => setSelection((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const toutBasculer = () => setSelection((s) => {
    const tous = lignes.map((l) => l.id);
    return tous.every((id) => s.has(id)) ? new Set([...s].filter((id) => !tous.includes(id))) : new Set([...s, ...tous]);
  });

  const horsPage = [...selection].filter((id) => !lignes.some((l) => l.id === id)).length;
  const pages = Math.max(1, Math.ceil(total / parPage));
  const nbFiltres = ["marque", "gamme", "rayon", "vue"].filter((k) => filtres[k]).length + (filtres.q ? 1 : 0);

  const publierSelection = (publie) => demarrer(async () => {
    for (const id of selection) await toggleProduitPublie(id, publie);
    setSelection(new Set());
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-4">

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold">Produits</h1>
        <span className="text-sm text-ink-soft">
          {nbFiltres ? `${total} sur ${totalCatalogue}` : `${totalCatalogue} au catalogue`}
        </span>
        {nbFiltres > 0 && (
          <button
            type="button"
            onClick={() => router.push("/admin/produits")}
            className="text-[13px] text-orange-dark hover:underline"
          >
            tout afficher
          </button>
        )}
      </div>

      {/* ── Filtres ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") naviguer({ q: recherche }); }}
          onBlur={() => { if (recherche !== (filtres.q || "")) naviguer({ q: recherche }); }}
          placeholder="Nom, gamme, référence…"
          className="h-9 w-[280px] rounded-lg border border-line bg-surface px-3 text-[13px]"
        />

        <select
          value={filtres.marque}
          onChange={(e) => naviguer({ marque: e.target.value })}
          className={`h-9 rounded-lg border px-2.5 text-[13px] ${filtres.marque ? "border-orange bg-orange-tint font-semibold text-orange-dark" : "border-line bg-surface"}`}
        >
          <option value="">Toutes les marques</option>
          {marques.map((m) => <option key={m.slug} value={m.slug}>{m.nom}</option>)}
        </select>

        <select
          value={filtres.gamme}
          onChange={(e) => naviguer({ gamme: e.target.value })}
          className={`h-9 max-w-[200px] rounded-lg border px-2.5 text-[13px] ${filtres.gamme ? "border-orange bg-orange-tint font-semibold text-orange-dark" : "border-line bg-surface"}`}
        >
          <option value="">Toutes les gammes</option>
          {gammes.map((g) => <option key={g.id} value={g.slug}>{g.nom}</option>)}
        </select>

        <select
          value={filtres.rayon}
          onChange={(e) => naviguer({ rayon: e.target.value })}
          className={`h-9 max-w-[240px] rounded-lg border px-2.5 text-[13px] ${filtres.rayon ? "border-orange bg-orange-tint font-semibold text-orange-dark" : "border-line bg-surface"}`}
        >
          <option value="">Tous les rayons</option>
          {rayons.map((r) => (
            <option key={r.slug} value={r.slug}>{r.categorie?.nom} · {r.nom}</option>
          ))}
        </select>
      </div>

      {/* ── Vues enregistrées ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Vues</span>
        <button
          type="button"
          onClick={() => naviguer({ vue: "" })}
          className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px] ${
            !filtres.vue ? "border-ink bg-ink font-semibold text-white" : "border-line bg-surface"
          }`}
        >
          Tout <span className="font-display font-semibold opacity-70">{totalCatalogue}</span>
        </button>
        {vues.map((v) => {
          const actif = filtres.vue === v.cle;
          const urgent = v.compte > 0 && ["sans-visuel", "sans-finition"].includes(v.cle);
          return (
            <button
              key={v.cle}
              type="button"
              onClick={() => naviguer({ vue: actif ? "" : v.cle })}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px] ${
                actif ? "border-ink bg-ink font-semibold text-white"
                  : urgent ? "border-orange/40 bg-orange-tint/50 text-orange-dark"
                  : "border-line bg-surface text-ink-soft"
              }`}
            >
              {v.nom}
              <span className="font-display font-semibold">{v.compte}</span>
            </button>
          );
        })}
      </div>

      {/* ── Barre de sélection ─────────────────────────────────────── */}
      {selection.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink px-4 py-3">
          <span className="text-[13px] font-semibold text-white">
            {selection.size} produit{selection.size > 1 ? "s" : ""} sélectionné{selection.size > 1 ? "s" : ""}
          </span>
          {horsPage > 0 && (
            // La sélection survit au changement de page et de filtre. Sans ce
            // rappel, on croirait avoir perdu ce qu'on avait coché.
            <span className="text-[12.5px] text-ink-soft">dont {horsPage} hors de la page affichée</span>
          )}
          <span className="flex-1" />
          <button type="button" onClick={() => publierSelection(true)}
            className="h-8 rounded-lg border border-white/20 px-3 text-[13px] text-white">Publier</button>
          <button type="button" onClick={() => publierSelection(false)}
            className="h-8 rounded-lg border border-white/20 px-3 text-[13px] text-white">Dépublier</button>
          <button type="button" onClick={() => setSelection(new Set())}
            className="h-8 w-8 rounded-lg border border-white/20 text-white" aria-label="Vider la sélection">×</button>
        </div>
      )}

      {/* ── Le tableau ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          <input
            type="checkbox"
            checked={lignes.length > 0 && lignes.every((l) => selection.has(l.id))}
            onChange={toutBasculer}
            className="h-4 w-4 accent-orange"
            aria-label="Tout sélectionner"
          />
          <span className="flex-1">Produit</span>
          <span className="w-[180px]">Rayon</span>
          <span className="w-[150px]">Choix</span>
          <span className="w-[130px] text-right">Prix vente HT</span>
          <span className="w-[110px] text-center">Complétude</span>
        </div>

        {!lignes.length && (
          <div className="px-4 py-12 text-center text-sm text-ink-soft">
            Aucun produit ne correspond à ces filtres.
          </div>
        )}

        {lignes.map((l, i) => (
          <div
            key={l.id}
            className={`flex items-center gap-3 border-b border-line/50 px-4 py-2.5 ${
              selection.has(l.id) ? "bg-orange-tint/30" : i % 2 ? "bg-surface-2/20" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selection.has(l.id)}
              onChange={() => basculer(l.id)}
              className="h-4 w-4 accent-orange"
              aria-label={`Sélectionner ${l.nom}`}
            />

            <Link href={`/admin/produits/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2/40">
                {l.vignette
                  ? <img src={l.vignette} alt="" className="h-full w-full object-contain" />
                  : <span className="text-[9px] text-ink-soft/60">—</span>}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium">{l.nom}</span>
                  {!l.publie && (
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">brouillon</span>
                  )}
                </span>
                <span className="block truncate text-[11.5px] text-ink-soft">
                  {l.gamme} · {l.marque}
                </span>
              </span>
            </Link>

            <span className="w-[180px] truncate text-[12.5px] text-ink-soft">{l.rayon || "—"}</span>

            <span className="flex w-[150px] flex-wrap gap-1.5">
              {l.nbTarifaires > 0 && (
                <span className="rounded bg-orange-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-orange-dark">
                  {l.nbTarifaires} tarifaire{l.nbTarifaires > 1 ? "s" : ""}
                </span>
              )}
              {l.nbFinitions > 0 && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                  {l.nbFinitions} finition{l.nbFinitions > 1 ? "s" : ""}
                </span>
              )}
            </span>

            <span className="w-[130px] text-right font-display text-[13px] font-semibold">
              {l.surDevis ? <span className="text-ink-soft">sur devis</span>
                : l.prixMin == null ? <span className="text-ink-soft">—</span>
                : l.prixMin === l.prixMax ? euros(l.prixMin)
                : `${euros(l.prixMin)} – ${euros(l.prixMax)}`}
            </span>

            <span className="flex w-[110px] justify-center gap-1.5">
              {l.sante.map((ok, j) => (
                <span
                  key={j}
                  title={SANTE[j]}
                  className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-600" : "bg-line"}`}
                />
              ))}
            </span>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-4 border-t border-line bg-surface-2/40 px-4 py-3">
          <span className="text-[12.5px] text-ink-soft">
            {total === 0 ? "aucun résultat"
              : `${(page - 1) * parPage + 1} – ${Math.min(page * parPage, total)} sur ${total}`}
          </span>
          <span className="flex items-center gap-2 text-[12px] text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> renseigné
            <span className="ml-2 h-2 w-2 rounded-full bg-line" /> manquant
            <span className="ml-1">— visuel · prix · choix · finition · rayon</span>
          </span>
          <span className="flex-1" />
          <span className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => naviguer({ page: page - 1 })}
              className="h-8 w-8 rounded-lg border border-line bg-surface disabled:opacity-40"
              aria-label="Page précédente"
            >‹</button>
            <span className="flex h-8 items-center px-2 text-[12.5px] text-ink-soft">{page} / {pages}</span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => naviguer({ page: page + 1 })}
              className="h-8 w-8 rounded-lg border border-line bg-surface disabled:opacity-40"
              aria-label="Page suivante"
            >›</button>
          </span>
        </div>
      </div>
    </div>
  );
}
