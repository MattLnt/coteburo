"use client";

import { useEffect, useMemo, useState } from "react";
import { listerCandidatsOptions, majOptionsLiees } from "./actions";

// Les options liées d'une fiche : ce que le client peut ajouter au produit
// depuis sa page. Une case par candidat, enregistrée au clic.
//
// Deux groupes, pour que l'œil trouve : les fiches de la même gamme d'abord
// — c'est là que sont les bons accessoires —, puis les compléments de tout
// le catalogue. La recherche filtre les deux.
export default function OngletOptions({ vitrineId, idsInitiaux, agir }) {
  const [candidats, setCandidats] = useState(null);
  const [ids, setIds] = useState(idsInitiaux || []);
  const [q, setQ] = useState("");

  useEffect(() => {
    let vivant = true;
    listerCandidatsOptions(vitrineId).then((l) => { if (vivant) setCandidats(l || []); });
    return () => { vivant = false; };
  }, [vitrineId]);

  const basculer = (id) => {
    const suite = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setIds(suite);
    agir(majOptionsLiees(vitrineId, suite));
  };

  const filtre = q.trim().toLowerCase();
  const visibles = useMemo(
    () => (candidats || []).filter((c) => !filtre || c.nom.toLowerCase().includes(filtre)),
    [candidats, filtre],
  );
  const groupes = [
    { cle: "gamme", titre: "Même gamme", liste: visibles.filter((c) => c.memeGamme) },
    { cle: "complements", titre: "Compléments & accessoires", liste: visibles.filter((c) => !c.memeGamme && c.estComplement) },
    { cle: "autres", titre: "Déjà liées, ailleurs", liste: visibles.filter((c) => !c.memeGamme && !c.estComplement) },
  ].filter((g) => g.liste.length);

  const liees = (candidats || []).filter((c) => ids.includes(c.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Les options sont des fiches à part entière, proposées en plus sur la page de ce
          produit. Elles gardent leur prix, leurs choix et leurs visuels — modifie-les depuis
          leur propre fiche. Un complément coché reste vendable seul.
        </p>
        {liees.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {liees.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => basculer(c.id)}
                title="Retirer cette option"
                className="inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/10 px-2.5 py-1 text-[12px] font-semibold text-orange-dark hover:bg-orange/20"
              >
                {c.nom}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Chercher une fiche…"
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-[13.5px] outline-none focus:border-orange"
      />

      {candidats === null && <p className="text-[13px] text-ink-soft">Chargement…</p>}
      {candidats !== null && !visibles.length && (
        <p className="text-[13px] text-ink-soft">Aucune fiche ne correspond.</p>
      )}

      {groupes.map((g) => (
        <section key={g.cle} className="rounded-2xl border border-line bg-white">
          <h3 className="border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {g.titre} · {g.liste.length}
          </h3>
          <ul className="max-h-[420px] overflow-y-auto">
            {g.liste.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 border-b border-line/60 px-4 py-2 last:border-b-0 hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={ids.includes(c.id)}
                    onChange={() => basculer(c.id)}
                    className="h-4 w-4 accent-orange"
                  />
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                    {c.image
                      ? <img src={c.image} alt="" className="h-full w-full object-contain" />
                      : <span className="text-[10px] text-ink-soft">—</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">{c.nom}</span>
                    <span className="block truncate text-[11.5px] text-ink-soft">
                      {c.gammeNom}{c.rayonNom ? ` · ${c.rayonNom}` : ""}{c.publie ? "" : " · non publiée"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
