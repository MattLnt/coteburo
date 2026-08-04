"use client";
import { useState, useEffect } from "react";
import { getFinitionsModeles } from "../../../actionsFinitions";

function uid() { return Math.random().toString(36).slice(2, 9); }

function cleCombinaison(axes, valeurs) {
  return axes.map((a) => valeurs[a.id] || "").join("‡");
}

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

export default function DeclinaisonsBoutique({ axes, lignes, onChangeAxes, onChangeLignes, sansDeclinaisons, onChangeSansDeclinaisons, referenceUnitaire, onChangeReferenceUnitaire }) {
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
    onChangeAxes(axes.map((a) => {
      if (a.id !== axeId) return a;
      const fpv = { ...(a.finitionsParValeur || {}) };
      delete fpv[valeur];
      return { ...a, valeurs: (a.valeurs || []).filter((v) => v !== valeur), finitionsParValeur: fpv };
    }));
  };
  const deplacerValeurAxe = (axeId, index, dir) => {
    onChangeAxes(axes.map((a) => {
      if (a.id !== axeId) return a;
      const vs = [...(a.valeurs || [])];
      const j = index + dir;
      if (j < 0 || j >= vs.length) return a;
      [vs[index], vs[j]] = [vs[j], vs[index]];
      return { ...a, valeurs: vs };
    }));
  };
  // Renomme une valeur d'axe sans la supprimer : conserve les finitions rattachées
  // et met à jour les combinaisons existantes qui utilisaient l'ancien libellé.
  const renommerValeurAxe = (axeId, ancienne, nouvelle) => {
    const v = (nouvelle || "").trim();
    if (!v || v === ancienne) return;
    onChangeAxes(axes.map((a) => {
      if (a.id !== axeId) return a;
      if ((a.valeurs || []).includes(v)) return a; // évite un doublon
      const valeurs = (a.valeurs || []).map((x) => (x === ancienne ? v : x));
      const fpv = { ...(a.finitionsParValeur || {}) };
      if (fpv[ancienne] !== undefined) { fpv[v] = fpv[ancienne]; delete fpv[ancienne]; }
      return { ...a, valeurs, finitionsParValeur: fpv };
    }));
    onChangeLignes(lignes.map((l) => (l.valeurs[axeId] === ancienne ? { ...l, valeurs: { ...l.valeurs, [axeId]: v } } : l)));
  };
  // Rattache/actualise les finitions d'une valeur d'axe
  const setFinitionsValeur = (axeId, valeur, finitions) => {
    onChangeAxes(axes.map((a) => {
      if (a.id !== axeId) return a;
      const fpv = { ...(a.finitionsParValeur || {}) };
      if (finitions && finitions.length) fpv[valeur] = finitions;
      else delete fpv[valeur];
      return { ...a, finitionsParValeur: fpv };
    }));
  };

  const genererToutesLesCombinaisons = () => {
    const combos = genererCombinaisons(axes);
    if (combos.length === 0) return;
    const prixVenteExistants = new Map();
    const prixTarifExistants = new Map();
    const verrouExistants = new Map();
    const refExistantes = new Map();
    lignes.forEach((l) => {
      const cle = cleCombinaison(axes, l.valeurs);
      prixVenteExistants.set(cle, l.prixVenteHT);
      prixTarifExistants.set(cle, l.prixTarifHT);
      verrouExistants.set(cle, l.prixVerrouille);
      refExistantes.set(cle, l.referenceFournisseur);
    });
    const nouvellesLignes = combos.map((valeurs) => {
      const cle = cleCombinaison(axes, valeurs);
      return {
        id: uid(),
        valeurs,
        prixTarifHT: prixTarifExistants.get(cle) ?? "",
        prixVenteHT: prixVenteExistants.get(cle) ?? "",
        prixVerrouille: verrouExistants.get(cle) ?? false,
        referenceFournisseur: refExistantes.get(cle) ?? "",
      };
    });
    onChangeLignes(nouvellesLignes);
  };

  const ajouterLigneManuelle = () => {
    const valeurs = {};
    axes.forEach((a) => { valeurs[a.id] = (a.valeurs || [])[0] || ""; });
    onChangeLignes([...lignes, { id: uid(), valeurs, prixTarifHT: "", prixVenteHT: "", prixVerrouille: false, referenceFournisseur: "" }]);
  };
  const majValeur = (ligneId, axeId, val) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, valeurs: { ...l.valeurs, [axeId]: val } } : l)));
  };
  const majReference = (ligneId, val) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, referenceFournisseur: val } : l)));
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
      {/* ── Switch : ce produit a-t-il des déclinaisons ? ── */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <label style={{ ...label, marginBottom: 10 }}>Ce produit a-t-il des déclinaisons ?</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button type="button" onClick={() => onChangeSansDeclinaisons(false)}
            style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
              border: "1.5px solid " + (!sansDeclinaisons ? "#f0661b" : "#ece8e0"),
              background: !sansDeclinaisons ? "#fef4ee" : "#faf8f4",
              color: !sansDeclinaisons ? "#d9551a" : "#5c616a" }}>
            Oui, avec déclinaisons
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: !sansDeclinaisons ? "#b45528" : "#9aa0a8", marginTop: 3 }}>Axes + combinaisons, un prix par combinaison</span>
          </button>
          <button type="button" onClick={() => onChangeSansDeclinaisons(true)}
            style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
              border: "1.5px solid " + (sansDeclinaisons ? "#f0661b" : "#ece8e0"),
              background: sansDeclinaisons ? "#fef4ee" : "#faf8f4",
              color: sansDeclinaisons ? "#d9551a" : "#5c616a" }}>
            Non, prix unique
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: sansDeclinaisons ? "#b45528" : "#9aa0a8", marginTop: 3 }}>Un seul prix (couleurs/options en Finitions)</span>
          </button>
        </div>
      </div>

      {sansDeclinaisons ? (
        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch" }}>
            {/* Colonne gauche : rappel */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 22px", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12, lineHeight: 1.6 }}>
              Ce produit est en <strong style={{ color: "#5c616a" }}>prix unique</strong> — pas d'axes ni de combinaisons.
              <span style={{ display: "block", marginTop: 8 }}>
                Le <strong style={{ color: "#5c616a" }}>prix</strong> se saisit dans l'onglet « Prix », les <strong style={{ color: "#5c616a" }}>couleurs/options</strong> dans « Finitions ».
              </span>
            </div>
            {/* Colonne droite : référence fournisseur */}
            <div>
              <label style={{ ...label, marginBottom: 4 }}>Référence fournisseur</label>
              <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 10px" }}>Le code exact à commander pour ce produit (ex : ARC06BE).</p>
              <input
                value={referenceUnitaire || ""}
                onChange={(e) => onChangeReferenceUnitaire(e.target.value)}
                placeholder="ex : ARC06BE"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (referenceUnitaire?.trim() ? "#ece8e0" : "#f0c4a0"), background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", fontFamily: "monospace", fontWeight: 700, boxSizing: "border-box" }}
              />
              {!referenceUnitaire?.trim() && (
                <p style={{ fontSize: 12.5, color: "#b45528", background: "#fef4ee", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
                  ⚠ Sans référence fournisseur, impossible de savoir quoi commander.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Bloc 1 : définir les axes + leurs valeurs possibles ── */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <label style={{ ...label, marginBottom: 4 }}>Axes de choix pour ce produit</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>
              Nomme les critères de choix propres à ce produit (ex : « Dimension », « Option tiroir »), puis renseigne toutes les valeurs possibles pour chacun. Les combinaisons se génèrent ensuite automatiquement. Tu peux rattacher des finitions à une valeur (ex : Poignée « Classique » → ses coloris).
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
                    <ValeursAxe
                      axe={a}
                      onAjouter={(v) => ajouterValeurAxe(a.id, v)}
                      onSupprimer={(v) => supprimerValeurAxe(a.id, v)}
                      onSetFinitions={(v, fins) => setFinitionsValeur(a.id, v, fins)}
                      onDeplacer={(idx, dir) => deplacerValeurAxe(a.id, idx, dir)}
                      onRenommer={(ancienne, nouvelle) => renommerValeurAxe(a.id, ancienne, nouvelle)}
                    />
                  </div>
                ))}
              </div>
            )}

            <AjoutAxe onAjouter={ajouterAxe} input={input} />
          </div>

          {/* ── Bloc 2 : générer/gérer les combinaisons (prix — voir l'onglet Prix) ── */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <label style={{ ...label, marginBottom: 4 }}>Combinaisons</label>
                <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>
                  Une ligne = une combinaison valide, avec sa <strong>référence fournisseur exacte</strong> (le code à commander) — les prix se règlent dans l'onglet « Prix ». Supprime les combinaisons générées qui n'existent pas réellement pour ce produit.
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
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 140px 70px`, gap: 8, marginBottom: 8, padding: "0 4px" }}>
                  {axes.map((a) => <span key={a.id} style={label}>{a.nom || "(sans nom)"}</span>)}
                  <span style={label}>Réf. fournisseur</span>
                  <span></span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lignes.map((l) => (
                    <div key={l.id} style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 140px 70px`, gap: 8, alignItems: "center", padding: "6px 4px", borderRadius: 10, background: "#faf8f4" }}>
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
                      <input
                        value={l.referenceFournisseur || ""}
                        onChange={(e) => majReference(l.id, e.target.value)}
                        placeholder="ex : EG135C"
                        style={{ ...inputSm, fontFamily: "monospace", fontWeight: 700 }}
                      />
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button onClick={() => dupliquerLigne(l.id)} title="Dupliquer" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 12 }}>⧉</button>
                        <button onClick={() => supprimerLigne(l.id)} title="Supprimer" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 13 }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>

                {lignes.some((l) => !l.referenceFournisseur?.trim()) && (
                  <p style={{ fontSize: 12.5, color: "#b45528", background: "#fef4ee", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
                    ⚠ Au moins une ligne n'a pas de référence fournisseur — impossible de savoir quoi commander pour cette combinaison.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ValeursAxe({ axe, onAjouter, onSupprimer, onSetFinitions, onDeplacer, onRenommer }) {
  const [val, setVal] = useState("");
  const [modalValeur, setModalValeur] = useState(null);
  const [editVal, setEditVal] = useState(null);
  const [editText, setEditText] = useState("");
  const valeurs = axe.valeurs || [];
  const fpv = axe.finitionsParValeur || {};
  const fleche = { width: 18, height: 20, borderRadius: 5, border: "1px solid #f0c4a0", background: "#fff", color: "#d9551a", cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 };
  const validerEdit = () => { onRenommer(editVal, editText); setEditVal(null); };

  return (
    <div>
      {valeurs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {valeurs.map((v, idx) => {
            const nbFin = (fpv[v] || []).length;
            return (
              <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 8px 5px 8px", borderRadius: 999, background: "#fce6d6", color: "#d9551a", fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ display: "inline-flex", gap: 2 }}>
                  <button onClick={() => onDeplacer(idx, -1)} disabled={idx === 0} title="Déplacer à gauche" style={{ ...fleche, opacity: idx === 0 ? 0.35 : 1, cursor: idx === 0 ? "default" : "pointer" }}>◀</button>
                  <button onClick={() => onDeplacer(idx, 1)} disabled={idx === valeurs.length - 1} title="Déplacer à droite" style={{ ...fleche, opacity: idx === valeurs.length - 1 ? 0.35 : 1, cursor: idx === valeurs.length - 1 ? "default" : "pointer" }}>▶</button>
                </span>
                {editVal === v ? (
                  <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") validerEdit(); if (e.key === "Escape") setEditVal(null); }}
                    onBlur={validerEdit}
                    style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid #f0661b", fontSize: 12.5, fontWeight: 600, color: "#23262a", outline: "none", minWidth: 120 }} />
                ) : (
                  <>
                    {v}
                    <button onClick={() => { setEditVal(v); setEditText(v); }} title="Renommer cette valeur"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#d9551a", fontSize: 12, lineHeight: 1, padding: 0 }}>✎</button>
                  </>
                )}
                <button onClick={() => setModalValeur(v)} title="Finitions de cette valeur"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: nbFin ? "#f0661b" : "#fff", color: nbFin ? "#fff" : "#d9551a", border: "1px solid " + (nbFin ? "#f0661b" : "#f0c4a0"), borderRadius: 999, padding: "2px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  🎨 {nbFin || "Finitions"}
                </button>
                <button onClick={() => onSupprimer(v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d9551a", fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            );
          })}
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

      {modalValeur !== null && (
        <ModaleFinitionsValeur
          valeur={modalValeur}
          finitionsInit={fpv[modalValeur] || []}
          onClose={() => setModalValeur(null)}
          onSave={(fins) => { onSetFinitions(modalValeur, fins); setModalValeur(null); }}
        />
      )}
    </div>
  );
}

// Sélecteur de finitions pour UNE valeur d'axe : bibliothèque + ajout manuel.
function ModaleFinitionsValeur({ valeur, finitionsInit, onClose, onSave }) {
  const [choisies, setChoisies] = useState(finitionsInit.map((f) => ({ id: f.id || uid(), ...f })));
  const [modeles, setModeles] = useState(null);
  const [manNom, setManNom] = useState("");
  const [manHex, setManHex] = useState("");

  useEffect(() => { getFinitionsModeles().then(setModeles); }, []);

  const ajouterDepuisModele = (m) => {
    if (choisies.some((f) => f.nom.toLowerCase() === m.nom.toLowerCase())) return;
    setChoisies((c) => [...c, { id: uid(), nom: m.nom, couleur: m.couleur || null, imageUrl: m.imageUrl || null }]);
  };
  const ajouterManuel = () => {
    if (!manNom.trim()) return;
    setChoisies((c) => [...c, { id: uid(), nom: manNom.trim(), couleur: manHex.trim() || null, imageUrl: null }]);
    setManNom(""); setManHex("");
  };
  const retirer = (id) => setChoisies((c) => c.filter((f) => f.id !== id));
  const deplacer = (i, dir) => setChoisies((c) => { const n = [...c]; const j = i + dir; if (j < 0 || j >= n.length) return c; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const parPalette = {};
  (modeles || []).forEach((m) => { const k = m.palette?.nom || "Sans palette"; (parPalette[k] ||= []).push(m); });

  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const puce = (f, onClick, actif) => (
    <button key={f.id || f.nom} onClick={onClick} type="button"
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, cursor: "pointer", textAlign: "left", border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"), background: actif ? "#fef4ee" : "#fff" }}>
      <span style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, border: "1px solid #e0dacf", overflow: "hidden", background: f.couleur || "#f0ece4" }}>
        {f.imageUrl ? <img src={f.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a" }}>{f.nom}</span>
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", background: "#fff", border: "1px solid #ece8e0", borderRadius: 20, padding: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#23262a", margin: "0 0 4px" }}>Finitions — « {valeur} »</h2>
        <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>Ces finitions n'apparaîtront pour le client que s'il choisit cette valeur.</p>

        {/* Déjà rattachées */}
        <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5c616a" }}>Rattachées ({choisies.length})</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 18px" }}>
          {choisies.length === 0 && <span style={{ fontSize: 13, color: "#c4c0b8", fontStyle: "italic" }}>Aucune pour l'instant.</span>}
          {choisies.map((f, i) => (
            <span key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 9, border: "1px solid #ece8e0", background: "#faf8f4" }}>
              <button onClick={() => deplacer(i, -1)} disabled={i === 0} title="Gauche" style={{ border: "none", background: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 11, padding: 0, color: "#5c616a" }}>◀</button>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: "1px solid #e0dacf", overflow: "hidden", background: f.couleur || "#f0ece4" }}>
                {f.imageUrl ? <img src={f.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.nom}</span>
              <button onClick={() => deplacer(i, 1)} disabled={i === choisies.length - 1} title="Droite" style={{ border: "none", background: "none", cursor: i === choisies.length - 1 ? "default" : "pointer", opacity: i === choisies.length - 1 ? 0.3 : 1, fontSize: 11, padding: 0, color: "#5c616a" }}>▶</button>
              <button onClick={() => retirer(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c4735a", fontSize: 13 }}>×</button>
            </span>
          ))}
        </div>

        {/* Bibliothèque */}
        <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5c616a" }}>Depuis la bibliothèque</label>
        <div style={{ margin: "8px 0 18px" }}>
          {modeles === null && <span style={{ fontSize: 13, color: "#9aa0a8" }}>Chargement…</span>}
          {modeles && modeles.length === 0 && <span style={{ fontSize: 13, color: "#9aa0a8" }}>Bibliothèque vide (Architecture → Finitions).</span>}
          {Object.entries(parPalette).map(([nom, liste]) => (
            <div key={nom} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#23262a", margin: "0 0 6px" }}>{nom}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
                {liste.map((m) => puce(m, () => ajouterDepuisModele(m), choisies.some((f) => f.nom.toLowerCase() === m.nom.toLowerCase())))}
              </div>
            </div>
          ))}
        </div>

        {/* Ajout manuel */}
        <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5c616a" }}>Ajouter sur mesure</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 20px" }}>
          <input style={{ ...input, flex: 1 }} value={manNom} onChange={(e) => setManNom(e.target.value)} placeholder="Nom (ex : Aluminium)" />
          <input style={{ ...input, width: 120 }} value={manHex} onChange={(e) => setManHex(e.target.value)} placeholder="#hex" />
          <span style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e0dacf", background: manHex || "#f0ece4", flexShrink: 0 }} />
          <button onClick={ajouterManuel} style={{ padding: "9px 14px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ </button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Annuler</button>
          <button onClick={() => onSave(choisies)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Enregistrer</button>
        </div>
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