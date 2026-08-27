"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { togglePublicationGamme, supprimerGamme } from "./actions";

export default function GammesManager({ gammes: gammesInit }) {
  const [gammes, setGammes] = useState(gammesInit);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes"); // toutes | publiees | brouillons
  const [isPending, startTransition] = useTransition();
  const [gammeASupprimer, setGammeASupprimer] = useState(null);

  const filtrees = useMemo(() => {
    return gammes.filter((g) => {
      if (filtre === "publiees" && !g.publie) return false;
      if (filtre === "brouillons" && g.publie) return false;
      if (recherche.trim()) {
        const q = recherche.toLowerCase();
        const dansCategories = (g.categories || []).some((c) => c.toLowerCase().includes(q));
        const dansMarque = (g.marque || "").toLowerCase().includes(q);
        if (!g.nom.toLowerCase().includes(q) && !dansCategories && !dansMarque) return false;
      }
      return true;
    });
  }, [gammes, recherche, filtre]);

  const nbPubliees = gammes.filter((g) => g.publie).length;

  const togglePub = (id, nouvelEtat) => {
    setGammes((gs) => gs.map((g) => (g.id === id ? { ...g, publie: nouvelEtat } : g)));
    startTransition(async () => { await togglePublicationGamme(id, nouvelEtat); });
  };

  const cellStyle = { padding: "14px 16px", fontSize: 14, color: "#23262a", borderBottom: "1px solid #ece8e0", verticalAlign: "middle" };
  const thStyle = { padding: "12px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", textAlign: "left", borderBottom: "1px solid #ece8e0" };

  const badgeMarque = (nom) => (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: "#23262a", color: "#fff", whiteSpace: "nowrap" }}>
      {nom}
    </span>
  );

  const badgeStatut = (publie) => (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
      background: publie ? "#e8f6f0" : "#f0ece4",
      color: publie ? "#1f7a52" : "#5c616a",
    }}>
      {publie ? "Publiée" : "Brouillon"}
    </span>
  );

  const vignette = (g, taille) => (
    <div style={{ width: taille, height: taille, borderRadius: 10, overflow: "hidden", background: "#f0ece4", flexShrink: 0, display: "grid", placeItems: "center" }}>
      {g.imageUrl ? <img src={g.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#c4c0b8", fontSize: 10 }}>—</span>}
    </div>
  );

  const champRecherche = (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8", display: "flex" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </span>
      <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une gamme, une marque…"
        style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: 12, border: "1px solid #ece8e0", background: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  const pastilleFiltre = (val, label) => {
    const actif = filtre === val;
    return (
      <button key={val} onClick={() => setFiltre(val)}
        style={{
          fontSize: 12, padding: "6px 14px", borderRadius: 999, cursor: "pointer",
          border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"),
          background: actif ? "#fce6d6" : "#faf8f4",
          color: actif ? "#d9551a" : "#5c616a",
          fontWeight: actif ? 700 : 500, fontFamily: "inherit", whiteSpace: "nowrap",
        }}>
        {label}
      </button>
    );
  };

  const infoCompteur = (label, valeur, vert = false) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: valeur > 0 ? 700 : 400, color: valeur > 0 ? (vert ? "#1f7a52" : "#23262a") : "#b0aca2", margin: "1px 0 0" }}>{valeur}</p>
    </div>
  );

  return (
    <div>
      <style>{`
        /* Sous 1024px : cartes empilées (le tableau à 8 colonnes déborde sans recours).
           Au-delà : le tableau d'origine. */
        .gm-mobile { display: block; }
        .gm-desktop { display: none; }
        @media (min-width: 1024px) {
          .gm-mobile { display: none; }
          .gm-desktop { display: block; }
        }
      `}</style>

      {/* ═══ MOBILE ═══ */}
      <div className="gm-mobile">
        <Link href="/admin/architecture/nouvelle"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 11, background: "#f0661b", color: "#fff", textDecoration: "none", fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>
          + Nouvelle gamme
        </Link>

        <div style={{ marginBottom: 8 }}>{champRecherche}</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {pastilleFiltre("toutes", "Toutes")}
          {pastilleFiltre("publiees", "Publiées")}
          {pastilleFiltre("brouillons", "Brouillons")}
        </div>

        <p style={{ fontSize: 12.5, color: "#5c616a", margin: "0 0 12px", padding: "0 2px" }}>
          <strong style={{ color: "#23262a" }}>{filtrees.length}</strong> gamme{filtrees.length > 1 ? "s" : ""}
          {filtrees.length !== gammes.length && <span style={{ color: "#9aa0a8" }}> sur {gammes.length}</span>}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrees.map((g) => (
            <div key={g.id} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 12, padding: "13px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                {vignette(g, 42)}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.nom}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                    {g.marque && badgeMarque(g.marque)}
                    {(g.categories || []).length > 0 && (
                      <span style={{ fontSize: 11, color: "#9aa0a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {g.categories.join(" · ")}
                      </span>
                    )}
                  </div>
                  {!g.aDescriptif && <p style={{ fontSize: 11, color: "#d9861a", margin: "3px 0 0" }}>descriptif manquant</p>}
                </div>
                <div style={{ flexShrink: 0 }}>{badgeStatut(g.publie)}</div>
              </div>

              <div style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: "1px solid #f2efe9", borderBottom: "1px solid #f2efe9", marginBottom: 10 }}>
                {infoCompteur("Produits", g.nbVitrines)}
                {infoCompteur("Anciens", g.nbProduits)}
                {infoCompteur("Finitions", g.nbGroupesFinition, true)}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => togglePub(g.id, !g.publie)} disabled={isPending}
                  style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid #e8e3da", background: "#faf8f4", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: g.publie ? "#5c616a" : "#f0661b", fontFamily: "inherit" }}>
                  {g.publie ? "Dépublier" : "Publier"}
                </button>
                <Link href={`/admin/architecture/${g.id}`}
                  style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#23262a", color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
                  Éditer
                </Link>
                <button onClick={() => setGammeASupprimer(g)} title="Supprimer"
                  style={{ width: 42, display: "grid", placeItems: "center", padding: "9px", borderRadius: 10, border: "1px solid #e8e3da", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 14 }}>
                  🗑
                </button>
              </div>
            </div>
          ))}

          {filtrees.length === 0 && (
            <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 12, padding: 40, textAlign: "center", color: "#9aa0a8", fontSize: 14 }}>
              Aucune gamme ne correspond.
            </div>
          )}
        </div>
      </div>

      {/* ═══ DESKTOP ═══ */}
      <div className="gm-desktop">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <p style={{ color: "#5c616a", margin: 0, fontSize: 14 }}>{gammes.length} gammes · {nbPubliees} publiées</p>
          <Link href="/admin/architecture/nouvelle"
            style={{ padding: "12px 20px", borderRadius: 11, background: "#f0661b", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
            + Nouvelle gamme
          </Link>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {champRecherche}
          <div style={{ display: "flex", gap: 6, background: "#f0ece4", padding: 4, borderRadius: 12 }}>
            {[["toutes", "Toutes"], ["publiees", "Publiées"], ["brouillons", "Brouillons"]].map(([val, label]) => (
              <button key={val} onClick={() => setFiltre(val)}
                style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: filtre === val ? "#fff" : "transparent", color: filtre === val ? "#f0661b" : "#5c616a", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead style={{ background: "#faf8f4" }}>
                <tr>
                  <th style={thStyle}>Gamme</th>
                  <th style={thStyle}>Marque</th>
                  <th style={thStyle}>Catégorie(s)</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Cartes</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Produits</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Finitions</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Statut</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtrees.map((g) => (
                  <tr key={g.id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {vignette(g, 44)}
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>{g.nom}</p>
                          {!g.aDescriptif && <span style={{ fontSize: 11, color: "#d9861a" }}>descriptif manquant</span>}
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      {g.marque
                        ? <span style={{ display: "inline-block", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#23262a", color: "#fff", whiteSpace: "nowrap" }}>{g.marque}</span>
                        : <span style={{ color: "#c4c0b8", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {(g.categories || []).length > 0
                          ? g.categories.map((c) => (
                              <span key={c} style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "#f0ece4", color: "#5c616a", whiteSpace: "nowrap" }}>{c}</span>
                            ))
                          : <span style={{ color: "#c4c0b8", fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{g.nbVitrines}</td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{g.nbProduits}</td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      {g.nbGroupesFinition > 0
                        ? <span style={{ color: "#1f7a52", fontWeight: 600 }}>{g.nbGroupesFinition}</span>
                        : <span style={{ color: "#c4c0b8" }}>0</span>}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: g.publie ? "#e8f6f0" : "#f0ece4", color: g.publie ? "#1f7a52" : "#5c616a" }}>
                        {g.publie ? "Publiée" : "Brouillon"}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <button onClick={() => togglePub(g.id, !g.publie)} disabled={isPending}
                          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: g.publie ? "#5c616a" : "#f0661b", fontFamily: "inherit" }}>
                          {g.publie ? "Dépublier" : "Publier"}
                        </button>
                        <Link href={`/admin/architecture/${g.id}`}
                          style={{ padding: "7px 14px", borderRadius: 8, background: "#23262a", color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 600 }}>
                          Éditer
                        </Link>
                        <button onClick={() => setGammeASupprimer(g)} title="Supprimer"
                          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a" }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtrees.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#9aa0a8", fontSize: 14 }}>Aucune gamme ne correspond.</div>
          )}
        </div>
      </div>

      {gammeASupprimer && (
        <ModaleSuppression
          gamme={gammeASupprimer}
          onClose={() => setGammeASupprimer(null)}
          onSupprime={(id) => setGammes((gs) => gs.filter((g) => g.id !== id))}
        />
      )}
    </div>
  );
}

function ModaleSuppression({ gamme, onClose, onSupprime }) {
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirmationValide = confirmation.trim() === gamme.nom;

  const valider = () => {
    setErreur("");
    startTransition(async () => {
      const res = await supprimerGamme(gamme.id);
      if (!res.ok) { setErreur(res.error); return; }
      onSupprime(gamme.id);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" style={{ position: "fixed" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 460, borderRadius: 20, background: "#fff", border: "1px solid #ece8e0", padding: 24, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.35)", maxHeight: "90dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: "#fef4ee", color: "#c4735a", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
          </span>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: 0 }}>Supprimer « {gamme.nom} » ?</h2>
        </div>

        <p style={{ fontSize: 13.5, color: "#5c616a", lineHeight: 1.6, marginBottom: 14 }}>
          Cette action est <strong>irréversible</strong>. Elle supprimera aussi définitivement :
        </p>
        <ul style={{ fontSize: 13.5, color: "#5c616a", lineHeight: 1.9, marginBottom: 18, paddingLeft: 20 }}>
          <li>{gamme.nbVitrines} produit{gamme.nbVitrines > 1 ? "s" : ""} de cette gamme</li>
          <li>{gamme.nbGroupesFinition} groupe{gamme.nbGroupesFinition > 1 ? "s" : ""} de finitions associé{gamme.nbGroupesFinition > 1 ? "s" : ""}</li>
          <li>Les favoris que des clients auraient enregistrés sur ces produits</li>
        </ul>

        <label style={{ display: "block", fontSize: 12.5, color: "#5c616a", marginBottom: 8 }}>
          Pour confirmer, tape <strong style={{ color: "#23262a" }}>{gamme.nom}</strong> ci-dessous :
        </label>
        <input value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setErreur(""); }}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }} />

        {erreur && (
          <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "11px 16px", borderRadius: 10, marginTop: 14 }}>
            {erreur}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={valider} disabled={!confirmationValide || isPending}
            style={{ flex: 1, padding: "13px", borderRadius: 12, background: !confirmationValide || isPending ? "#e8bfae" : "#c4451f", color: "#fff", border: "none", cursor: !confirmationValide || isPending ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}