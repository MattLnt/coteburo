"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { chargerCible, definirMiseEnAvant } from "./actions";
import { PLAFOND } from "./constantes";

// L'écran de mise en avant. À gauche l'arbre des cibles ; à droite la
// sélection ordonnée (douze au plus), puis les autres fiches du rayon avec
// une recherche. Chaque geste enregistre : rien à valider.
export default function MiseEnAvantClient({ cibles }) {
  const [cible, setCible] = useState(null);      // { type, id, nom }
  const [donnees, setDonnees] = useState(null);  // { enAvant, autres }
  const [q, setQ] = useState("");
  const [compte, setCompte] = useState(() => {
    const m = new Map();
    for (const c of cibles) {
      m.set(`categorie:${c.id}`, c.nbEnAvant);
      for (const s of c.sousCategories) m.set(`sousCategorie:${s.id}`, s.nbEnAvant);
    }
    return m;
  });
  const [enCours, demarrer] = useTransition();

  // Le vidage se fait au clic, pas dans l'effet : React refuse un setState
  // synchrone dans un effet, et il a raison — deux rendus pour un.
  const choisir = (suivante) => { setDonnees(null); setCible(suivante); };

  useEffect(() => {
    if (!cible) return;
    let vivant = true;
    chargerCible(cible.type, cible.id).then((d) => { if (vivant) setDonnees(d); });
    return () => { vivant = false; };
  }, [cible]);

  const enregistrer = (enAvant) => {
    const autresIds = new Set(enAvant.map((c) => c.id));
    const autres = [...(donnees?.autres || []), ...(donnees?.enAvant || [])]
      .filter((c) => !autresIds.has(c.id))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    setDonnees({ enAvant, autres });
    setCompte((m) => new Map(m).set(`${cible.type}:${cible.id}`, enAvant.length));
    demarrer(async () => { await definirMiseEnAvant(cible.type, cible.id, enAvant.map((c) => c.id)); });
  };

  const ajouter = (c) => {
    if ((donnees?.enAvant.length || 0) >= PLAFOND) return;
    enregistrer([...donnees.enAvant, c]);
  };
  const retirer = (id) => enregistrer(donnees.enAvant.filter((c) => c.id !== id));
  const deplacer = (i, sens) => {
    const l = [...donnees.enAvant];
    const j = i + sens;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    enregistrer(l);
  };

  const filtre = q.trim().toLowerCase();
  const autresVisibles = useMemo(
    () => (donnees?.autres || []).filter((c) => !filtre || c.nom.toLowerCase().includes(filtre)),
    [donnees, filtre],
  );
  const plein = (donnees?.enAvant.length || 0) >= PLAFOND;
  const badge = (type, id) => {
    const n = compte.get(`${type}:${id}`) || 0;
    return n ? <span className="ml-auto rounded-full bg-orange/15 px-2 py-0.5 text-[11px] font-semibold text-orange-dark">{n}</span> : null;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[24px] font-bold text-ink">Mise en avant</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Les {PLAFOND} premières cartes de chaque catégorie et de chaque rayon, dans l&apos;ordre que
          tu choisis. Les autres suivent par nom.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* ── L'arbre ─────────────────────────────────────────────── */}
        <nav className="rounded-2xl border border-line bg-white p-2">
          {cibles.map((c) => (
            <div key={c.id} className="mb-1">
              <button
                type="button"
                onClick={() => choisir({ type: "categorie", id: c.id, nom: c.nom })}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] font-semibold transition ${
                  cible?.id === c.id ? "bg-orange/10 text-orange-dark" : "text-ink hover:bg-surface"
                }`}
              >
                {c.nom}
                <span className="text-[11px] font-normal text-ink-soft">{c.nbFiches}</span>
                {badge("categorie", c.id)}
              </button>
              {c.sousCategories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => choisir({ type: "sousCategorie", id: s.id, nom: `${c.nom} › ${s.nom}` })}
                  className={`flex w-full items-center gap-2 rounded-xl py-1.5 pl-7 pr-3 text-left text-[13px] transition ${
                    cible?.id === s.id ? "bg-orange/10 text-orange-dark" : "text-ink-soft hover:bg-surface hover:text-ink"
                  }`}
                >
                  {s.nom}
                  <span className="text-[11px] text-ink-soft/70">{s.nbFiches}</span>
                  {badge("sousCategorie", s.id)}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* ── La cible ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {!cible && (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-[13.5px] text-ink-soft">
              Choisis une catégorie ou un rayon à gauche.
            </div>
          )}

          {cible && (
            <>
              <section className="rounded-2xl border border-line bg-white">
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <h2 className="text-[15px] font-bold text-ink">{cible.nom}</h2>
                  <span className={`text-[12px] ${plein ? "font-semibold text-orange-dark" : "text-ink-soft"}`}>
                    {donnees ? `${donnees.enAvant.length} / ${PLAFOND} en avant` : "…"}
                  </span>
                  {enCours && <span className="ml-auto text-[11.5px] text-ink-soft">enregistrement…</span>}
                </header>

                {donnees && !donnees.enAvant.length && (
                  <p className="px-4 py-5 text-[13px] text-ink-soft">
                    Rien en avant : le rayon s&apos;ouvre par ordre alphabétique. Ajoute des fiches depuis la liste en dessous.
                  </p>
                )}

                {donnees && donnees.enAvant.length > 0 && (
                  <ol className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
                    {donnees.enAvant.map((c, i) => (
                      <li key={c.id} className="relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
                        <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>
                        <div className="flex h-[110px] items-center justify-center bg-white">
                          {c.image
                            ? <img src={c.image} alt="" className="h-full w-full object-contain p-2" />
                            : <span className="text-[11px] text-ink-soft">sans image</span>}
                        </div>
                        <p className="line-clamp-2 px-2.5 pt-2 text-[12.5px] font-semibold leading-snug text-ink">{c.nom}</p>
                        <div className="mt-auto flex items-center gap-1 p-2">
                          <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} title="Avancer"
                            className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:border-ink hover:text-ink disabled:opacity-30">←</button>
                          <button type="button" onClick={() => deplacer(i, 1)} disabled={i === donnees.enAvant.length - 1} title="Reculer"
                            className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:border-ink hover:text-ink disabled:opacity-30">→</button>
                          <button type="button" onClick={() => retirer(c.id)} title="Retirer"
                            className="ml-auto grid h-7 w-7 place-items-center rounded-lg border border-line bg-white text-ink-soft hover:border-red-500 hover:text-red-600">×</button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="rounded-2xl border border-line bg-white">
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">
                    Les autres fiches · {autresVisibles.length}
                  </h2>
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Chercher…"
                    className="ml-auto w-[220px] rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] outline-none focus:border-orange"
                  />
                </header>
                {!donnees && <p className="px-4 py-5 text-[13px] text-ink-soft">Chargement…</p>}
                {donnees && (
                  <ul className="max-h-[520px] overflow-y-auto">
                    {autresVisibles.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 border-b border-line/60 px-4 py-2 last:border-b-0">
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                          {c.image
                            ? <img src={c.image} alt="" className="h-full w-full object-contain" />
                            : <span className="text-[10px] text-ink-soft">—</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] text-ink">{c.nom}</span>
                          <span className="block truncate text-[11.5px] text-ink-soft">{c.gammeNom}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => ajouter(c)}
                          disabled={plein}
                          title={plein ? `Déjà ${PLAFOND} en avant` : "Mettre en avant"}
                          className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-semibold text-ink-soft transition hover:border-orange hover:text-orange disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + en avant
                        </button>
                      </li>
                    ))}
                    {!autresVisibles.length && (
                      <li className="px-4 py-5 text-[13px] text-ink-soft">Aucune fiche ne correspond.</li>
                    )}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
