"use client";
import { useState } from "react";
import GammesManager from "./GammesManager";
import CategoriesManager from "./CategoriesManager";
import FinitionsManager from "./FinitionsManager";

export default function GammesEtCategoriesManager({ gammes, categories, finitions }) {
  const [onglet, setOnglet] = useState("gammes"); // "gammes" | "categories" | "finitions"

  const nbFinitions = (finitions?.palettes || []).reduce((n, p) => n + (p.finitions?.length || 0), 0)
    + (finitions?.orphelines || []).length;

  const tabs = [
    ["gammes", "Gammes", gammes.length],
    ["categories", "Catégories", categories.length],
    ["finitions", "Finitions", nbFinitions],
  ];

  return (
    <div>
      <style>{`
        /* Mobile : trois parts égales, compteur sous le libellé (sinon « Catégories (7) »
           et « Finitions (48) » ne tiennent pas côte à côte sur 340px).
           Desktop : la barre compacte d'origine. */
        .arch-onglets { display: flex; gap: 3px; background: #f0ece4; padding: 4px; border-radius: 12px; margin-bottom: 18px; }
        .arch-onglet { flex: 1; text-align: center; padding: 8px 4px; }
        .arch-compteur { display: block; font-size: 10px; margin-top: 1px; }
        @media (min-width: 1024px) {
          .arch-onglets { width: fit-content; gap: 4px; margin-bottom: 22px; }
          .arch-onglet { flex: none; padding: 9px 20px; }
          .arch-compteur { display: inline; font-size: inherit; margin: 0 0 0 5px; }
        }
      `}</style>

      <div className="arch-onglets">
        {tabs.map(([val, lbl, nb]) => {
          const actif = onglet === val;
          return (
            <button key={val} onClick={() => setOnglet(val)} className="arch-onglet"
              style={{ borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: actif ? "#fff" : "transparent", color: actif ? "#f0661b" : "#5c616a",
                boxShadow: actif ? "0 1px 3px rgba(0,0,0,0.06)" : "none", fontFamily: "inherit" }}>
              {lbl}
              <span className="arch-compteur" style={{ color: actif ? "#f0661b" : "#9aa0a8", fontWeight: 600 }}>{nb}</span>
            </button>
          );
        })}
      </div>

      {onglet === "gammes" && <GammesManager gammes={gammes} />}
      {onglet === "categories" && <CategoriesManager categories={categories} />}
      {onglet === "finitions" && (
        <FinitionsManager palettes={finitions?.palettes || []} orphelines={finitions?.orphelines || []} />
      )}
    </div>
  );
}