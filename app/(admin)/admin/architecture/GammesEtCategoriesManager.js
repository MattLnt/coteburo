"use client";
import { useState } from "react";
import Onglets from "@/components/dashboard/Onglets";
import GammesManager from "./GammesManager";
import CategoriesManager from "./CategoriesManager";
import FinitionsManager from "./FinitionsManager";

export default function GammesEtCategoriesManager({ gammes, categories, finitions }) {
  const [onglet, setOnglet] = useState("gammes"); // "gammes" | "categories" | "finitions"

  const palettes = finitions?.palettes || [];
  const orphelines = finitions?.orphelines || [];
  const nbFinitions = palettes.reduce((n, p) => n + (p.finitions?.length || 0), 0) + orphelines.length;

  // Ce qui manque, dit à l'onglet plutôt qu'au fond de l'écran.
  const sansIcone = categories.filter((c) => !c.icone).length
    + categories.reduce((n, c) => n + (c.sousCategories || []).filter((s) => !s.icone).length, 0);
  const sansPastille = [...palettes.flatMap((p) => p.finitions || []), ...orphelines]
    .filter((f) => !f.couleur && !f.imageUrl).length;

  const ONGLETS = [
    { cle: "gammes", nom: "Gammes", icone: "layers", compte: gammes.length },
    {
      cle: "categories", nom: "Catégories", icone: "box",
      compte: categories.length,
      alerte: sansIcone ? `${sansIcone} sans icône` : null,
    },
    {
      cle: "finitions", nom: "Finitions", icone: "image",
      compte: nbFinitions,
      alerte: orphelines.length
        ? `${orphelines.length} hors nuancier`
        : sansPastille ? `${sansPastille} sans pastille` : null,
    },
  ];

  return (
    <div>
      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} className="mb-5" />

      {onglet === "gammes" && <GammesManager gammes={gammes} />}
      {onglet === "categories" && <CategoriesManager categories={categories} />}
      {onglet === "finitions" && (
        <FinitionsManager palettes={palettes} orphelines={orphelines} />
      )}
    </div>
  );
}
