"use client";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { creerProduitRapide } from "./actions";

export default function NouveauProduitModal({ open, onClose, gammes }) {
  const router = useRouter();
  const [nomProduit, setNomProduit] = useState("");
  const [rechercheGamme, setRechercheGamme] = useState("");
  const [gammeSelectionneeId, setGammeSelectionneeId] = useState(null);
  const [venteSurDevis, setVenteSurDevis] = useState(true);
  const [erreur, setErreur] = useState("");
  const [isPending, startTransition] = useTransition();

  // Tous les hooks doivent s'exécuter avant tout retour conditionnel
  const gammesFiltrees = useMemo(() => {
    const terme = rechercheGamme.trim().toLowerCase();
    if (!terme) return gammes.slice(0, 8);
    return gammes.filter((g) => g.nom.toLowerCase().includes(terme)).slice(0, 8);
  }, [rechercheGamme, gammes]);

  if (!open) return null;

  const gammeExisteExactement = gammes.some((g) => g.nom.toLowerCase() === rechercheGamme.trim().toLowerCase());
  const gammeSelectionnee = gammes.find((g) => g.id === gammeSelectionneeId) || null;

  const choisirGamme = (g) => {
    setGammeSelectionneeId(g.id);
    setRechercheGamme(g.nom);
  };

  const reinitialiserGamme = () => {
    setGammeSelectionneeId(null);
    setRechercheGamme("");
  };

  const fermer = () => {
    onClose();
    setTimeout(() => { setNomProduit(""); setRechercheGamme(""); setGammeSelectionneeId(null); setVenteSurDevis(true); setErreur(""); }, 250);
  };

  const valider = () => {
    setErreur("");
    if (!nomProduit.trim()) { setErreur("Le nom du produit est obligatoire."); return; }
    if (!gammeSelectionneeId && !rechercheGamme.trim()) { setErreur("Choisis une gamme existante ou tape le nom d'une nouvelle gamme."); return; }

    startTransition(async () => {
      const res = await creerProduitRapide({
        nomProduit,
        gammeId: gammeSelectionneeId,
        nouvelleGammeNom: gammeSelectionneeId ? null : rechercheGamme,
        venteSurDevis,
      });
      if (!res.ok) { setErreur(res.error || "Une erreur est survenue."); return; }
      router.push(`/admin/architecture/${res.gammeId}/carte/${res.id}`);
    });
  };

  const inputStyle = { width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 15, color: "#23262a", outline: "none" };
  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 8 };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" style={{ position: "fixed" }}>
      <div onClick={fermer} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 480, borderRadius: 20, background: "#fff", border: "1px solid #ece8e0", padding: 28, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.35)" }}>
        <button onClick={fermer} aria-label="Fermer" style={{ position: "absolute", top: 18, right: 18, color: "#9aa0a8", background: "none", border: "none", cursor: "pointer" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <h2 style={{ fontSize: 21, fontWeight: 800, color: "#23262a", margin: "0 0 4px" }}>Nouveau produit</h2>
        <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 22px" }}>Tu pourras remplir tout le reste juste après.</p>

        <div style={{ marginBottom: 18 }}>
          <label style={label}>Nom du produit</label>
          <input value={nomProduit} onChange={(e) => setNomProduit(e.target.value)} placeholder="Ex : Plan droit" style={inputStyle} autoFocus />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={label}>Gamme</label>
          {gammeSelectionnee ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 12, background: "#fef4ee", border: "1.5px solid #f0661b" }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "#d9551a" }}>{gammeSelectionnee.nom}</span>
              <button onClick={reinitialiserGamme} style={{ fontSize: 12.5, fontWeight: 600, color: "#9aa0a8", background: "none", border: "none", cursor: "pointer" }}>Changer</button>
            </div>
          ) : (
            <>
              <input
                value={rechercheGamme}
                onChange={(e) => { setRechercheGamme(e.target.value); setErreur(""); }}
                placeholder="Rechercher ou créer une gamme…"
                style={inputStyle}
              />
              {rechercheGamme.trim() && (
                <div style={{ marginTop: 8, border: "1px solid #ece8e0", borderRadius: 12, overflow: "hidden" }}>
                  {gammesFiltrees.map((g) => (
                    <button key={g.id} onClick={() => choisirGamme(g)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px", fontSize: 14, color: "#23262a", background: "#fff", border: "none", borderBottom: "1px solid #f2efe9", cursor: "pointer" }}>
                      {g.nom}
                    </button>
                  ))}
                  {!gammeExisteExactement && (
                    <button onClick={() => choisirGamme({ id: null, nom: rechercheGamme.trim() })}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "11px 16px", fontSize: 14, fontWeight: 600, color: "#f0661b", background: "#fef4ee", border: "none", cursor: "pointer" }}>
                      + Créer « {rechercheGamme.trim()} »
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <label style={label}>Mode de vente</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => setVenteSurDevis(true)}
              style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
                border: "1.5px solid " + (venteSurDevis ? "#f0661b" : "#ece8e0"),
                background: venteSurDevis ? "#fef4ee" : "#faf8f4",
                color: venteSurDevis ? "#d9551a" : "#5c616a" }}>
              Sur devis
              <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: venteSurDevis ? "#b45528" : "#9aa0a8", marginTop: 3 }}>Pas de prix ni de panier</span>
            </button>
            <button type="button" onClick={() => setVenteSurDevis(false)}
              style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
                border: "1.5px solid " + (!venteSurDevis ? "#f0661b" : "#ece8e0"),
                background: !venteSurDevis ? "#fef4ee" : "#faf8f4",
                color: !venteSurDevis ? "#d9551a" : "#5c616a" }}>
              Boutique
              <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: !venteSurDevis ? "#b45528" : "#9aa0a8", marginTop: 3 }}>Prix + panier direct</span>
            </button>
          </div>
        </div>

        {erreur && (
          <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "11px 16px", borderRadius: 10, marginTop: 16 }}>
            {erreur}
          </p>
        )}

        <button onClick={valider} disabled={isPending}
          style={{ width: "100%", marginTop: 22, padding: "15px", borderRadius: 13, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15, fontWeight: 700 }}>
          {isPending ? "Création…" : "Créer et continuer →"}
        </button>
      </div>
    </div>
  );
}