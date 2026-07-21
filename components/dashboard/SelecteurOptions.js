"use client";
import { useState, useMemo } from "react";
import { identifierAxesEtOptions, resoudreSelection, filtrerProduits } from "@/lib/optionsProduit";

const eur = (n) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n));

export default function SelecteurOptions({ produits, onResolve }) {
  const identifs = useMemo(() => identifierAxesEtOptions(produits), [produits]);
  const [selection, setSelection] = useState({});
  const [optionsReponses, setOptionsReponses] = useState({});

  const { match, restants } = useMemo(
    () => resoudreSelection(produits, selection, optionsReponses),
    [produits, selection, optionsReponses]
  );

  useMemo(() => { if (onResolve) onResolve(match); }, [match]); // eslint-disable-line

  const choisirAxe = (key, value) => {
    setSelection((s) => (s[key] === value ? (() => { const n = { ...s }; delete n[key]; return n; })() : { ...s, [key]: value }));
  };
  const choisirOption = (key, val) => {
    setOptionsReponses((o) => (o[key] === val ? (() => { const n = { ...o }; delete n[key]; return n; })() : { ...o, [key]: val }));
  };

  const valeurDisponible = (axeKey, value) => {
    const sansCetAxe = { ...selection };
    delete sansCetAxe[axeKey];
    const restantsPourAxe = filtrerProduits(produits, sansCetAxe, optionsReponses);
    return restantsPourAxe.some((p) => String(p[axeKey]) === String(value));
  };

  const pastille = (actif, dispo) => ({
    padding: "9px 16px", borderRadius: 10, cursor: dispo ? "pointer" : "not-allowed", fontSize: 13.5, fontWeight: 600,
    border: "1px solid " + (actif ? "#f0661b" : dispo ? "#ece8e0" : "#f3f0ea"),
    background: actif ? "#fce6d6" : dispo ? "#fff" : "#f7f4ef",
    color: actif ? "#d9551a" : dispo ? "#23262a" : "#c4c0b8",
    opacity: dispo ? 1 : 0.55,
  });

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };

  if (identifs.axes.length === 0 && identifs.optionsBool.length === 0) {
    return <p style={{ fontSize: 13.5, color: "#9aa0a8" }}>Ce type n'a pas d'options configurables (produit unique ou accessoire).</p>;
  }

  return (
    <div>
      {identifs.axes.map((axe) => (
        <div key={axe.key} style={{ marginBottom: 20 }}>
          <label style={label}>{axe.label}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {axe.valeurs.map((v) => {
              const actif = selection[axe.key] === v.value;
              const dispo = valeurDisponible(axe.key, v.value);
              return (
                <button key={v.value} type="button" disabled={!dispo && !actif}
                  onClick={() => choisirAxe(axe.key, v.value)} style={pastille(actif, dispo || actif)}>
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {identifs.optionsBool.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Options</label>
          {identifs.optionsBool.map((o) => (
            <div key={o.key} style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#5c616a", marginRight: 10 }}>{o.label}</span>
              <button type="button" onClick={() => choisirOption(o.key, true)} style={{ ...pastille(optionsReponses[o.key] === true, true), marginRight: 6 }}>Oui</button>
              <button type="button" onClick={() => choisirOption(o.key, false)} style={pastille(optionsReponses[o.key] === false, true)}>Non</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: match ? "#e8f6f0" : "#faf8f4", border: "1px solid " + (match ? "#bfe6d4" : "#ece8e0") }}>
        {match ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, color: "#1f7a52", fontWeight: 700 }}>✓ Produit résolu</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#23262a" }}>
                <span style={{ fontFamily: "monospace" }}>{match.codeRacine}</span> · {match.designation}
              </p>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#23262a" }}>{eur(match.prixVenteHT ?? match.prixPublicHT)}</span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#5c616a" }}>
            {restants.length} combinaison{restants.length > 1 ? "s" : ""} possible{restants.length > 1 ? "s" : ""} — continuez à choisir pour affiner.
          </p>
        )}
      </div>
    </div>
  );
}