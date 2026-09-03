"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analyserImport, lancerImport } from "./actions";

const champ = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e3da",
  background: "#fff", fontSize: 13.5, color: "#23262a", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const mini = { fontSize: 11, color: "#9aa0a8", margin: "0 0 5px", display: "block", fontWeight: 600 };

export default function ImportForm({ contexte }) {
  const router = useRouter();
  const fichierRef = useRef(null);

  const [json, setJson] = useState("");
  const [nomFichier, setNomFichier] = useState("");
  const [modeGamme, setModeGamme] = useState("existante"); // existante | nouvelle
  const [gammeId, setGammeId] = useState("");
  const [nouvelleGamme, setNouvelleGamme] = useState("");

  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [ouvert, setOuvert] = useState(null); // produit déplié dans l'aperçu

  const gammeChoisie = contexte.gammes.find((g) => g.id === gammeId);

  const chargerFichier = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const texte = await f.text();
    setJson(texte);
    setNomFichier(f.name);
    setApercu(null);
    setErreur("");
    setResultat(null);
  };

  const analyser = async () => {
    if (!json.trim()) { setErreur("Déposez un fichier ou collez le JSON."); return; }
    setEnCours(true);
    setErreur("");
    const res = await analyserImport({ json, gammeId: modeGamme === "existante" ? gammeId : null });
    setEnCours(false);
    if (res.erreur) { setErreur(res.erreur); setApercu(null); return; }
    setApercu(res);
  };

  const importer = async () => {
    if (modeGamme === "existante" && !gammeId) { setErreur("Choisissez une gamme."); return; }
    if (modeGamme === "nouvelle" && !nouvelleGamme.trim()) { setErreur("Nommez la nouvelle gamme."); return; }

    setEnCours(true);
    setErreur("");
    const res = await lancerImport({
      json,
      gammeId: modeGamme === "existante" ? gammeId : null,
      nouvelleGammeNom: modeGamme === "nouvelle" ? nouvelleGamme : null,
    });
    setEnCours(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    setResultat(res);
    setApercu(null);
    router.refresh();
  };

  const reinitialiser = () => {
    setJson(""); setNomFichier(""); setApercu(null); setResultat(null); setErreur("");
    if (fichierRef.current) fichierRef.current.value = "";
  };

  // ── Après import ──
  if (resultat) {
    return (
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 12, background: "#e8f6f0", color: "#1f7a52", marginBottom: 14 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "#23262a", margin: "0 0 6px" }}>
          {resultat.produits.length} produit{resultat.produits.length > 1 ? "s" : ""} importé{resultat.produits.length > 1 ? "s" : ""}
        </p>
        <p style={{ fontSize: 13, color: "#5c616a", margin: "0 0 16px", lineHeight: 1.6 }}>
          Ils sont en brouillon, suffixés « NEW ». Il reste à saisir les prix, ajouter les photos, puis publier.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          {resultat.produits.map((p) => (
            <Link key={p.id} href={`/admin/architecture/${resultat.gammeId}/carte/${p.id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 13px", borderRadius: 10, background: "#faf8f4", textDecoration: "none" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a" }}>{p.nom}</span>
              <span style={{ fontSize: 11.5, color: "#f0661b", fontWeight: 600, whiteSpace: "nowrap" }}>Compléter →</span>
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/admin/architecture/${resultat.gammeId}`}
            style={{ padding: "11px 18px", borderRadius: 999, background: "#f0661b", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Voir la gamme
          </Link>
          <button onClick={reinitialiser}
            style={{ padding: "11px 18px", borderRadius: 999, border: "1px solid #ece8e0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#23262a", cursor: "pointer", fontFamily: "inherit" }}>
            Importer une autre gamme
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .imp-grille { display: grid; grid-template-columns: 1fr; gap: 8px; }
        @media (min-width: 1024px) { .imp-grille { grid-template-columns: 360px 1fr; align-items: start; } }
      `}</style>

      <div className="imp-grille">
        {/* ── Colonne réglages ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Fichier */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: "0 0 12px" }}>1 · Le fichier</p>

            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "20px 14px",
              borderRadius: 12, border: "1.5px dashed #e8e3da", background: "#faf8f4", cursor: "pointer",
            }}>
              <span style={{ color: nomFichier ? "#1f7a52" : "#c4c0b6", display: "flex" }}>
                {nomFichier ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
                )}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a", textAlign: "center", wordBreak: "break-all" }}>
                {nomFichier || "Déposer un fichier .json"}
              </span>
              {!nomFichier && <span style={{ fontSize: 11, color: "#9aa0a8" }}>ou collez le contenu ci-dessous</span>}
              <input ref={fichierRef} type="file" accept=".json,application/json" onChange={chargerFichier} style={{ display: "none" }} />
            </label>

            <textarea
              value={json}
              onChange={(e) => { setJson(e.target.value); setApercu(null); setNomFichier(""); }}
              placeholder='{ "produits": [ … ] }'
              style={{ ...champ, minHeight: 110, marginTop: 10, fontFamily: "ui-monospace, monospace", fontSize: 11.5, lineHeight: 1.5, resize: "vertical" }}
            />
          </div>

          {/* Gamme */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: "0 0 12px" }}>2 · La gamme</p>

            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[["existante", "Gamme existante"], ["nouvelle", "Nouvelle gamme"]].map(([cle, label]) => {
                const actif = modeGamme === cle;
                return (
                  <button key={cle} onClick={() => { setModeGamme(cle); setApercu(null); }}
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      background: actif ? "#23262a" : "#fff", color: actif ? "#fff" : "#5c616a",
                      border: actif ? "1px solid #23262a" : "1px solid #ece8e0",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {modeGamme === "existante" ? (
              <div>
                <label style={mini}>Choisir la gamme</label>
                <select value={gammeId} onChange={(e) => { setGammeId(e.target.value); setApercu(null); }} style={champ}>
                  <option value="">— Sélectionner —</option>
                  {contexte.gammes.map((g) => (
                    <option key={g.id} value={g.id}>{g.nom}{g.marque ? ` · ${g.marque}` : ""}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={mini}>Nom de la nouvelle gamme</label>
                <input value={nouvelleGamme} onChange={(e) => { setNouvelleGamme(e.target.value); setApercu(null); }}
                  placeholder="Ex. Rétro" style={champ} />
                <p style={{ fontSize: 11, color: "#9aa0a8", margin: "7px 0 0", lineHeight: 1.5 }}>
                  Elle sera créée en brouillon, rattachée à Buronomic.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: "0 0 12px" }}>3 · Vérifier puis importer</p>

            {erreur && (
              <p style={{ fontSize: 12, color: "#d9551a", background: "#fce6d6", borderRadius: 9, padding: "9px 11px", margin: "0 0 10px", lineHeight: 1.5 }}>
                {erreur}
              </p>
            )}

            <button onClick={analyser} disabled={enCours || !json.trim()}
              style={{
                width: "100%", padding: 12, borderRadius: 999, border: "1px solid #ece8e0", background: "#fff",
                fontSize: 13, fontWeight: 600, color: "#23262a", fontFamily: "inherit",
                cursor: enCours || !json.trim() ? "not-allowed" : "pointer",
                opacity: enCours || !json.trim() ? 0.5 : 1,
              }}>
              {enCours ? "…" : "Analyser le fichier"}
            </button>

            <button onClick={importer} disabled={!apercu || enCours}
              style={{
                width: "100%", padding: 12, borderRadius: 999, border: "none", background: "#f0661b",
                color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", marginTop: 8,
                cursor: !apercu || enCours ? "not-allowed" : "pointer",
                opacity: !apercu || enCours ? 0.4 : 1,
              }}>
              {enCours ? "Import en cours…" : apercu ? `Importer ${apercu.total} produit${apercu.total > 1 ? "s" : ""}` : "Importer"}
            </button>

            {!apercu && (
              <p style={{ fontSize: 11, color: "#9aa0a8", margin: "9px 0 0", lineHeight: 1.5, textAlign: "center" }}>
                L&apos;analyse est obligatoire avant l&apos;import.
              </p>
            )}
          </div>
        </div>

        {/* ── Colonne aperçu ── */}
        <div>
          {!apercu ? (
            <div style={{ background: "#fff", border: "1px dashed #e8e3da", borderRadius: 16, padding: "50px 24px", textAlign: "center" }}>
              <span style={{ color: "#d3d1c7", display: "block", marginBottom: 10 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ margin: "0 auto" }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              </span>
              <p style={{ fontSize: 13.5, color: "#9aa0a8", margin: 0 }}>L&apos;aperçu s&apos;affichera ici après l&apos;analyse.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Résumé */}
              <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#23262a", margin: 0 }}>
                      {apercu.total} produit{apercu.total > 1 ? "s" : ""} à créer
                    </p>
                    <p style={{ fontSize: 12.5, color: "#5c616a", margin: "3px 0 0" }}>
                      dans {modeGamme === "existante" ? (gammeChoisie?.nom || "— gamme non choisie —") : (nouvelleGamme || "— gamme non nommée —")}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: "#f0ece4", color: "#5c616a" }}>
                    Brouillon
                  </span>
                </div>
              </div>

              {/* Alertes */}
              {apercu.alertes.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #f0c4a0", borderRadius: 16, padding: 16 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "#b45528", margin: "0 0 10px" }}>
                    {apercu.alertes.length} point{apercu.alertes.length > 1 ? "s" : ""} à vérifier
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {apercu.alertes.map((a, i) => (
                      <p key={i} style={{
                        fontSize: 12, lineHeight: 1.55, margin: 0, padding: "8px 11px", borderRadius: 9,
                        background: a.type === "erreur" ? "#fbe9e7" : "#fef4ee",
                        color: a.type === "erreur" ? "#b3392f" : "#b45528",
                      }}>
                        {a.texte}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Détail par produit */}
              <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
                {apercu.produits.map((p, i) => {
                  const deplie = ouvert === i;
                  return (
                    <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid #f2efe9" }}>
                      <button onClick={() => setOuvert(deplie ? null : i)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 15px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#23262a" }}>{p.nom}</span>
                            {p.estDoublon && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#fef4ee", color: "#b45528" }}>Doublon</span>
                            )}
                          </span>
                          <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 3 }}>
                            {[
                              p.categorieNom ? `${p.categorieNom}${p.sousCategorieNom ? ` › ${p.sousCategorieNom}` : ""}` : "Sans catégorie",
                              p.sansDeclinaisons ? "prix unique" : `${p.declinaisons.length} déclinaison${p.declinaisons.length > 1 ? "s" : ""}`,
                              p.groupesFinition.length > 0 ? `${p.groupesFinition.length} groupe${p.groupesFinition.length > 1 ? "s" : ""} de finitions` : null,
                            ].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span style={{ color: deplie ? "#d9551a" : "#9aa0a8", display: "flex", flexShrink: 0, transform: deplie ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
                        </span>
                      </button>

                      {deplie && (
                        <div style={{ padding: "0 15px 15px" }}>
                          {p.descriptif && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#b0aca2", margin: "0 0 5px" }}>Description</p>
                              <p style={{ fontSize: 12, color: "#5c616a", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.descriptif}</p>
                            </div>
                          )}

                          {(p.largeurMin || p.hauteurMin || p.profondeurMin) && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#b0aca2", margin: "0 0 5px" }}>Dimensions</p>
                              <p style={{ fontSize: 12, color: "#5c616a", margin: 0 }}>
                                {[
                                  p.largeurMin ? `L ${p.largeurMin}${p.largeurMax && p.largeurMax !== p.largeurMin ? `–${p.largeurMax}` : ""} cm` : null,
                                  p.profondeurMin ? `P ${p.profondeurMin}${p.profondeurMax && p.profondeurMax !== p.profondeurMin ? `–${p.profondeurMax}` : ""} cm` : null,
                                  p.hauteurMin ? `H ${p.hauteurMin}${p.hauteurMax && p.hauteurMax !== p.hauteurMin ? `–${p.hauteurMax}` : ""} cm` : null,
                                ].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          )}

                          {!p.sansDeclinaisons && p.declinaisons.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#b0aca2", margin: "0 0 6px" }}>
                                Déclinaisons — prix à saisir
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {p.declinaisons.map((d, di) => (
                                  <div key={di} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "7px 11px", borderRadius: 8, background: "#faf8f4" }}>
                                    <span style={{ fontSize: 12, color: "#23262a" }}>
                                      {Object.values(d.valeurs || {}).join(" / ") || "—"}
                                    </span>
                                    <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#9aa0a8", whiteSpace: "nowrap" }}>
                                      {d.referenceFournisseur || "sans réf."}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.sansDeclinaisons && p.referenceUnitaire && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#b0aca2", margin: "0 0 5px" }}>Référence</p>
                              <p style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#5c616a", margin: 0 }}>{p.referenceUnitaire}</p>
                            </div>
                          )}

                          {p.groupesFinition.map((g, gi) => (
                            <div key={gi} style={{ marginBottom: 10 }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#b0aca2", margin: "0 0 6px" }}>{g.nom}</p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {g.finitions.map((f, fi) => (
                                  <span key={fi} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "4px 9px", borderRadius: 999, background: "#f4f2ed", color: "#5c616a" }}>
                                    {f.couleur && <span style={{ width: 10, height: 10, borderRadius: "50%", background: f.couleur, border: "1px solid rgba(0,0,0,0.08)" }} />}
                                    {f.nom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}