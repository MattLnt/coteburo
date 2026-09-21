"use client";

// L'onglet Descriptif technique : les sections qui décrivent le produit.
//
// Cinq cent cinquante-cinq fiches en portent, écrites au fil de l'import des
// catalogues fournisseurs — « Assise et dossier », « Piétement »,
// « Empilabilité », « Bon à savoir ». Elles n'étaient éditables que dans
// l'ancien éditeur de carte, lequel écrit par ailleurs dans des champs que la
// boutique ne lit plus. Elles reviennent ici.
//
// POURQUOI PAS LA SAUVEGARDE AU BLUR
//   Partout ailleurs, un champ s'enregistre en le quittant. Un éditeur de
//   texte riche n'a pas de « quitter » franc : on clique un bouton de mise en
//   forme, on sort du champ, on y revient. On enregistre donc après un temps
//   de silence, et l'écran dit où il en est.

import { useState, useEffect, useRef } from "react";
import SectionsDescriptives from "@/components/dashboard/SectionsDescriptives";
import { majIdentite } from "./actions";

const SILENCE_MS = 1200;

export default function OngletDescriptif({ produit }) {
  const [sections, setSections] = useState(() =>
    Array.isArray(produit.sectionsDevis) ? produit.sectionsDevis : []);
  const [etat, setEtat] = useState("à jour");   // "à jour" | "en cours" | "modifié" | message
  const minuteur = useRef(null);
  const premier = useRef(true);

  useEffect(() => {
    // Le premier rendu n'est pas une modification.
    if (premier.current) { premier.current = false; return; }
    setEtat("modifié");
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(async () => {
      setEtat("en cours");
      const r = await majIdentite(produit.id, { sectionsDevis: sections });
      setEtat(r?.ok === false ? r.error : "à jour");
    }, SILENCE_MS);
    return () => clearTimeout(minuteur.current);
  }, [sections, produit.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Les sections affichées sur la fiche
        </span>
        <span className="flex-1" />
        <span className={`text-[12.5px] ${
          etat === "à jour" ? "text-ink-soft"
            : etat === "en cours" || etat === "modifié" ? "text-orange-dark"
              : "text-orange-dark font-semibold"
        }`}>
          {etat === "à jour" ? `${sections.length} section${sections.length > 1 ? "s" : ""} · enregistré`
            : etat === "en cours" ? "Enregistrement…"
              : etat === "modifié" ? "Modifié…"
                : etat}
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <SectionsDescriptives sections={sections} onChangeSections={setSections} />
      </div>

      <p className="max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
        Ce texte vous appartient : il vient du catalogue fournisseur mais n'est
        plus relu à l'import. Le réimport du tarif corrige les prix et les
        références, pas ce qui est écrit ici.
      </p>
    </div>
  );
}
