"use client";

// L'écran de tri des visuels.
//
// LE GESTE
//   Les images du dépôt au centre, les fiches de la gamme à droite. On coche
//   des images, on clique une fiche : elles partent sur Cloudinary, se
//   rattachent à la fiche et quittent le dépôt. Rien d'autre à apprendre.
//
// POURQUOI PAS UN GLISSER-DÉPOSER
//   On attribue souvent dix images d'un coup, et une liste de quarante fiches
//   ne tient pas à l'écran en même temps que trois cents vignettes. Cocher
//   puis désigner demande deux gestes au lieu d'un, mais aucun ne rate.
//
// CE QUI EST IRRÉVERSIBLE, ET CE QUI NE L'EST PAS
//   Attribuer l'est presque : l'image part en ligne et se range. On la retire
//   depuis l'onglet Visuels de la fiche. Écarter ne l'est pas du tout : le
//   fichier va dans un dossier voisin, d'où il revient à la main.

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { chargerGamme, attribuer, ecarter } from "./actions";

const BTN = "h-9 rounded-lg border border-line px-3 text-[13px] hover:border-orange hover:text-orange-dark disabled:opacity-40";
const ETIQ = "text-[11px] font-semibold uppercase tracking-wider text-ink-soft";

const SOUS = {
  photo: { nom: "Photo", fond: "bg-surface-2 text-ink-soft" },
  ambiance: { nom: "Ambiance", fond: "bg-orange-tint text-orange-dark" },
  schema: { nom: "Schéma", fond: "bg-emerald-50 text-emerald-700" },
};

export default function TriVisuels({ gammes, racine }) {
  const [gammeId, setGammeId] = useState(null);
  const [donnees, setDonnees] = useState(null);
  const [choisies, setChoisies] = useState(() => new Set());
  const [filtre, setFiltre] = useState("");
  const [message, setMessage] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [enCours, demarrer] = useTransition();

  const ouvrir = (id) => {
    setGammeId(id);
    setDonnees(null);
    setChoisies(new Set());
    setMessage(null);
    demarrer(async () => {
      const r = await chargerGamme(id);
      if (r?.ok === false) { setMessage({ erreur: r.error }); return; }
      setDonnees(r);
    });
  };

  // Le clavier : Échap ferme l'aperçu, ce qui évite de viser la croix.
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") setZoom(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const depot = useMemo(() => {
    const l = donnees?.depot || [];
    if (!filtre.trim()) return l;
    const q = filtre.toLowerCase();
    return l.filter((x) => x.nom.toLowerCase().includes(q));
  }, [donnees, filtre]);

  const basculer = (rel, e) => {
    setChoisies((s) => {
      const n = new Set(s);
      // Maj enfoncée : de la dernière cochée jusqu'ici, comme un explorateur.
      if (e?.shiftKey && n.size) {
        const rangs = depot.map((x) => x.rel);
        const dernier = [...n].map((r) => rangs.indexOf(r)).filter((i) => i >= 0).pop();
        const ici = rangs.indexOf(rel);
        if (dernier >= 0 && ici >= 0) {
          const [a, b] = dernier < ici ? [dernier, ici] : [ici, dernier];
          for (let i = a; i <= b; i += 1) n.add(rangs[i]);
          return n;
        }
      }
      if (n.has(rel)) n.delete(rel); else n.add(rel);
      return n;
    });
  };

  const versFiche = (fiche) => {
    if (!choisies.size) return;
    const rels = [...choisies];
    demarrer(async () => {
      const r = await attribuer(fiche.id, rels);
      if (r?.ok === false) { setMessage({ erreur: r.error }); return; }
      setMessage({
        texte: `${r.faits} image${r.faits > 1 ? "s" : ""} sur « ${fiche.nom} »`
          + (r.echecs?.length ? ` · ${r.echecs.length} en échec` : ""),
        detail: r.echecs?.slice(0, 3).map((e) => e.raison),
      });
      setChoisies(new Set());
      const suite = await chargerGamme(gammeId);
      if (suite?.ok) setDonnees(suite);
    });
  };

  const versEcart = () => {
    if (!choisies.size) return;
    const rels = [...choisies];
    demarrer(async () => {
      const r = await ecarter(rels);
      setMessage({ texte: `${r.ecartees || 0} image(s) écartée(s) — elles restent sur le disque.` });
      setChoisies(new Set());
      const suite = await chargerGamme(gammeId);
      if (suite?.ok) setDonnees(suite);
    });
  };

  const totalDepot = gammes.reduce((n, g) => n + g.nbDepot, 0);
  const totalVides = gammes.reduce((n, g) => n + g.vides, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Tri des visuels</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
          {totalVides} fiche{totalVides > 1 ? "s" : ""} sans aucune image,
          {" "}{totalDepot} fichier{totalDepot > 1 ? "s" : ""} en attente dans les dépôts.
          Cochez des images, désignez la fiche.
        </p>
        <p className="mt-1 text-[11.5px] text-ink-soft/70">
          Médiathèque : <code>{racine}</code>
        </p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-[13px] ${
          message.erreur ? "border-orange bg-orange-tint text-orange-dark"
            : "border-line bg-surface-2 text-ink"
        }`}>
          {message.erreur || message.texte}
          {message.detail?.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-[12px] text-ink-soft">
              {message.detail.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">

        {/* ── Les gammes ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-surface p-2">
          <div className={`${ETIQ} px-2 py-1.5`}>Gammes</div>
          <div className="max-h-[70vh] overflow-y-auto">
            {gammes.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => ouvrir(g.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${
                  gammeId === g.id ? "bg-orange-tint font-semibold text-orange-dark" : "hover:bg-surface-2"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{g.nom}</span>
                  <span className="block text-[11px] font-normal text-ink-soft">
                    {g.marque}
                    {g.vides > 0 && ` · ${g.vides} vide${g.vides > 1 ? "s" : ""}`}
                  </span>
                </span>
                {g.nbDepot > 0 && (
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-soft">
                    {g.nbDepot}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Le dépôt et les fiches ─────────────────────────────────── */}
        {!donnees ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface p-16 text-center text-sm text-ink-soft">
            {enCours ? "Lecture du dépôt…" : "Choisissez une gamme à gauche."}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">

            <div className="rounded-2xl border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                <span className="text-sm font-semibold">{donnees.gamme.nom}</span>
                <span className="text-[12.5px] text-ink-soft">
                  {donnees.depot.length} image{donnees.depot.length > 1 ? "s" : ""} à trier
                </span>
                <span className="flex-1" />
                <input
                  value={filtre}
                  onChange={(e) => setFiltre(e.target.value)}
                  placeholder="Filtrer par nom…"
                  className="h-8 w-[180px] rounded-lg border border-line px-2.5 text-[12.5px]"
                />
                {choisies.size > 0 && (
                  <>
                    <span className="rounded-full bg-orange px-2.5 py-1 text-[12px] font-semibold text-white">
                      {choisies.size} cochée{choisies.size > 1 ? "s" : ""}
                    </span>
                    <button type="button" className={BTN} onClick={() => setChoisies(new Set())}>
                      Décocher
                    </button>
                    <button type="button" className={BTN} onClick={versEcart} disabled={enCours}>
                      Écarter
                    </button>
                  </>
                )}
              </div>

              {depot.length === 0 ? (
                <div className="p-12 text-center text-[13px] text-ink-soft">
                  {donnees.depot.length
                    ? "Aucune image ne correspond au filtre."
                    : "Le dépôt est vide. Cette gamme est triée."}
                </div>
              ) : (
                <div className="grid max-h-[62vh] grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2 overflow-y-auto p-3">
                  {depot.map((img) => {
                    const prise = choisies.has(img.rel);
                    const s = SOUS[img.sous] || SOUS.photo;
                    return (
                      <div
                        key={img.rel}
                        className={`relative overflow-hidden rounded-xl border ${
                          prise ? "border-orange ring-2 ring-orange/30" : "border-line"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => basculer(img.rel, e)}
                          title={img.nom}
                          className="block w-full"
                        >
                          <img
                            src={`/admin/visuels/vignette?f=${encodeURIComponent(img.rel)}`}
                            alt=""
                            loading="lazy"
                            className="h-[110px] w-full bg-white object-contain"
                          />
                          <span className="block truncate px-1.5 py-1 text-left text-[10.5px] text-ink-soft">
                            {img.nom}
                          </span>
                        </button>
                        <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${s.fond}`}>
                          {s.nom}
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoom(img)}
                          title="Voir en grand"
                          className="absolute right-1 top-1 rounded bg-surface/90 px-1.5 py-0.5 text-[10px] text-ink-soft hover:text-orange-dark"
                        >
                          ⤢
                        </button>
                        {prise && (
                          <span className="absolute bottom-6 right-1 grid h-5 w-5 place-items-center rounded-full bg-orange text-[11px] font-bold text-white">
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Les fiches ───────────────────────────────────────── */}
            <div className="rounded-2xl border border-line bg-surface">
              <div className="border-b border-line px-4 py-3">
                <span className="text-sm font-semibold">Vers quelle fiche ?</span>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {choisies.size
                    ? `${choisies.size} image${choisies.size > 1 ? "s" : ""} prête${choisies.size > 1 ? "s" : ""} — cliquez une fiche.`
                    : "Cochez d'abord des images."}
                </p>
              </div>
              <div className="max-h-[62vh] overflow-y-auto p-2">
                {[...donnees.fiches].sort((a, b) => a.nb - b.nb || a.nom.localeCompare(b.nom, "fr")).map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2">
                    <button
                      type="button"
                      disabled={!choisies.size || enCours}
                      onClick={() => versFiche(f)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
                    >
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line bg-white">
                        {f.vignette
                          ? <img src={f.vignette} alt="" className="h-full w-full object-cover" />
                          : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px]">{f.nom}</span>
                        <span className={`block text-[11px] ${f.nb ? "text-ink-soft" : "text-orange-dark font-semibold"}`}>
                          {f.nb ? `${f.nb} visuel${f.nb > 1 ? "s" : ""}` : "aucune image"}
                        </span>
                      </span>
                    </button>
                    <Link
                      href={`/admin/produits/${f.id}`}
                      target="_blank"
                      title="Ouvrir la fiche"
                      className="shrink-0 px-1 text-[13px] text-ink-soft hover:text-orange-dark"
                    >
                      ↗
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-8"
          onClick={() => setZoom(null)}
        >
          <div className="max-h-full overflow-hidden rounded-2xl bg-surface p-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={`/admin/visuels/vignette?t=600&f=${encodeURIComponent(zoom.rel)}`}
              alt=""
              className="max-h-[75vh] bg-white object-contain"
            />
            <div className="flex items-center gap-3 px-2 py-2">
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">{zoom.nom}</span>
              <button type="button" className={BTN} onClick={() => setZoom(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
