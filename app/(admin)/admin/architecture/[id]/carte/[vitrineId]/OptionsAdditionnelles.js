"use client";
import { useState, useEffect, useMemo } from "react";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import DeclinaisonsBoutique from "./DeclinaisonsBoutique";
import { getFinitionsModeles } from "../../../actionsFinitions";

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function OptionsAdditionnelles({ options = [], onChange }) {
  // Bibliothèque de palettes (pour les finitions globales de l'option)
  const [modeles, setModeles] = useState(null);
  useEffect(() => { getFinitionsModeles().then(setModeles); }, []);
  const [picker, setPicker] = useState(null); // { optId }

  const palettes = useMemo(() => {
    const map = new Map();
    (modeles || []).forEach((m) => {
      const key = m.palette?.id ? `id:${m.palette.id}` : `nom:${m.palette?.nom || "Sans palette"}`;
      if (!map.has(key)) map.set(key, { key, id: m.palette?.id || null, nom: m.palette?.nom || "Sans palette", marque: m.palette?.marque || null, items: [] });
      map.get(key).items.push({ id: m.id, nom: m.nom, imageUrl: m.imageUrl || null, couleur: m.couleur || null });
    });
    return [...map.values()];
  }, [modeles]);

  const ajouter = () =>
    onChange([...options, {
      id: uid(), nom: "", description: "", images: [],
      sansDeclinaisons: true, referenceUnitaire: "",
      prixTarifHT: "", prixVenteHT: "",
      axes: [], declinaisons: [], finitionsGlobales: [],
    }]);
  const maj = (id, patch) => onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const supprimer = (id) => onChange(options.filter((o) => o.id !== id));
  const deplacer = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const majDecl = (opt, declId, patch) =>
    maj(opt.id, { declinaisons: (opt.declinaisons || []).map((d) => (d.id === declId ? { ...d, ...patch } : d)) });

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };
  const label = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5c616a", marginBottom: 6 };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
  const petitInput = { ...input, padding: "8px 10px", fontSize: 13 };

  const libelleDecl = (opt, d) =>
    (opt.axes || []).filter((a) => a.nom?.trim()).map((a) => `${a.nom} : ${d.valeurs?.[a.id] || "—"}`).join("  ·  ");

  return (
    <div style={card}>
      <label style={{ ...label, marginBottom: 4 }}>Options / Accessoires</label>
      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 18px" }}>
        Chaque option utilise le même système que les produits : prix unique ou déclinaisons (axes + finitions par valeur), avec prix fournisseur et prix vente.
      </p>

      {options.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12, marginBottom: 14 }}>
          Aucune option pour l'instant. Ajoute un accessoire ci-dessous (ex : retour, bloc à encastrer, top de finition…).
        </div>
      )}

      {options.map((o, i) => {
        const sansImage = !o.images || o.images.length === 0;
        const sansDecl = o.sansDeclinaisons ?? true;
        const lignes = o.declinaisons || [];
        return (
          <div key={o.id} style={{ border: "1px solid #f0ece4", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9aa0a8" }}>Option {i + 1}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} title="Monter"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1, fontSize: 13 }}>↑</button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === options.length - 1} title="Descendre"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: i === options.length - 1 ? "default" : "pointer", opacity: i === options.length - 1 ? 0.4 : 1, fontSize: 13 }}>↓</button>
                <button type="button" onClick={() => supprimer(o.id)} title="Supprimer cette option"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", color: "#c4735a", cursor: "pointer", fontSize: 14 }}>🗑</button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nom</label>
              <input value={o.nom} onChange={(e) => maj(o.id, { nom: e.target.value })} placeholder="ex : Retour de bureau" style={input} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Description</label>
              <textarea value={o.description || ""} onChange={(e) => maj(o.id, { description: e.target.value })} rows={2}
                placeholder="Courte description affichée sous l'option sur la fiche." style={{ ...input, resize: "vertical" }} />
            </div>

            {/* ── Système de déclinaisons réutilisé (axes + finitions par valeur) ── */}
            <DeclinaisonsBoutique
              axes={o.axes || []}
              lignes={lignes}
              onChangeAxes={(axes) => maj(o.id, { axes })}
              onChangeLignes={(ls) => maj(o.id, { declinaisons: ls })}
              sansDeclinaisons={sansDecl}
              onChangeSansDeclinaisons={(v) => maj(o.id, { sansDeclinaisons: v })}
              referenceUnitaire={o.referenceUnitaire || ""}
              onChangeReferenceUnitaire={(v) => maj(o.id, { referenceUnitaire: v })}
            />

            {/* ── Prix de l'option (fournisseur + vente) ── */}
            <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 20, marginTop: 16 }}>
              <label style={{ ...label, marginBottom: 10 }}>Prix de l'option</label>

              {sansDecl ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 380 }}>
                  <div>
                    <label style={label}>Prix fournisseur € HT</label>
                    <input value={o.prixTarifHT ?? ""} onChange={(e) => maj(o.id, { prixTarifHT: e.target.value })} placeholder="135" inputMode="decimal" style={input} />
                  </div>
                  <div>
                    <label style={label}>Prix vente € HT</label>
                    <input value={o.prixVenteHT ?? o.prixHT ?? ""} onChange={(e) => maj(o.id, { prixVenteHT: e.target.value })} placeholder="155" inputMode="decimal" style={input} />
                  </div>
                </div>
              ) : lignes.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>Génère d'abord les combinaisons ci-dessus pour saisir leurs prix.</p>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 0.9fr", gap: 8, padding: "0 2px 6px", fontSize: 11, color: "#9aa0a8", textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <span>Combinaison</span><span>Prix fourn. HT</span><span>Prix vente HT</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lignes.map((d) => (
                      <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 0.9fr", gap: 8, alignItems: "center", background: "#faf8f4", border: "1px solid #f0ece4", borderRadius: 10, padding: "8px 10px" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a" }}>{libelleDecl(o, d)}</span>
                        <input value={d.prixTarifHT ?? ""} onChange={(e) => majDecl(o, d.id, { prixTarifHT: e.target.value })} placeholder="Fourn." inputMode="decimal" style={petitInput} />
                        <input value={d.prixVenteHT ?? ""} onChange={(e) => majDecl(o, d.id, { prixVenteHT: e.target.value })} placeholder="Vente" inputMode="decimal" style={petitInput} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Finitions globales (coloris valable pour toute l'option) ── */}
            <div style={{ background: "#faf8f4", border: "1px solid #f0ece4", borderRadius: 12, padding: 14, marginTop: 16 }}>
              <label style={{ ...label, marginBottom: 6 }}>Finitions globales (coloris de l'option)</label>
              <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 8px" }}>
                Coloris proposés quelle que soit la déclinaison. Pour des coloris liés à une valeur précise, utilise le 🎨 sous la valeur d'axe ci-dessus.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {(o.finitionsGlobales || []).map((p) => (
                  <span key={p.paletteId || p.paletteNom} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, background: "#fef4ee", border: "1px solid #f7d9c6", color: "#b45528", borderRadius: 999, padding: "3px 10px" }}>
                    {p.paletteNom} <span style={{ opacity: 0.6 }}>({p.finitions?.length || 0})</span>
                  </span>
                ))}
                <button type="button" onClick={() => setPicker({ optId: o.id })}
                  style={{ fontSize: 12, color: "#f0661b", background: "#fff", border: "1px solid #f0c4a0", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                  🎨 {(o.finitionsGlobales || []).length ? "Modifier" : "Ajouter"} les palettes
                </button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={label}>Images (la principale sert de vignette)</label>
              <ImageUploader images={o.images || []} onChange={(imgs) => maj(o.id, { images: imgs })} />
              {sansImage && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#b45528", background: "#fef4ee", borderRadius: 9, padding: "8px 12px", display: "inline-block" }}>
                  ⚠ Une image principale est requise pour publier l'option.
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={ajouter}
        style={{ width: "100%", padding: 13, borderRadius: 12, border: "2px dashed #e0dacf", background: "#faf8f4", color: "#5c616a", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        <span style={{ color: "#f0661b", fontSize: 16 }}>+</span>&nbsp; Ajouter une option
      </button>

      {picker && (
        <PalettePicker
          palettes={palettes}
          chargement={modeles === null}
          selectionInitiale={(() => {
            const opt = options.find((x) => x.id === picker.optId);
            return (opt.finitionsGlobales || []).flatMap((p) => (p.finitions || []).map((f) => f.id));
          })()}
          onClose={() => setPicker(null)}
          onValider={(idsSel) => {
            const opt = options.find((x) => x.id === picker.optId);
            const liste = palettes
              .map((p) => {
                const finitions = p.items.filter((f) => idsSel.includes(f.id));
                return finitions.length ? { paletteId: p.id, paletteNom: p.nom, marque: p.marque, finitions } : null;
              })
              .filter(Boolean);
            maj(opt.id, { finitionsGlobales: liste });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────── Sélecteur de palettes (fiable, clé par id unique) ───────────
function PalettePicker({ palettes, chargement, selectionInitiale, onClose, onValider }) {
  const [selection, setSelection] = useState(selectionInitiale || []);
  const [recherche, setRecherche] = useState("");
  const [detail, setDetail] = useState({});

  const filtrees = useMemo(() => {
    const t = recherche.trim().toLowerCase();
    if (!t) return palettes;
    return palettes.filter((p) => p.nom.toLowerCase().includes(t) || (p.marque || "").toLowerCase().includes(t));
  }, [palettes, recherche]);

  const selSet = new Set(selection);
  const etat = (p) => {
    const n = p.items.filter((m) => selSet.has(m.id)).length;
    return n === 0 ? "aucune" : n === p.items.length ? "toutes" : "partielle";
  };
  const togglePalette = (p) => {
    const ids = p.items.map((m) => m.id);
    setSelection((s) => {
      const set = new Set(s);
      const toutes = ids.every((id) => set.has(id));
      if (toutes) ids.forEach((id) => set.delete(id));
      else ids.forEach((id) => set.add(id));
      return [...set];
    });
  };
  const toggleFin = (id) => setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const input = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 260, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto", background: "#fff", border: "1px solid #ece8e0", borderRadius: 20, padding: 26 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 6px" }}>Choisir des palettes</h2>
        <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px" }}>Coche une palette entière, ou déplie pour choisir des coloris précis.</p>

        <div style={{ marginBottom: 14 }}>
          <input style={input} value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une palette ou une marque…" />
        </div>

        {chargement && <div style={{ padding: 20, textAlign: "center", color: "#9aa0a8" }}>Chargement…</div>}
        {!chargement && palettes.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#9aa0a8", fontSize: 13.5 }}>Aucune palette en bibliothèque.</div>
        )}
        {!chargement && palettes.length > 0 && filtrees.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#9aa0a8", fontSize: 13.5 }}>Aucune palette ne correspond.</div>
        )}

        {filtrees.map((p) => {
          const e = etat(p);
          const deplie = !!detail[p.key];
          return (
            <div key={p.key} style={{ border: "1.5px solid " + (e === "aucune" ? "#ece8e0" : "#f0661b"), borderRadius: 14, marginBottom: 10, overflow: "hidden", background: e === "aucune" ? "#fff" : "#fef7f2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                <button type="button" onClick={() => togglePalette(p)}
                  style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: "pointer", border: "2px solid " + (e === "aucune" ? "#cfc9bd" : "#f0661b"), background: e === "toutes" ? "#f0661b" : e === "partielle" ? "#f7c8ab" : "#fff", color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
                  {e === "toutes" ? "✓" : e === "partielle" ? "–" : ""}
                </button>
                <button type="button" onClick={() => togglePalette(p)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#23262a" }}>{p.nom}</span>
                  {p.marque && <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, background: "#23262a", color: "#fff", borderRadius: 5, padding: "1px 7px" }}>{p.marque}</span>}
                  <span style={{ fontSize: 12, color: "#9aa0a8" }}>{p.items.length} coloris</span>
                </button>
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {p.items.slice(0, 6).map((m) => (
                    <span key={m.id} title={m.nom} style={{ width: 18, height: 18, borderRadius: 4, border: "1px solid #e0dacf", overflow: "hidden", background: m.couleur || "#f0ece4", display: "inline-block" }}>
                      {m.imageUrl ? <img src={m.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </span>
                  ))}
                  {p.items.length > 6 && <span style={{ fontSize: 11, color: "#9aa0a8", alignSelf: "center" }}>+{p.items.length - 6}</span>}
                </div>
                <button type="button" onClick={() => setDetail((d) => ({ ...d, [p.key]: !d[p.key] }))}
                  style={{ flexShrink: 0, fontSize: 11.5, color: "#5c616a", background: "none", border: "1px solid #ece8e0", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontWeight: 600 }}>
                  {deplie ? "Replier" : "Coloris"}
                </button>
              </div>
              {deplie && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 7, padding: "0 14px 14px" }}>
                  {p.items.map((m) => {
                    const actif = selSet.has(m.id);
                    return (
                      <button key={`${p.key}::${m.id}`} type="button" onClick={() => toggleFin(m.id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, cursor: "pointer", textAlign: "left", border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"), background: actif ? "#fff" : "#faf8f4" }}>
                        <span style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, border: "1px solid #e0dacf", overflow: "hidden", background: m.couleur || "#f0ece4" }}>
                          {m.imageUrl ? <img src={m.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nom}</span>
                        {actif && <span style={{ marginLeft: "auto", color: "#f0661b", fontSize: 13 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 18, position: "sticky", bottom: 0, background: "#fff", paddingTop: 12 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Annuler</button>
          <button type="button" onClick={() => onValider(selection)}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            Valider{selection.length ? ` (${selection.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}