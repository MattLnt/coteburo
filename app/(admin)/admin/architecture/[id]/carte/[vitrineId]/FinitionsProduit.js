"use client";
import { useState, useEffect, useTransition } from "react";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import {
  getFinitionsProduit,
  creerGroupeFinitionProduit,
  creerFinitionProduit,
  renommerFinitionProduit,
  majFinitionImageProduit,
  renommerGroupeFinitionProduit,
  supprimerGroupeFinitionProduit,
  supprimerFinitionProduit,
} from "./actions";
import { getFinitionsModeles, importerFinitionsVersProduit, importerFinitionsDansGroupe, reordonnerFinitionsProduit } from "../../../actionsFinitions";

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

export default function FinitionsProduit({ vitrineId }) {
  const [groupes, setGroupes] = useState(null);
  const [editFin, setEditFin] = useState(null);
  const [editFinNom, setEditFinNom] = useState("");
  const [editGrp, setEditGrp] = useState(null);
  const [editGrpNom, setEditGrpNom] = useState("");
  const [uploadFin, setUploadFin] = useState(null);
  const [colorModalId, setColorModalId] = useState(null);
  const [hexDraft, setHexDraft] = useState("");
  const [nouveauGroupe, setNouveauGroupe] = useState("");
  const [nouvelleFinition, setNouvelleFinition] = useState({});
  const [biblioOpen, setBiblioOpen] = useState(false);
  const [biblioGroupe, setBiblioGroupe] = useState(null); // groupeId pour import dans un groupe existant
  const [, startTransition] = useTransition();

  const charger = () => getFinitionsProduit(vitrineId).then(setGroupes);
  useEffect(() => { charger(); }, [vitrineId]);

  if (groupes === null) return <div style={{ padding: 30, textAlign: "center", color: "#9aa0a8" }}>Chargement…</div>;

  const toutesFinitions = groupes.flatMap((g) => g.finitions);
  const finitionModal = colorModalId ? toutesFinitions.find((f) => f.id === colorModalId) : null;

  const ajouterGroupe = async () => {
    const nom = nouveauGroupe.trim();
    if (!nom) return;
    setNouveauGroupe("");
    const res = await creerGroupeFinitionProduit(vitrineId, nom);
    if (res.ok) charger();
  };

  const ajouterFinition = async (groupeId) => {
    const nom = (nouvelleFinition[groupeId] || "").trim();
    if (!nom) return;
    setNouvelleFinition((s) => ({ ...s, [groupeId]: "" }));
    const res = await creerFinitionProduit(groupeId, nom);
    if (res.ok) charger();
  };

  const supprimerGroupe = async (id) => {
    setGroupes((gs) => gs.filter((g) => g.id !== id));
    startTransition(async () => { await supprimerGroupeFinitionProduit(id); });
  };

  const supprimerFin = async (id, groupeId) => {
    setGroupes((gs) => gs.map((g) => (g.id === groupeId ? { ...g, finitions: g.finitions.filter((f) => f.id !== id) } : g)));
    startTransition(async () => { await supprimerFinitionProduit(id); });
  };

  const validerFin = () => {
    const id = editFin, nom = editFinNom;
    setGroupes((gs) => gs.map((g) => ({ ...g, finitions: g.finitions.map((f) => (f.id === id ? { ...f, nom } : f)) })));
    setEditFin(null);
    startTransition(async () => { await renommerFinitionProduit(id, nom); });
  };
  const validerGrp = () => {
    const id = editGrp, nom = editGrpNom;
    setGroupes((gs) => gs.map((g) => (g.id === id ? { ...g, nom } : g)));
    setEditGrp(null);
    startTransition(async () => { await renommerGroupeFinitionProduit(id, nom); });
  };
  const setImage = (finId, url) => {
    setGroupes((gs) => gs.map((g) => ({ ...g, finitions: g.finitions.map((f) => (f.id === finId ? { ...f, imageUrl: url, couleur: null } : f)) })));
    startTransition(async () => { await majFinitionImageProduit(finId, { imageUrl: url, couleur: null }); });
  };
  const setCouleur = (finId, hex) => {
    setGroupes((gs) => gs.map((g) => ({ ...g, finitions: g.finitions.map((f) => (f.id === finId ? { ...f, couleur: hex, imageUrl: null } : f)) })));
    startTransition(async () => { await majFinitionImageProduit(finId, { imageUrl: null, couleur: hex }); });
  };

  // Réordonne une finition dans son groupe (◀ ▶) + persiste le nouvel ordre.
  const deplacerFinition = (groupeId, index, dir) => {
    const groupe = groupes.find((g) => g.id === groupeId);
    if (!groupe) return;
    const fs = [...groupe.finitions];
    const j = index + dir;
    if (j < 0 || j >= fs.length) return;
    [fs[index], fs[j]] = [fs[j], fs[index]];
    setGroupes((gs) => gs.map((g) => (g.id === groupeId ? { ...g, finitions: fs } : g)));
    startTransition(async () => { await reordonnerFinitionsProduit(fs.map((f) => f.id)); });
  };

  const ouvrirModalCouleur = (fin) => {
    setColorModalId(fin.id);
    setHexDraft(fin.couleur || "");
  };
  const validerHex = () => {
    const val = hexDraft.trim();
    if (HEX_VALIDE.test(val)) setCouleur(colorModalId, val.toUpperCase());
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24, marginBottom: 16 };
  const label = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a" };
  const input = { flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none" };

  return (
    <div>
      <p style={{ fontSize: 13.5, color: "#5c616a", margin: "0 0 16px" }}>
        Un bloc visuel affiché sur la fiche produit (entre le descriptif et le bouton), purement informatif — sans lien avec le prix. Chaque option est un axe (ex. « Piètement »), chaque finition une pastille image ou couleur.
      </p>

      {/* Import depuis la bibliothèque */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, color: "#5c616a" }}>
          🎨 Réutilise des finitions déjà définies (couleurs + swatches) sans les ressaisir.
        </span>
        <button onClick={() => setBiblioOpen(true)}
          style={{ padding: "10px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
          📚 Importer depuis la bibliothèque
        </button>
      </div>

      {groupes.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: "#9aa0a8" }}>Aucune option pour ce produit pour l'instant.</div>
      )}

      {groupes.map((g) => (
        <div key={g.id} style={card}>
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
                <button onClick={() => { setEditGrp(g.id); setEditGrpNom(g.nom); }} title="Renommer l'option"
                  style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid #ece8e0", background: "#faf8f4", cursor: "pointer", fontSize: 11, color: "#5c616a" }}>✎</button>
                <span style={{ fontSize: 12.5, color: "#9aa0a8" }}>{g.finitions.length} finition{g.finitions.length > 1 ? "s" : ""}</span>
                <button onClick={() => setBiblioGroupe(g.id)} title="Ajouter depuis la bibliothèque"
                  style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, border: "1px solid #f0c4a0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#f0661b", fontWeight: 600 }}>📚 Bibliothèque</button>
                <button onClick={() => supprimerGroupe(g.id)} title="Supprimer l'option"
                  style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#c4735a" }}>🗑 Supprimer l'option</button>
              </>
            )}
          </div>

          {g.finitions.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 16 }}>
              {g.finitions.map((f, fi) => (
                <div key={f.id} style={{ border: "1px solid #ece8e0", borderRadius: 12, padding: 12, background: "#faf8f4" }}>
                  <div style={{ aspectRatio: "1 / 1", borderRadius: 9, overflow: "hidden", background: f.couleur || "#fff", border: "1px solid #ece8e0", marginBottom: 10, display: "grid", placeItems: "center", position: "relative" }}>
                    {f.imageUrl ? (
                      <img src={f.imageUrl} alt={f.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : !f.couleur ? (
                      <span style={{ fontSize: 11, color: "#c4c0b8" }}>pas d'échantillon</span>
                    ) : null}
                    <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, display: "flex", justifyContent: "space-between" }}>
                      <button onClick={() => deplacerFinition(g.id, fi, -1)} disabled={fi === 0} title="Déplacer à gauche"
                        style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #ece8e0", background: "rgba(255,255,255,0.92)", cursor: fi === 0 ? "default" : "pointer", opacity: fi === 0 ? 0.35 : 1, fontSize: 11, lineHeight: 1 }}>◀</button>
                      <button onClick={() => deplacerFinition(g.id, fi, 1)} disabled={fi === g.finitions.length - 1} title="Déplacer à droite"
                        style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid #ece8e0", background: "rgba(255,255,255,0.92)", cursor: fi === g.finitions.length - 1 ? "default" : "pointer", opacity: fi === g.finitions.length - 1 ? 0.35 : 1, fontSize: 11, lineHeight: 1 }}>▶</button>
                    </div>
                  </div>

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
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        <button onClick={() => { setEditFin(f.id); setEditFinNom(f.nom); }} title="Renommer"
                          style={{ padding: "1px 6px", borderRadius: 5, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 10, color: "#5c616a" }}>✎</button>
                        <button onClick={() => supprimerFin(f.id, g.id)} title="Supprimer"
                          style={{ padding: "1px 6px", borderRadius: 5, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 10, color: "#c4735a" }}>🗑</button>
                      </div>
                    </div>
                  )}

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

                  {uploadFin === f.id && (
                    <div style={{ marginTop: 10 }}>
                      <ImageUploader images={f.imageUrl ? [f.imageUrl] : []} onChange={(imgs) => { setImage(f.id, imgs[imgs.length - 1] || null); }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nouvelleFinition[g.id] || ""}
              onChange={(e) => setNouvelleFinition((s) => ({ ...s, [g.id]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterFinition(g.id); } }}
              placeholder="Nom de la finition (ex : Aluminium)" style={{ ...input, fontSize: 13.5, padding: "9px 12px" }} />
            <button onClick={() => ajouterFinition(g.id)}
              style={{ padding: "9px 16px", borderRadius: 9, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
              + Ajouter
            </button>
          </div>
        </div>
      ))}

      <div style={{ ...card, marginBottom: 0 }}>
        <label style={{ ...label, display: "block", marginBottom: 10 }}>Nouvelle option</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={nouveauGroupe} onChange={(e) => setNouveauGroupe(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterGroupe(); } }}
            placeholder="Nom de l'option (ex : Piètement)" style={input} />
          <button onClick={ajouterGroupe}
            style={{ padding: "10px 20px", borderRadius: 10, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
            + Ajouter l'option
          </button>
        </div>
      </div>

      {biblioOpen && (
        <ModaleBibliotheque
          onClose={() => setBiblioOpen(false)}
          onImported={() => { setBiblioOpen(false); charger(); }}
          vitrineId={vitrineId}
        />
      )}

      {biblioGroupe && (
        <ModaleBibliotheque
          groupeId={biblioGroupe}
          onClose={() => setBiblioGroupe(null)}
          onImported={() => { setBiblioGroupe(null); charger(); }}
          vitrineId={vitrineId}
        />
      )}

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

// ─────────── Sélecteur de finitions depuis la bibliothèque partagée ───────────
function ModaleBibliotheque({ onClose, onImported, vitrineId, groupeId = null }) {
  const [modeles, setModeles] = useState(null);
  const [selection, setSelection] = useState([]); // ids
  const [groupeNom, setGroupeNom] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState("");

  useEffect(() => { getFinitionsModeles().then(setModeles); }, []);

  const toggle = (id) => setSelection((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  // regroupe par palette
  const parPalette = {};
  (modeles || []).forEach((m) => {
    const key = m.palette?.nom || "Sans palette";
    (parPalette[key] ||= []).push(m);
  });

  const toutCocher = (liste) => setSelection((s) => Array.from(new Set([...s, ...liste.map((m) => m.id)])));

  const importer = () => {
    setErreur("");
    startTransition(async () => {
      const res = groupeId
        ? await importerFinitionsDansGroupe(groupeId, selection)
        : await importerFinitionsVersProduit(vitrineId, { groupeNom: groupeNom || "Finitions", finitionModeleIds: selection });
      if (!res.ok) { setErreur(res.error || "Erreur."); return; }
      onImported();
    });
  };

  const input = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", background: "#fff", border: "1px solid #ece8e0", borderRadius: 20, padding: 26 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 6px" }}>{groupeId ? "Ajouter depuis la bibliothèque" : "Importer depuis la bibliothèque"}</h2>
        <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 18px" }}>{groupeId ? "Coche les finitions à ajouter à ce groupe (copiées avec leur swatch)." : "Coche les finitions à ajouter à ce produit. Elles sont copiées avec leur swatch (aucun réupload)."}</p>

        {!groupeId && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 8 }}>Nom de l'option créée</label>
            <input style={input} value={groupeNom} onChange={(e) => setGroupeNom(e.target.value)} placeholder="Ex. Rideau, Corps, Plateau…" />
          </div>
        )}

        {modeles === null && <div style={{ padding: 20, textAlign: "center", color: "#9aa0a8" }}>Chargement…</div>}
        {modeles && modeles.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#9aa0a8", fontSize: 13.5 }}>
            La bibliothèque est vide. Crée d'abord des finitions dans Architecture → onglet Finitions.
          </div>
        )}

        {Object.entries(parPalette).map(([nomPalette, liste]) => (
          <div key={nomPalette} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#23262a" }}>{nomPalette}</span>
              <button onClick={() => toutCocher(liste)} style={{ fontSize: 11.5, color: "#f0661b", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Tout cocher</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {liste.map((m) => {
                const actif = selection.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggle(m.id)} type="button"
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"), background: actif ? "#fef4ee" : "#fff" }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, border: "1px solid #e0dacf", overflow: "hidden", background: m.couleur || "#f0ece4" }}>
                      {m.imageUrl ? <img src={m.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nom}</span>
                    {actif && <span style={{ marginLeft: "auto", color: "#f0661b", fontSize: 13 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {erreur && <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "10px 14px", borderRadius: 10, marginTop: 10 }}>{erreur}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18, position: "sticky", bottom: 0, background: "#fff", paddingTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Annuler</button>
          <button onClick={importer} disabled={isPending || selection.length === 0}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: isPending || selection.length === 0 ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {isPending ? "Import…" : `Importer${selection.length ? ` (${selection.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}