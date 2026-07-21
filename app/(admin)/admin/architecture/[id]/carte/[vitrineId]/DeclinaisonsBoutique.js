"use client";
import { useState } from "react";

function uid() { return Math.random().toString(36).slice(2, 9); }

// Clé stable d'une combinaison (même ordre d'axes) — sert à réconcilier les prix
// déjà saisis quand on régénère les combinaisons après avoir modifié les valeurs.
function cleCombinaison(axes, valeurs) {
  return axes.map((a) => valeurs[a.id] || "").join("‡");
}

// Produit cartésien de toutes les valeurs de tous les axes
function genererCombinaisons(axes) {
  if (axes.some((a) => !a.valeurs || a.valeurs.length === 0)) return [];
  let combos = [{}];
  for (const axe of axes) {
    const next = [];
    for (const combo of combos) {
      for (const val of axe.valeurs) {
        next.push({ ...combo, [axe.id]: val });
      }
    }
    combos = next;
  }
  return combos;
}

export default function DeclinaisonsBoutique({ axes, lignes, onChangeAxes, onChangeLignes }) {
  const ajouterAxe = (nom) => {
    const nomPropre = nom.trim();
    if (!nomPropre) return;
    const id = uid();
    onChangeAxes([...axes, { id, nom: nomPropre, valeurs: [] }]);
  };
  const renommerAxe = (id, nom) => {
    onChangeAxes(axes.map((x) => (x.id === id ? { ...x, nom } : x)));
  };
  const supprimerAxe = (id) => {
    onChangeAxes(axes.filter((x) => x.id !== id));
    onChangeLignes(lignes.map((l) => { const v = { ...l.valeurs }; delete v[id]; return { ...l, valeurs: v }; }));
  };
  const ajouterValeurAxe = (axeId, valeur) => {
    const v = valeur.trim();
    if (!v) return;
    onChangeAxes(axes.map((a) => (a.id === axeId && !(a.valeurs || []).includes(v) ? { ...a, valeurs: [...(a.valeurs || []), v] } : a)));
  };
  const supprimerValeurAxe = (axeId, valeur) => {
    onChangeAxes(axes.map((a) => (a.id === axeId ? { ...a, valeurs: (a.valeurs || []).filter((v) => v !== valeur) } : a)));
  };

  const genererToutesLesCombinaisons = () => {
    const combos = genererCombinaisons(axes);
    if (combos.length === 0) return;
    const prixExistants = new Map();
    lignes.forEach((l) => prixExistants.set(cleCombinaison(axes, l.valeurs), l.prixVenteHT));
    const nouvellesLignes = combos.map((valeurs) => ({
      id: uid(),
      valeurs,
      prixVenteHT: prixExistants.get(cleCombinaison(axes, valeurs)) ?? "",
    }));
    onChangeLignes(nouvellesLignes);
  };

  const ajouterLigneManuelle = () => {
    const valeurs = {};
    axes.forEach((a) => { valeurs[a.id] = (a.valeurs || [])[0] || ""; });
    onChangeLignes([...lignes, { id: uid(), valeurs, prixVenteHT: "" }]);
  };
  const majValeur = (ligneId, axeId, val) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, valeurs: { ...l.valeurs, [axeId]: val } } : l)));
  };
  const dupliquerLigne = (ligneId) => {
    const idx = lignes.findIndex((l) => l.id === ligneId);
    const copie = { ...lignes[idx], id: uid(), valeurs: { ...lignes[idx].valeurs } };
    const next = [...lignes];
    next.splice(idx + 1, 0, copie);
    onChangeLignes(next);
  };
  const supprimerLigne = (ligneId) => { onChangeLignes(lignes.filter((l) => l.id !== ligneId)); };

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 4 };
  const inputSm = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 13, color: "#23262a", outline: "none" };
  const input = { flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none" };

  const toutesLesValeursDefinies = axes.length > 0 && axes.every((a) => (a.valeurs || []).length > 0);
  const nbCombosPossibles = toutesLesValeursDefinies ? axes.reduce((n, a) => n * a.valeurs.length, 1) : 0;

  return (
    <div>
      {/* ── Bloc 1 : définir les axes + leurs valeurs possibles ── */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <label style={{ ...label, marginBottom: 4 }}>Axes de choix pour ce produit</label>
        <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>
          Nomme les critères de choix propres à ce produit (ex : « Dimension », « Option tiroir »), puis renseigne toutes les valeurs possibles pour chacun. Les combinaisons se génèrent ensuite automatiquement.
        </p>

        {axes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
            {axes.map((a, i) => (
              <div key={a.id} style={{ border: "1px solid #f0ece4", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 22, fontSize: 12.5, color: "#9aa0a8", fontWeight: 600 }}>{i + 1}.</span>
                  <input value={a.nom} onChange={(e) => renommerAxe(a.id, e.target.value)} style={input} />
                  <button onClick={() => supprimerAxe(a.id)} title="Supprimer cet axe"
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 14, flexShrink: 0 }}>🗑</button>
                </div>
                <ValeursAxe axe={a} onAjouter={(v) => ajouterValeurAxe(a.id, v)} onSupprimer={(v) => supprimerValeurAxe(a.id, v)} />
              </div>
            ))}
          </div>
        )}

        <AjoutAxe onAjouter={ajouterAxe} input={input} />
      </div>

      {/* ── Bloc 2 : générer/gérer les combinaisons (sans prix — voir l'onglet Prix) ── */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <label style={{ ...label, marginBottom: 4 }}>Combinaisons</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>
              Une ligne = une combinaison valide. Le prix se règle ensuite dans l'onglet « Prix ». Supprime les combinaisons générées qui n'existent pas réellement pour ce produit.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {lignes.length > 0 && (
              <button onClick={ajouterLigneManuelle}
                style={{ padding: "9px 16px", borderRadius: 9, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                + Ligne manuelle
              </button>
            )}
            <button onClick={genererToutesLesCombinaisons} disabled={!toutesLesValeursDefinies}
              style={{ padding: "9px 16px", borderRadius: 9, background: !toutesLesValeursDefinies ? "#e8e3da" : "#f0661b", color: "#fff", border: "none", cursor: !toutesLesValeursDefinies ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              ⚡ Générer {toutesLesValeursDefinies ? `les ${nbCombosPossibles} combinaisons` : "les combinaisons"}
            </button>
          </div>
        </div>

        {axes.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12 }}>
            Définis d'abord au moins un axe ci-dessus.
          </div>
        ) : !toutesLesValeursDefinies ? (
          <div style={{ padding: 28, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12 }}>
            Ajoute au moins une valeur à chaque axe pour pouvoir générer les combinaisons.
          </div>
        ) : lignes.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12 }}>
            Clique sur « Générer les combinaisons » pour créer automatiquement les {nbCombosPossibles} lignes possibles.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 70px`, gap: 8, marginBottom: 8, padding: "0 4px" }}>
              {axes.map((a) => <span key={a.id} style={label}>{a.nom || "(sans nom)"}</span>)}
              <span></span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lignes.map((l) => (
                <div key={l.id} style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 70px`, gap: 8, alignItems: "center", padding: "6px 4px", borderRadius: 10, background: "#faf8f4" }}>
                  {axes.map((a) => (
                    (a.valeurs || []).length > 0 ? (
                      <select key={a.id} value={l.valeurs[a.id] || ""} onChange={(e) => majValeur(l.id, a.id, e.target.value)} style={inputSm}>
                        <option value="">—</option>
                        {a.valeurs.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <input key={a.id} value={l.valeurs[a.id] || ""} onChange={(e) => majValeur(l.id, a.id, e.target.value)} placeholder="—" style={inputSm} />
                    )
                  ))}
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button onClick={() => dupliquerLigne(l.id)} title="Dupliquer" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 12 }}>⧉</button>
                    <button onClick={() => supprimerLigne(l.id)} title="Supprimer" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 13 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ValeursAxe({ axe, onAjouter, onSupprimer }) {
  const [val, setVal] = useState("");
  const valeurs = axe.valeurs || [];
  return (
    <div>
      {valeurs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {valeurs.map((v) => (
            <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "#fce6d6", color: "#d9551a", fontSize: 12.5, fontWeight: 600 }}>
              {v}
              <button onClick={() => onSupprimer(v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d9551a", fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAjouter(val); setVal(""); } }}
          placeholder="Ajouter une valeur puis Entrée"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 13, color: "#23262a", outline: "none" }} />
        <button onClick={() => { onAjouter(val); setVal(""); }}
          style={{ padding: "8px 14px", borderRadius: 8, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
          + Ajouter
        </button>
      </div>
    </div>
  );
}

function AjoutAxe({ onAjouter, input }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAjouter(val); setVal(""); } }}
        placeholder="Nom du nouvel axe (ex : Dimension)" style={input} />
      <button onClick={() => { onAjouter(val); setVal(""); }}
        style={{ padding: "10px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
        + Ajouter l'axe
      </button>
    </div>
  );
}