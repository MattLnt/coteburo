"use client";
import { useState, useEffect, useMemo } from "react";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import DeclinaisonsBoutique from "./DeclinaisonsBoutique";
import { getFinitionsModeles } from "../../../actionsFinitions";

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function OptionsAdditionnelles({ options = [], onChange }) {
  const [modeles, setModeles] = useState(null);
  useEffect(() => { getFinitionsModeles().then(setModeles); }, []);
  const [picker, setPicker] = useState(null); // { optId, groupeId }
  const [ongletOpt, setOngletOpt] = useState({}); // { [optId]: "general" | "decl" | "prix" | "fin" | "img" }
  const [plie, setPlie] = useState({});           // { [optId]: true } → repliée

  const palettes = useMemo(() => {
    const map = new Map();
    (modeles || []).forEach((m) => {
      const key = m.palette?.id ? `id:${m.palette.id}` : `nom:${m.palette?.nom || "Sans palette"}`;
      if (!map.has(key)) map.set(key, { key, id: m.palette?.id || null, nom: m.palette?.nom || "Sans palette", marque: m.palette?.marque || null, items: [] });
      map.get(key).items.push({ id: m.id, nom: m.nom, imageUrl: m.imageUrl || null, couleur: m.couleur || null });
    });
    return [...map.values()];
  }, [modeles]);

  const ajouter = () => {
    const id = uid();
    onChange([...options, {
      id, nom: "", description: "", images: [],
      sansDeclinaisons: true, referenceUnitaire: "",
      prixTarifHT: "", prixVenteHT: "",
      axes: [], declinaisons: [], groupesFinition: [],
    }]);
    setPlie((s) => ({ ...s, [id]: false }));
  };
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

  // Groupes de finitions nommés
  const ajouterGroupeFin = (opt) =>
    maj(opt.id, { groupesFinition: [...(opt.groupesFinition || []), { id: uid(), nom: "", finitions: [] }] });
  const renommerGroupeFin = (opt, gid, nom) =>
    maj(opt.id, { groupesFinition: (opt.groupesFinition || []).map((g) => (g.id === gid ? { ...g, nom } : g)) });
  const supprimerGroupeFin = (opt, gid) =>
    maj(opt.id, { groupesFinition: (opt.groupesFinition || []).filter((g) => g.id !== gid) });
  const setFinitionsGroupe = (opt, gid, finitions) =>
    maj(opt.id, { groupesFinition: (opt.groupesFinition || []).map((g) => (g.id === gid ? { ...g, finitions } : g)) });

  const ongletActif = (o) => {
    const cur = ongletOpt[o.id] || "general";
    if (cur === "decl" && (o.sansDeclinaisons ?? true)) return "general";
    return cur;
  };
  const setOnglet = (id, val) => setOngletOpt((s) => ({ ...s, [id]: val }));
  const ongletsDeO = (o) => {
    const t = [["general", "Général"]];
    if (!(o.sansDeclinaisons ?? true)) t.push(["decl", "Déclinaisons"]);
    t.push(["prix", "Prix"], ["fin", "Finitions"], ["img", "Images"]);
    return t;
  };
  const togglePli = (id) => setPlie((s) => ({ ...s, [id]: !s[id] }));

  const label = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5c616a", marginBottom: 6 };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
  const petitInput = { ...input, padding: "8px 10px", fontSize: 13 };
  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };

  const libelleDecl = (opt, d) =>
    (opt.axes || []).filter((a) => a.nom?.trim()).map((a) => `${a.nom} : ${d.valeurs?.[a.id] || "—"}`).join("  ·  ");

  const btnIcone = { width: 30, height: 30, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 13 };

  return (
    <div style={card}>
      <label style={{ ...label, marginBottom: 4 }}>Options / Accessoires</label>
      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 18px" }}>
        Chaque option est organisée en onglets. Clique le titre pour la replier/déplier — pratique quand il y en a plusieurs.
      </p>

      {options.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12, marginBottom: 14 }}>
          Aucune option pour l'instant. Ajoute un accessoire ci-dessous (ex : retour, bloc à encastrer, top de finition…).
        </div>
      )}

      {options.map((o, i) => {
        const sansDecl = o.sansDeclinaisons ?? true;
        const lignes = o.declinaisons || [];
        const groupes = o.groupesFinition || [];
        const actif = ongletActif(o);
        const sansImage = !o.images || o.images.length === 0;
        const replie = !!plie[o.id];
        const nbFin = groupes.reduce((n, g) => n + (g.finitions || []).length, 0);

        return (
          <div key={o.id} style={{ border: "1px solid #f0ece4", borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
            {/* Barre titre (cliquable pour plier/déplier) */}
            <div onClick={() => togglePli(o.id)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: replie ? "none" : "1px solid #f0ece4", background: "#faf8f4", cursor: "pointer" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span style={{ color: "#9aa0a8", fontSize: 12, transform: replie ? "rotate(-90deg)" : "none", transition: "transform .15s" }}>▾</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Option {i + 1}{o.nom ? ` — ${o.nom}` : ""}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>
                  {sansDecl ? "Prix fixe" : "Déclinaisons"}
                </span>
                {replie && nbFin > 0 && <span style={{ fontSize: 11.5, color: "#9aa0a8", whiteSpace: "nowrap" }}>· {nbFin} coloris</span>}
              </span>
              <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} title="Monter"
                  style={{ ...btnIcone, cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === options.length - 1} title="Descendre"
                  style={{ ...btnIcone, cursor: i === options.length - 1 ? "default" : "pointer", opacity: i === options.length - 1 ? 0.4 : 1 }}>↓</button>
                <button type="button" onClick={() => supprimer(o.id)} title="Supprimer cette option"
                  style={{ ...btnIcone, color: "#c4735a" }}>🗑</button>
              </div>
            </div>

            {!replie && (
              <>
                {/* Onglets */}
                <div style={{ display: "flex", gap: 3, padding: "10px 12px 0", flexWrap: "wrap", background: "#faf8f4" }}>
                  {ongletsDeO(o).map(([val, lbl]) => {
                    const on = actif === val;
                    return (
                      <button key={val} type="button" onClick={() => setOnglet(o.id, val)}
                        style={{ padding: "8px 14px", border: "none", borderRadius: "9px 9px 0 0", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                          background: on ? "#fff" : "transparent", color: on ? "#f0661b" : "#5c616a" }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>

                {/* Contenu de l'onglet */}
                <div style={{ padding: 16, background: "#fff" }}>
                  {actif === "general" && (
                    <div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={label}>Nom de l'option</label>
                        <input value={o.nom} onChange={(e) => maj(o.id, { nom: e.target.value })} placeholder="ex : Retour / Extension" style={input} />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={label}>Description</label>
                        <textarea value={o.description || ""} onChange={(e) => maj(o.id, { description: e.target.value })} rows={2}
                          placeholder="Courte description affichée sous l'option sur la fiche." style={{ ...input, resize: "vertical" }} />
                      </div>
                      <label style={{ ...label, marginBottom: 8 }}>Type de prix</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 460 }}>
                        {[
                          ["fixe", "Prix fixe", "Un seul prix pour l'option", sansDecl],
                          ["decl", "Déclinaisons", "Plusieurs combinaisons (ex : Longueur)", !sansDecl],
                        ].map(([val, titre, desc, on]) => (
                          <button key={val} type="button"
                            onClick={() => maj(o.id, { sansDeclinaisons: val === "fixe" })}
                            style={{ textAlign: "left", padding: "13px 14px", borderRadius: 12, cursor: "pointer",
                              border: "1.5px solid " + (on ? "#f0661b" : "#ece8e0"), background: on ? "#fef7f2" : "#fff" }}>
                            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#23262a" }}>{titre}</span>
                            <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 3 }}>{desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {actif === "decl" && !sansDecl && (
                    <DeclinaisonsBoutique
                      axes={o.axes || []}
                      lignes={lignes}
                      onChangeAxes={(axes) => maj(o.id, { axes })}
                      onChangeLignes={(ls) => maj(o.id, { declinaisons: ls })}
                      sansDeclinaisons={sansDecl}
                      onChangeSansDeclinaisons={(v) => maj(o.id, { sansDeclinaisons: v })}
                      referenceUnitaire={o.referenceUnitaire || ""}
                      onChangeReferenceUnitaire={(v) => maj(o.id, { referenceUnitaire: v })}
                      masquerSwitch
                    />
                  )}

                  {actif === "prix" && (
                    sansDecl ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 560 }}>
                        <div>
                          <label style={label}>Prix fournisseur € HT</label>
                          <input value={o.prixTarifHT ?? ""} onChange={(e) => maj(o.id, { prixTarifHT: e.target.value })} placeholder="135" inputMode="decimal" style={input} />
                        </div>
                        <div>
                          <label style={label}>Prix vente € HT</label>
                          <input value={o.prixVenteHT ?? o.prixHT ?? ""} onChange={(e) => maj(o.id, { prixVenteHT: e.target.value })} placeholder="155" inputMode="decimal" style={input} />
                        </div>
                        <div>
                          <label style={label}>Référence</label>
                          <input value={o.referenceUnitaire ?? ""} onChange={(e) => maj(o.id, { referenceUnitaire: e.target.value })} placeholder="BS843G" style={input} />
                        </div>
                      </div>
                    ) : lignes.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>Génère d'abord les combinaisons dans l'onglet Déclinaisons pour saisir leurs prix.</p>
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
                        <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "10px 0 0" }}>La référence fournisseur de chaque combinaison se saisit dans l'onglet Déclinaisons.</p>
                      </div>
                    )
                  )}

                  {actif === "fin" && (
                    <div>
                      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 12px" }}>
                        Un groupe par type de finition (ex : Piètement, Plateau). Le client choisit un coloris dans chaque groupe. Pour un coloris lié à une valeur d'axe précise, utilise plutôt le 🎨 dans l'onglet Déclinaisons.
                      </p>
                      {groupes.length === 0 && (
                        <p style={{ fontSize: 12.5, color: "#c4c0b8", fontStyle: "italic", margin: "0 0 10px" }}>Aucun groupe de finitions.</p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {groupes.map((g) => {
                          const nbColoris = (g.finitions || []).length;
                          return (
                            <div key={g.id} style={{ border: "1px solid #ece8e0", borderRadius: 10, padding: 12, background: "#faf8f4" }}>
                              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                <input value={g.nom} onChange={(e) => renommerGroupeFin(o, g.id, e.target.value)} placeholder="Nom du groupe (ex : Piètement)" style={{ ...petitInput, flex: 1, background: "#fff" }} />
                                <button type="button" onClick={() => supprimerGroupeFin(o, g.id)} title="Supprimer le groupe"
                                  style={{ padding: "0 12px", borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", color: "#c4735a", cursor: "pointer" }}>🗑</button>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {(g.finitions || []).map((f) => (
                                  <span key={f.id} title={f.nom} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "#fff", border: "1px solid #ece8e0", borderRadius: 999, padding: "3px 8px 3px 4px" }}>
                                    <span style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid #e0dacf", overflow: "hidden", background: f.couleur || "#f0ece4", display: "inline-block" }}>
                                      {f.imageUrl ? <img src={f.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                                    </span>
                                    {f.nom}
                                  </span>
                                ))}
                                <button type="button" onClick={() => setPicker({ optId: o.id, groupeId: g.id })}
                                  style={{ fontSize: 12, color: "#f0661b", background: "#fff", border: "1px solid #f0c4a0", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                                  🎨 {nbColoris ? "Modifier" : "Choisir"} les coloris
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => ajouterGroupeFin(o)}
                        style={{ marginTop: 10, padding: "9px 14px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#23262a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        + Ajouter un groupe de finitions
                      </button>
                    </div>
                  )}

                  {actif === "img" && (
                    <div>
                      <label style={label}>Images (la principale sert de vignette)</label>
                      <ImageUploader images={o.images || []} onChange={(imgs) => maj(o.id, { images: imgs })} />
                      {sansImage && (
                        <div style={{ marginTop: 10, fontSize: 12, color: "#b45528", background: "#fef4ee", borderRadius: 9, padding: "8px 12px", display: "inline-block" }}>
                          ⚠ Une image principale est requise pour publier l'option.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
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
            const g = (opt?.groupesFinition || []).find((x) => x.id === picker.groupeId);
            return (g?.finitions || []).map((f) => f.id);
          })()}
          onClose={() => setPicker(null)}
          onValider={(idsSel) => {
            const opt = options.find((x) => x.id === picker.optId);
            const flat = palettes.flatMap((p) => p.items).filter((f) => idsSel.includes(f.id))
              .map((f) => ({ id: f.id, nom: f.nom, couleur: f.couleur || null, imageUrl: f.imageUrl || null }));
            setFinitionsGroupe(opt, picker.groupeId, flat);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────── Sélecteur de palettes / coloris ───────────
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
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 6px" }}>Choisir les coloris</h2>
        <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px" }}>Coche une palette entière, ou déplie (« Coloris ») pour choisir couleur par couleur.</p>

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