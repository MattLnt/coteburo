"use client";
import { useState } from "react";
import GammesManager from "./GammesManager";
import CategoriesManager from "./CategoriesManager";

export default function GammesEtCategoriesManager({ gammes, categories }) {
  const [onglet, setOnglet] = useState("gammes"); // "gammes" | "categories"

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#f0ece4", padding: 4, borderRadius: 12, marginBottom: 22, width: "fit-content" }}>
        {[
          ["gammes", `Gammes (${gammes.length})`],
          ["categories", `Catégories (${categories.length})`],
        ].map(([val, lbl]) => (
          <button key={val} onClick={() => setOnglet(val)}
            style={{ padding: "9px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
              background: onglet === val ? "#fff" : "transparent", color: onglet === val ? "#f0661b" : "#5c616a",
              boxShadow: onglet === val ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
            {lbl}
          </button>
        ))}
      </div>

      {onglet === "gammes" ? <GammesManager gammes={gammes} /> : <CategoriesManager categories={categories} />}
    </div>
  );
}