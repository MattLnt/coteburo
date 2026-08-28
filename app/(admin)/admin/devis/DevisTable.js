"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

const euro = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const euro0 = (v) => `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const dateCourte = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

// Statuts du cycle de vie d'un devis, dans l'ordre du parcours.
const STATUTS = {
  nouveau: { label: "Nouveau", court: "Nouveau", bg: "#fce6d6", color: "#d9551a" },
  en_cours: { label: "En chiffrage", court: "Chiffrage", bg: "#e6eefc", color: "#2a5db0" },
  envoye: { label: "Envoyé", court: "Envoyé", bg: "#f0ece4", color: "#5c616a" },
  accepte: { label: "Accepté", court: "Accepté", bg: "#e8f6f0", color: "#1f7a52" },
  refuse: { label: "Refusé", court: "Refusé", bg: "#fbe9e7", color: "#b3392f" },
  expire: { label: "Expiré", court: "Expiré", bg: "#f2efe9", color: "#9aa0a8" },
};

const FILTRES = [
  { cle: "tous", label: "Tous" },
  { cle: "nouveau", label: "Nouveaux" },
  { cle: "en_cours", label: "En chiffrage" },
  { cle: "envoye", label: "Envoyés" },
  { cle: "accepte", label: "Acceptés" },
  { cle: "refuse", label: "Refusés" },
  { cle: "expire", label: "Expirés" },
];

function Badge({ statut, court }) {
  const s = STATUTS[statut] || STATUTS.nouveau;
  return (
    <span style={{
      display: "inline-block", fontSize: 10.5, fontWeight: 700, padding: "3px 9px",
      borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      {court ? s.court : s.label}
    </span>
  );
}

export default function DevisTable({ devis, stats }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const counts = useMemo(() => {
    const c = { tous: devis.length };
    for (const d of devis) c[d.statut] = (c[d.statut] || 0) + 1;
    return c;
  }, [devis]);

  const filtres = useMemo(() => {
    return devis.filter((d) => {
      if (filtre !== "tous" && d.statut !== filtre) return false;
      if (recherche.trim()) {
        const q = recherche.toLowerCase();
        const cible = `${d.numero} ${d.prenom} ${d.nom} ${d.societe || ""} ${d.email}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }
      return true;
    });
  }, [devis, filtre, recherche]);

  const filtresVisibles = FILTRES.filter((f) => f.cle === "tous" || (counts[f.cle] || 0) > 0);
  const filtreActif = FILTRES.find((f) => f.cle === filtre);

  const inputStyle = {
    width: "100%", padding: "11px 14px 11px 40px", borderRadius: 10,
    border: "1.5px solid #e8e3da", background: "#fff", fontSize: 14,
    color: "#23262a", outline: "none", boxSizing: "border-box",
  };

  const pastille = (f) => {
    const actif = filtre === f.cle;
    return (
      <button key={f.cle} onClick={() => setFiltre(f.cle)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px",
          borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", whiteSpace: "nowrap",
          background: actif ? "#f0661b" : "#fff",
          color: actif ? "#fff" : "#23262a",
          border: actif ? "1px solid #f0661b" : "1px solid #ece8e0",
        }}>
        {f.label}
        <span style={{
          fontSize: 10.5, padding: "0 5px", borderRadius: 999,
          background: actif ? "rgba(255,255,255,0.25)" : "#f0ece4",
          color: actif ? "#fff" : "#9aa0a8",
        }}>{counts[f.cle] || 0}</span>
      </button>
    );
  };

  return (
    <div>
      <style>{`
        .dv-mobile { display: block; }
        .dv-desktop { display: none; }
        .dv-filtres-bouton { display: flex; }
        .dv-filtres-corps { display: none; }
        .dv-filtres-corps.ouvert { display: block; }
        .dv-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (min-width: 1024px) {
          .dv-mobile { display: none; }
          .dv-desktop { display: block; }
          .dv-filtres-bouton { display: none; }
          .dv-filtres-corps { display: block; }
          .dv-kpis { grid-template-columns: repeat(4, 1fr); gap: 14px; }
        }
      `}</style>

      {/* ── KPI ── */}
      <div style={{ marginBottom: 14 }}>
        {/* Le CA accepté en pleine largeur : c'est le chiffre qui compte,
            et un montant à décimales déborde d'une petite tuile. */}
        <div style={{
          borderRadius: 14, padding: "14px 16px", marginBottom: 8,
          background: "linear-gradient(135deg, #f0661b, #d9551a)", color: "#fff",
        }}>
          <p style={{ fontSize: 11.5, opacity: 0.85, margin: 0 }}>CA sur devis acceptés</p>
          <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-display)", margin: "3px 0 0", lineHeight: 1 }}>{euro0(stats.caAccepte)}</p>
        </div>

        <div className="dv-kpis">
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "13px 15px" }}>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", color: stats.nouveaux > 0 ? "#d9551a" : "#23262a", margin: 0, lineHeight: 1 }}>{stats.nouveaux}</p>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "5px 0 0" }}>À chiffrer</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "13px 15px" }}>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", color: "#23262a", margin: 0, lineHeight: 1 }}>{stats.enCours}</p>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "5px 0 0" }}>En cours</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "13px 15px" }}>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", color: "#23262a", margin: 0, lineHeight: 1 }}>{stats.acceptes}</p>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "5px 0 0" }}>Acceptés</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "13px 15px" }}>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", color: "#23262a", margin: 0, lineHeight: 1 }}>
              {stats.tauxAccept != null ? `${stats.tauxAccept} %` : "—"}
            </p>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "5px 0 0" }}>Transformation</p>
          </div>
        </div>
      </div>

      {/* ── Recherche ── */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8", display: "flex" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Numéro, nom, société ou email…" style={inputStyle} />
      </div>

      {/* ── Filtres ── */}
      <div style={{
        borderRadius: 12, background: "#fff", marginBottom: 16, overflow: "hidden",
        border: `1px solid ${filtresOuverts ? "#f0c4a0" : "#ece8e0"}`,
      }}>
        <button type="button" onClick={() => setFiltresOuverts((v) => !v)}
          className="dv-filtres-bouton"
          style={{ width: "100%", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: filtresOuverts ? "#d9551a" : "#9aa0a8", display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#23262a" }}>Filtres</span>
            {filtre !== "tous" && (
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fce6d6", color: "#d9551a" }}>{filtreActif?.label}</span>
            )}
          </span>
          <span style={{ color: filtresOuverts ? "#d9551a" : "#9aa0a8", display: "flex", transform: filtresOuverts ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </button>

        <div className={`dv-filtres-corps${filtresOuverts ? " ouvert" : ""}`} style={{ padding: "12px 14px", borderTop: "1px solid #f2efe9" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {filtresVisibles.map(pastille)}
          </div>
        </div>
      </div>

      {filtres.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>
            {devis.length === 0 ? "Aucune demande de devis pour l'instant." : "Aucun devis ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <>
          {/* ═══ MOBILE — cartes ═══ */}
          <div className="dv-mobile" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtres.map((d) => (
              <Link key={d.id} href={`/admin/devis/${d.id}`}
                style={{ display: "block", background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "13px 14px", textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.prenom} {d.nom}
                    </p>
                    {d.societe && <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.societe}</p>}
                  </div>
                  <Badge statut={d.statut} court />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 9, paddingTop: 9, borderTop: "1px solid #f2efe9" }}>
                  <span style={{ fontSize: 11.5, color: "#9aa0a8" }}>
                    {d.numero} · {dateCourte(d.createdAt)} · {d.lignes.length} produit{d.lignes.length > 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", color: d.totalTTC != null ? "#23262a" : "#c4c0b6", whiteSpace: "nowrap" }}>
                    {d.totalTTC != null ? euro0(d.totalTTC) : "À chiffrer"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* ═══ DESKTOP — tableau ═══ */}
          <div className="dv-desktop" style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#faf8f4" }}>
                  {["Numéro", "Client", "Projet", "Date", "Montant TTC", "Statut", ""].map((h, i) => (
                    <th key={h + i} style={{
                      textAlign: i === 4 ? "right" : "left", padding: "12px 16px", fontSize: 11,
                      fontWeight: 700, color: "#5c616a", textTransform: "uppercase",
                      letterSpacing: "0.06em", borderBottom: "1px solid #ece8e0", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtres.map((d, i) => (
                  <tr key={d.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f2efe9" }}>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, fontWeight: 600, color: "#23262a", whiteSpace: "nowrap" }}>{d.numero}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, color: "#23262a" }}>
                      <span style={{ fontWeight: 600 }}>{d.prenom} {d.nom}</span>
                      {d.societe && <span style={{ display: "block", fontSize: 12, color: "#9aa0a8", marginTop: 1 }}>{d.societe}</span>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#5c616a", maxWidth: 220 }}>
                      {d.typeProjet || <span style={{ color: "#c4c0b6" }}>—</span>}
                      {d.lignes.length > 0 && <span style={{ display: "block", fontSize: 12, color: "#9aa0a8", marginTop: 1 }}>{d.lignes.length} produit{d.lignes.length > 1 ? "s" : ""}</span>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#5c616a", whiteSpace: "nowrap" }}>{dateFR(d.createdAt)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", color: d.totalTTC != null ? "#23262a" : "#c4c0b6" }}>
                      {d.totalTTC != null ? euro(d.totalTTC) : "À chiffrer"}
                    </td>
                    <td style={{ padding: "13px 16px" }}><Badge statut={d.statut} /></td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <Link href={`/admin/devis/${d.id}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#23262a", fontSize: 12.5, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}