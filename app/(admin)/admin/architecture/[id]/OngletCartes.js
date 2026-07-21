"use client";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getVitrinesGamme,
  renommerVitrine,
  toggleVitrinePublication,
  toggleVitrineDevis,
  reordonnerVitrines,
  supprimerVitrine,
  creerVitrine,
} from "./actions";

export default function OngletCartes({ gammeId, gammeDevis = false }) {
  const router = useRouter();
  const [vitrines, setVitrines] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [isPending, startTransition] = useTransition();

  const [creationOuverte, setCreationOuverte] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauDevis, setNouveauDevis] = useState(true);
  const [erreurCreation, setErreurCreation] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);

  const charger = () => getVitrinesGamme(gammeId).then(setVitrines);
  useEffect(() => { charger(); }, [gammeId]);

  const startEdit = (v) => { setEditId(v.id); setEditNom(v.nom); };
  const validerNom = () => {
    const id = editId, nom = editNom;
    setVitrines((vs) => vs.map((v) => (v.id === id ? { ...v, nom } : v)));
    setEditId(null);
    startTransition(async () => { await renommerVitrine(id, nom); });
  };

  const togglePub = (v) => {
    setVitrines((vs) => vs.map((x) => (x.id === v.id ? { ...x, publie: !x.publie } : x)));
    startTransition(async () => { await toggleVitrinePublication(v.id, !v.publie); });
  };

  const toggleDevis = (v) => {
    if (gammeDevis) return;
    setVitrines((vs) => vs.map((x) => (x.id === v.id ? { ...x, venteSurDevis: !x.venteSurDevis } : x)));
    startTransition(async () => { await toggleVitrineDevis(v.id, !v.venteSurDevis); });
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= vitrines.length) return;
    const next = [...vitrines];
    [next[i], next[j]] = [next[j], next[i]];
    setVitrines(next);
    startTransition(async () => { await reordonnerVitrines(gammeId, next.map((v) => v.id)); });
  };

  const supprimer = (id) => {
    setVitrines((vs) => vs.filter((v) => v.id !== id));
    setConfirmDel(null);
    startTransition(async () => { await supprimerVitrine(id); router.refresh(); });
  };

  const validerCreation = async () => {
    setErreurCreation("");
    if (!nouveauNom.trim()) { setErreurCreation("Le nom est obligatoire."); return; }
    setCreationEnCours(true);
    const res = await creerVitrine(gammeId, { nom: nouveauNom, venteSurDevis: nouveauDevis });
    setCreationEnCours(false);
    if (!res.ok) { setErreurCreation(res.error || "Une erreur est survenue."); return; }
    router.push(`/admin/architecture/${gammeId}/carte/${res.id}`);
  };

  if (vitrines === null) {
    return <div style={{ padding: 40, textAlign: "center", color: "#9aa0a8" }}>Chargement…</div>;
  }

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" };
  const row = { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: "1px solid #f0ece4" };
  const input = { flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, color: "#5c616a", margin: 0, flex: 1 }}>
          Chaque produit est affiché comme une fiche distincte sur le site. Renomme, réordonne, choisis son mode de vente, et clique « Éditer » pour gérer son image et ses déclinaisons.
        </p>
        <button onClick={() => setCreationOuverte((o) => !o)}
          style={{ padding: "10px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
          + Nouveau produit
        </button>
      </div>

      {creationOuverte && (
        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <input autoFocus value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") validerCreation(); if (e.key === "Escape") setCreationOuverte(false); }}
              placeholder="Nom du produit (ex : Plan Droit)" style={input} />
            <div style={{ display: "flex", gap: 6, background: "#f0ece4", padding: 4, borderRadius: 10 }}>
              <button type="button" onClick={() => setNouveauDevis(true)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                  background: nouveauDevis ? "#fff" : "transparent", color: nouveauDevis ? "#b45528" : "#5c616a" }}>Sur devis</button>
              <button type="button" onClick={() => setNouveauDevis(false)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                  background: !nouveauDevis ? "#fff" : "transparent", color: !nouveauDevis ? "#1f7a52" : "#5c616a" }}>Boutique</button>
            </div>
          </div>
          {erreurCreation && <p style={{ fontSize: 12.5, color: "#c4735a", margin: "0 0 12px" }}>{erreurCreation}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={validerCreation} disabled={creationEnCours}
              style={{ padding: "9px 18px", borderRadius: 9, background: creationEnCours ? "#c98a5f" : "#23262a", color: "#fff", border: "none", cursor: creationEnCours ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>
              {creationEnCours ? "Création…" : "Créer le produit"}
            </button>
            <button onClick={() => setCreationOuverte(false)}
              style={{ padding: "9px 16px", borderRadius: 9, background: "#fff", color: "#5c616a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {gammeDevis && (
        <div style={{ background: "#fef4ee", border: "1px solid #f7d9c6", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#b45528" }}>
          ⓘ La gamme est réglée sur <strong>« Toute la gamme sur devis »</strong> : tous les produits sont forcés en devis. Désactive ce réglage dans l'onglet Infos pour choisir produit par produit.
        </div>
      )}

      <div style={card}>
        {vitrines.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#9aa0a8", fontSize: 14 }}>Aucun produit pour cette gamme.</div>
        )}

        {vitrines.map((v, i) => {
          const surDevis = gammeDevis || v.venteSurDevis;
          return (
            <div key={v.id} style={{ ...row, borderBottom: i === vitrines.length - 1 ? "none" : row.borderBottom }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Monter"
                  style={{ width: 24, height: 20, borderRadius: 6, border: "1px solid #ece8e0", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.35 : 1, fontSize: 11, lineHeight: 1 }}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === vitrines.length - 1} title="Descendre"
                  style={{ width: 24, height: 20, borderRadius: 6, border: "1px solid #ece8e0", background: "#fff", cursor: i === vitrines.length - 1 ? "default" : "pointer", opacity: i === vitrines.length - 1 ? 0.35 : 1, fontSize: 11, lineHeight: 1 }}>▼</button>
              </div>

              <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", background: "#f0ece4", flexShrink: 0, display: "grid", placeItems: "center" }}>
                {v.imageUrl ? <img src={v.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#c4c0b8", fontSize: 18 }}>🪑</span>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editId === v.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input autoFocus value={editNom} onChange={(e) => setEditNom(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") validerNom(); if (e.key === "Escape") setEditId(null); }}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 9, border: "1px solid #f0661b", background: "#fff", fontSize: 14, outline: "none" }} />
                    <button onClick={validerNom} style={{ padding: "8px 12px", borderRadius: 8, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>OK</button>
                    <button onClick={() => setEditId(null)} style={{ padding: "8px 10px", borderRadius: 8, background: "#fff", color: "#5c616a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13 }}>✕</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: 14.5, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.nom}>{v.nom}</p>
                      <button onClick={() => startEdit(v)} title="Renommer"
                        style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid #ece8e0", background: "#faf8f4", cursor: "pointer", fontSize: 11, color: "#5c616a" }}>✎</button>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#9aa0a8" }}>
                      {v.nbImages} image{v.nbImages > 1 ? "s" : ""}
                      {v.nbImages === 0 && <span style={{ color: "#d9861a" }}> · image manquante</span>}
                    </p>
                  </div>
                )}
              </div>

              <button onClick={() => toggleDevis(v)} disabled={gammeDevis}
                title={gammeDevis ? "Forcé par la gamme" : (surDevis ? "Passer en boutique (checkout)" : "Passer en devis")}
                style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  cursor: gammeDevis ? "not-allowed" : "pointer", border: "1px solid " + (surDevis ? "#e7c9b6" : "#cfe6da"),
                  background: gammeDevis ? "#f2efe9" : (surDevis ? "#fef4ee" : "#e8f6f0"),
                  color: gammeDevis ? "#b0aaa0" : (surDevis ? "#b45528" : "#1f7a52"),
                  opacity: gammeDevis ? 0.7 : 1, whiteSpace: "nowrap" }}>
                {surDevis ? "Sur devis" : "Boutique"}{gammeDevis ? " 🔒" : ""}
              </button>

              <button onClick={() => togglePub(v)} disabled={isPending} title={v.publie ? "Masquer" : "Publier"}
                style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                  background: v.publie ? "#eef1f6" : "#f0ece4", color: v.publie ? "#3a6ea5" : "#5c616a" }}>
                {v.publie ? "Visible" : "Masqué"}
              </button>

              <Link href={`/admin/architecture/${gammeId}/carte/${v.id}`}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#23262a", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                Éditer
              </Link>

              {confirmDel === v.id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => supprimer(v.id)} style={{ padding: "8px 12px", borderRadius: 8, background: "#d9551a", color: "#fff", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Confirmer</button>
                  <button onClick={() => setConfirmDel(null)} style={{ padding: "8px 10px", borderRadius: 8, background: "#fff", color: "#5c616a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 12.5 }}>Annuler</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(v.id)} title="Supprimer le produit"
                  style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 15 }}>🗑</button>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: "#9aa0a8", marginTop: 14 }}>
        « Sur devis » = fiche descriptive + demande de devis. « Boutique » = déclinaisons + panier. Supprimer un produit ne touche pas les autres.
      </p>
    </div>
  );
}