"use client";
import { useState, useEffect, useTransition } from "react";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import {
  getFinitionsGamme,
  renommerFinition,
  majFinitionImage,
  renommerGroupeFinition,
} from "./actions";

const HEX_VALIDE = /^#([0-9A-Fa-f]{6})$/;

const PALETTE = [
  { nom: "Noir", hex: "#1A1A1A" },
  { nom: "Blanc", hex: "#FFFFFF" },
  { nom: "Anthracite", hex: "#3C3C3C" },
  { nom: "Gris clair", hex: "#B8B8B8" },
  { nom: "Aluminium", hex: "#C8C8C8" },
  { nom: "Chêne clair", hex: "#D2B48C" },
  { nom: "Chêne foncé", hex: "#8B5A2B" },
  { nom: "Hêtre", hex: "#E8C39E" },
  { nom: "Wengé", hex: "#3E2723" },
  { nom: "Beige", hex: "#E5DDD0" },
  { nom: "Terracotta", hex: "#C1440E" },
  { nom: "Vert kaki", hex: "#6B7A4F" },
  { nom: "Bleu marine", hex: "#1F3A5F" },
  { nom: "Bordeaux", hex: "#6D1F2B" },
];

export default function OngletFinitions({ gammeId }) {
  const [groupes, setGroupes] = useState(null);
  const [editFin, setEditFin] = useState(null);
  const [editFinNom, setEditFinNom] = useState("");
  const [editGrp, setEditGrp] = useState(null);
  const [editGrpNom, setEditGrpNom] = useState("");
  const [uploadFin, setUploadFin] = useState(null);
  const [colorModalId, setColorModalId] = useState(null);
  const [hexDraft, setHexDraft] = useState("");
  const [, startTransition] = useTransition();

  const charger = () => getFinitionsGamme(gammeId).then(setGroupes);
  useEffect(() => { charger(); }, [gammeId]);

  if (groupes === null) return <div style={{ padding: 40, textAlign: "center", color: "#9aa0a8" }}>Chargement…</div>;

  const toutesFinitions = groupes.flatMap((g) => g.finitions);
  const finitionModal = colorModalId ? toutesFinitions.find((f) => f.id === colorModalId) : null;

  const validerFin = () => {
    const id = editFin, nom = editFinNom;
    setGroupes((gs) => gs.map((g) => ({ ...g, finitions: g.finitions.map((f) => (f.id === id ? { ...f, nom } : f)) })));
    setEditFin(null);
    startTransition(async () => { await renommerFinition(id, nom); });
  };
  const validerGrp = () => {
    const id = editGrp, nom = editGrpNom;
    setGroupes((gs) => gs.map((g) => (g.id === id ? { ...g, nom } : g)));
    setEditGrp(null);
    startTransition(async () => { await renommerGroupeFinition(id, nom); });
  };
  const setImage = (finId, url) => {
    setGroupes((gs) => gs.map((g) => ({ ...g, finitions: g.finitions.map((f) => (f.id === finId ? { ...f, imageUrl: url, couleur: null } : f)) })));
    startTransition(async () => { await majFinitionImage(finId, { imageUrl: url, couleur: null }); });
  };
  const setCouleur = (finId, hex) => {
    setGroupes((gs) => gs.map((g) => ({ ...g, finitions: g.finitions.map((f) => (f.id === finId ? { ...f, couleur: hex, imageUrl: null } : f)) })));
    startTransition(async () => { await majFinitionImage(finId, { imageUrl: null, couleur: hex }); });
  };

  const ouvrirModalCouleur = (fin) => {
    setColorModalId(fin.id);
    setHexDraft(fin.couleur || "");
  };
  const validerHex = () => {
    const val = hexDraft.trim();
    if (HEX_VALIDE.test(val)) setCouleur(colorModalId, val.toUpperCase());
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24, marginBottom: 20 };
  const label = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a" };

  return (
    <div>
      <p style={{ fontSize: 13.5, color: "#5c616a", margin: "0 0 16px" }}>
        Chaque groupe est un axe de finition. Pour chaque finition, ajoute soit une image d'échantillon, soit une couleur unie — réutilisée sur toutes les cartes de la gamme.
      </p>

      {groupes.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: "#9aa0a8" }}>Aucune finition pour cette gamme.</div>
      )}

      {groupes.map((g) => (
        <div key={g.id} style={card}>
          {/* En-tête groupe */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            {editGrp === g.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input autoFocus value={editGrpNom} onChange={(e) => setEditGrpNom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") validerGrp(); if (e.key === "Escape") setEditGrp(null); }}
                  style={{ padding: "7px 12px", borderRadius: 9, border: "1px solid #f0661b", fontSize: 14, outline: "none" }} />
                <button onClick={validerGrp} style={{ padding: "7px 12px", borderRadius: 8, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>OK</button>
              </div>
            ) : (
              <>
                <h3 style={{ ...label, fontSize: 15, margin: 0, color: "#23262a", textTransform: "none" }}>{g.nom}</h3>
                <button onClick={() => { setEditGrp(g.id); setEditGrpNom(g.nom); }} title="Renommer le groupe"
                  style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid #ece8e0", background: "#faf8f4", cursor: "pointer", fontSize: 11, color: "#5c616a" }}>✎</button>
                <span style={{ fontSize: 12.5, color: "#9aa0a8" }}>{g.finitions.length} finitions</span>
              </>
            )}
          </div>

          {/* Grille des finitions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
            {g.finitions.map((f) => (
              <div key={f.id} style={{ border: "1px solid #ece8e0", borderRadius: 12, padding: 12, background: "#faf8f4" }}>
                {/* échantillon */}
                <div style={{ aspectRatio: "1 / 1", borderRadius: 9, overflow: "hidden", background: f.couleur || "#fff", border: "1px solid #ece8e0", marginBottom: 10, display: "grid", placeItems: "center" }}>
                  {f.imageUrl ? (
                    <img src={f.imageUrl} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : !f.couleur ? (
                    <span style={{ fontSize: 11, color: "#c4c0b8" }}>pas d'échantillon</span>
                  ) : null}
                </div>

                {/* nom */}
                {editFin === f.id ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input autoFocus value={editFinNom} onChange={(e) => setEditFinNom(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") validerFin(); if (e.key === "Escape") setEditFin(null); }}
                      style={{ flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: 7, border: "1px solid #f0661b", fontSize: 12.5, outline: "none" }} />
                    <button onClick={validerFin} style={{ padding: "5px 8px", borderRadius: 7, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>OK</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.nom}>{f.nom}</span>
                    <button onClick={() => { setEditFin(f.id); setEditFinNom(f.nom); }} title="Renommer"
                      style={{ padding: "1px 6px", borderRadius: 5, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 10, color: "#5c616a", flexShrink: 0 }}>✎</button>
                  </div>
                )}

                {/* boutons de mode */}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => setUploadFin(uploadFin === f.id ? null : f.id)}
                    style={{ flex: 1, padding: "6px", borderRadius: 8, border: "1px solid " + (uploadFin === f.id ? "#f0661b" : "#ece8e0"), background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#f0661b" }}>
                    🖼 Image
                  </button>
                  <button onClick={() => ouvrirModalCouleur(f)}
                    style={{ flex: 1, padding: "6px", borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: "#f0661b" }}>
                    🎨 Couleur
                  </button>
                </div>

                {/* panneau Image (inline, ne pose pas de problème de chevauchement) */}
                {uploadFin === f.id && (
                  <div style={{ marginTop: 10 }}>
                    <ImageUploader images={f.imageUrl ? [f.imageUrl] : []} onChange={(imgs) => { setImage(f.id, imgs[imgs.length - 1] || null); }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ─── Modale couleur (centrée, hors grille) ─── */}
      {finitionModal && (
        <div onClick={() => setColorModalId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,22,0.5)", zIndex: 200, display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 26, width: "100%", maxWidth: 380, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #ece8e0", background: HEX_VALIDE.test(hexDraft) ? hexDraft : (finitionModal.couleur || "#fff"), flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#9aa0a8", margin: 0 }}>Couleur</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#23262a", margin: 0 }}>{finitionModal.nom}</p>
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#9aa0a8", margin: "0 0 10px" }}>Teintes courantes</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 20 }}>
              {PALETTE.map((p) => {
                const actif = hexDraft.toUpperCase() === p.hex;
                return (
                  <button key={p.hex} type="button" title={p.nom}
                    onClick={() => { setHexDraft(p.hex); setCouleur(colorModalId, p.hex); }}
                    style={{
                      width: 34, height: 34, borderRadius: "50%", background: p.hex, cursor: "pointer",
                      border: actif ? "2px solid #f0661b" : "2px solid #ece8e0",
                      boxShadow: actif ? "0 0 0 3px rgba(240,102,27,0.15)" : "none",
                      padding: 0,
                    }} />
                );
              })}
            </div>

            <div style={{ height: 1, background: "#f0ece4", margin: "0 0 20px" }} />

            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#9aa0a8", margin: "0 0 8px" }}>Hex précis</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") validerHex(); }}
                placeholder="#RRGGBB"
                style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 9, border: "1px solid " + (hexDraft && !HEX_VALIDE.test(hexDraft) ? "#c4735a" : "#ece8e0"), fontSize: 14, fontFamily: "monospace", outline: "none" }}
              />
              <button onClick={validerHex}
                style={{ padding: "10px 18px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                Valider
              </button>
            </div>
            {hexDraft && !HEX_VALIDE.test(hexDraft) && (
              <span style={{ display: "block", fontSize: 11.5, color: "#c4735a", marginBottom: 8 }}>Format attendu : #RRGGBB</span>
            )}

            <button onClick={() => setColorModalId(null)}
              style={{ width: "100%", marginTop: 14, padding: "11px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#5c616a" }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}