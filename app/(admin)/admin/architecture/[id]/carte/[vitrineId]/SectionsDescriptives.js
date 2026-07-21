"use client";
import { useState } from "react";
import TiptapEditor from "@/components/dashboard/TiptapEditor";

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function SectionsDescriptives({ sections, onChangeSections }) {
  const [ouvertes, setOuvertes] = useState(new Set());

  const toggleOuverte = (id) => {
    setOuvertes((o) => {
      const n = new Set(o);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const ajouter = () => {
    const id = uid();
    onChangeSections([...sections, { id, titre: "", contenu: "" }]);
    setOuvertes((o) => new Set(o).add(id));
  };
  const supprimer = (id) => { onChangeSections(sections.filter((x) => x.id !== id)); };
  const majTitre = (id, titre) => { onChangeSections(sections.map((x) => (x.id === id ? { ...x, titre } : x))); };
  const majContenu = (id, contenu) => { onChangeSections(sections.map((x) => (x.id === id ? { ...x, contenu } : x))); };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeSections(next);
  };

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };
  const input = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 15, color: "#23262a", outline: "none" };

  return (
    <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <label style={{ ...label, marginBottom: 4 }}>Descriptif technique</label>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>Dimensions, options, caractéristiques propres à ce produit (comme sur la fiche Buronomic).</p>
        </div>
        <button onClick={ajouter} style={{ padding: "8px 14px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>+ Ajouter une section</button>
      </div>

      {sections.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#9aa0a8", fontSize: 14, border: "1px dashed #e8e3da", borderRadius: 12 }}>
          Aucune section. Ajoute-en (ex : « Dimensions », « Plateau », « Piètement »…).
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sections.map((s, i) => {
          const ouverte = ouvertes.has(s.id);
          return (
            <div key={s.id} style={{ border: "1px solid " + (ouverte ? "#f0661b" : "#f0ece4"), borderRadius: 12, background: ouverte ? "#fef4ee" : "#fdfcfa", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Monter"
                    style={{ width: 24, height: 20, borderRadius: 6, border: "1px solid #ece8e0", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.35 : 1, fontSize: 11, lineHeight: 1 }}>▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} title="Descendre"
                    style={{ width: 24, height: 20, borderRadius: 6, border: "1px solid #ece8e0", background: "#fff", cursor: i === sections.length - 1 ? "default" : "pointer", opacity: i === sections.length - 1 ? 0.35 : 1, fontSize: 11, lineHeight: 1 }}>▼</button>
                </div>

                <button onClick={() => toggleOuverte(s.id)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: ouverte ? "#f0661b" : "#d8d3c9" }} />
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: s.titre ? "#23262a" : "#b0aaa0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.titre || "(sans titre)"}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ouverte ? "#f0661b" : "#9aa0a8"} strokeWidth="2.4"
                    style={{ marginLeft: "auto", flexShrink: 0, transform: ouverte ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                <button onClick={() => supprimer(s.id)} title="Supprimer la section"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 14, flexShrink: 0 }}>🗑</button>
              </div>

              {ouverte && (
                <div style={{ padding: "0 14px 16px" }}>
                  <input value={s.titre} onChange={(e) => majTitre(s.id, e.target.value)} placeholder="Titre de la section"
                    style={{ ...input, fontWeight: 600, marginBottom: 10 }} />
                  <TiptapEditor value={s.contenu} onChange={(html) => majContenu(s.id, html)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}