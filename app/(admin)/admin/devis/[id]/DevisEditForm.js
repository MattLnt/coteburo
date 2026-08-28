"use client";
import { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModalConfirmation from "@/components/dashboard/ModalConfirmation";
import { enregistrerDevis, changerStatutDevis, supprimerDevis, chargerCatalogueDevis, envoyerDevisAuClient } from "./actions";

const euro = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const euro0 = (v) => `${Math.round(Number(v || 0)).toLocaleString("fr-FR")} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const nb = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
// Recherche insensible aux accents et à la casse
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const STATUTS = {
  nouveau: { label: "Nouveau", bg: "#fce6d6", color: "#d9551a" },
  en_cours: { label: "En chiffrage", bg: "#e6eefc", color: "#2a5db0" },
  envoye: { label: "Envoyé", bg: "#f0ece4", color: "#5c616a" },
  accepte: { label: "Accepté", bg: "#e8f6f0", color: "#1f7a52" },
  refuse: { label: "Refusé", bg: "#fbe9e7", color: "#b3392f" },
  expire: { label: "Expiré", bg: "#f2efe9", color: "#9aa0a8" },
};

const champ = {
  width: "100%", padding: "9px 11px", borderRadius: 10, border: "1.5px solid #e8e3da",
  background: "#fff", fontSize: 12.5, color: "#23262a", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const mini = { fontSize: 10, color: "#9aa0a8", margin: "0 0 4px", display: "block" };

const urlProduit = (l) => {
  if (!l.categorieSlug || !l.slug) return null;
  return l.sousCategorieSlug
    ? `/${l.categorieSlug}/${l.sousCategorieSlug}/${l.slug}`
    : `/${l.categorieSlug}/${l.slug}`;
};

function Section({ titre, sousTitre, ouvertParDefaut, children }) {
  const [ouvert, setOuvert] = useState(!!ouvertParDefaut);
  return (
    <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
      <button type="button" onClick={() => setOuvert((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 15px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#23262a" }}>{titre}</span>
          {sousTitre && <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 2 }}>{sousTitre}</span>}
        </span>
        <span style={{ color: ouvert ? "#d9551a" : "#9aa0a8", display: "flex", flexShrink: 0, transform: ouvert ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      {ouvert && <div style={{ padding: "0 15px 15px", borderTop: "1px solid #f2efe9" }}>{children}</div>}
    </div>
  );
}

export default function DevisEditForm({ devis }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lignes, setLignes] = useState(devis.lignes.map((l) => ({ ...l, prixHT: String(l.prixHT), quantite: String(l.quantite) })));
  const [form, setForm] = useState({
    adresse: devis.adresse || "",
    complement: devis.complement || "",
    codePostal: devis.codePostal || "",
    ville: devis.ville || "",
    remiseType: devis.remiseType || "pourcentage",
    remiseValeur: String(devis.remiseValeur ?? 0),
    fraisLivraison: String(devis.fraisLivraison ?? 0),
    fraisInstallation: String(devis.fraisInstallation ?? 0),
    noteClient: devis.noteClient || "",
    noteInterne: devis.noteInterne || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "err", texte }
  // Confirmation en modale — remplace les confirm() natifs
  const [confirmation, setConfirmation] = useState(null); // { titre, message, label, ton, action }

  // Panneau d'ajout — catalogue chargé une seule fois, filtré côté navigateur
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [catalogue, setCatalogue] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [catId, setCatId] = useState(null);
  const [sousCatId, setSousCatId] = useState(null);
  const [produitOuvert, setProduitOuvert] = useState(null);
  const [declChoisie, setDeclChoisie] = useState(null);
  const [qteAjout, setQteAjout] = useState(1);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); setMessage(null); };
  const setLigne = (i, k, v) => {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
    setSaved(false); setMessage(null);
  };
  const supprimerLigne = (i) => { setLignes((ls) => ls.filter((_, j) => j !== i)); setSaved(false); setMessage(null); };
  const ajouterLigneLibre = () => {
    setLignes((ls) => [...ls, { id: `new-${Date.now()}`, designation: "", config: null, imageUrl: null, prixHT: "0", quantite: "1", codeRacine: null, vitrineId: null }]);
    setSaved(false); setMessage(null);
  };

  const ouvrirPanneau = async () => {
    setPanneauOuvert(true);
    if (!catalogue) setCatalogue(await chargerCatalogueDevis());
  };

  const fermerPanneau = () => {
    setPanneauOuvert(false);
    setProduitOuvert(null);
    setDeclChoisie(null);
    setQteAjout(1);
  };

  useEffect(() => {
    document.body.style.overflow = panneauOuvert ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panneauOuvert]);

  const produitsFiltres = useMemo(() => {
    if (!catalogue) return [];
    const q = norm(recherche.trim());
    return catalogue.produits.filter((p) => {
      if (catId && p.categorieId !== catId) return false;
      if (sousCatId && p.sousCategorieId !== sousCatId) return false;
      if (q && !norm(`${p.nom} ${p.gammeNom}`).includes(q)) return false;
      return true;
    });
  }, [catalogue, recherche, catId, sousCatId]);

  const catActive = catalogue?.categories.find((c) => c.id === catId) || null;

  const ouvrirProduit = (p) => {
    setProduitOuvert(p);
    setDeclChoisie(p.declinaisons.length > 0 ? p.declinaisons[0] : null);
    setQteAjout(1);
  };

  const confirmerAjout = () => {
    const p = produitOuvert;
    if (!p) return;
    const prix = declChoisie ? declChoisie.prixHT : (p.prixUnitaire ?? 0);
    setLignes((ls) => [...ls, {
      id: `new-${Date.now()}`,
      vitrineId: p.id,
      codeRacine: null,
      designation: p.nom,
      gammeNom: p.gammeNom,
      // La config affiche la déclinaison choisie ; les finitions seront
      // sélectionnées par le client au moment d'accepter le devis.
      config: declChoisie ? declChoisie.libelle : null,
      imageUrl: p.imageUrl,
      prixHT: String(prix),
      quantite: String(qteAjout),
      slug: p.slug,
      categorieSlug: p.categorieSlug,
      sousCategorieSlug: p.sousCategorieSlug,
    }]);
    setSaved(false);
    setMessage(null);
    fermerPanneau();
  };

  const totaux = useMemo(() => {
    const sousTotal = lignes.reduce((s, l) => s + nb(l.prixHT) * (parseInt(l.quantite, 10) || 0), 0);
    const remise = form.remiseType === "montant"
      ? Math.min(nb(form.remiseValeur), sousTotal)
      : sousTotal * (nb(form.remiseValeur) / 100);
    const totalHT = sousTotal - remise + nb(form.fraisLivraison) + nb(form.fraisInstallation);
    const totalTVA = totalHT * 0.2;
    return { sousTotal, remise, totalHT, totalTVA, totalTTC: totalHT + totalTVA };
  }, [lignes, form]);

  const enregistrer = async () => {
    setSaving(true);
    setMessage(null);
    const statut = devis.statut === "nouveau" ? "en_cours" : undefined;
    await enregistrerDevis(devis.id, { ...form, lignes, statut });
    setSaving(false);
    setSaved(true);
    router.refresh();
  };

  // L'envoi enregistre d'abord : sans ça, le PDF partirait avec les
  // anciennes valeurs si des modifications n'ont pas été sauvegardées.
  const lancerEnvoi = async () => {
    setConfirmation(null);
    setEnvoi(true);
    setMessage(null);
    await enregistrerDevis(devis.id, { ...form, lignes });
    const res = await envoyerDevisAuClient(devis.id);
    setEnvoi(false);
    if (res?.error) setMessage({ type: "err", texte: res.error });
    else setMessage({ type: "ok", texte: `Devis envoyé à ${devis.email}.` });
    router.refresh();
  };

  const envoyer = () => {
    if (lignes.length === 0) {
      setMessage({ type: "err", texte: "Ajoutez au moins une ligne avant d'envoyer." });
      return;
    }
    const dejaEnvoye = ["envoye", "accepte", "refuse"].includes(devis.statut);
    setConfirmation({
      titre: dejaEnvoye ? "Renvoyer ce devis ?" : "Envoyer ce devis ?",
      message: dejaEnvoye
        ? `Une nouvelle version sera envoyée à ${devis.email}, avec une date de validité remise à zéro.`
        : `Le devis et son PDF seront envoyés à ${devis.email}.`,
      label: dejaEnvoye ? "Renvoyer" : "Envoyer",
      ton: "normal",
      action: lancerEnvoi,
    });
  };

  const changerStatut = (statut) => {
    startTransition(async () => { await changerStatutDevis(devis.id, statut); router.refresh(); });
  };

  const supprimer = () => {
    setConfirmation({
      titre: "Supprimer ce devis ?",
      message: "Cette action est définitive. Le devis et toutes ses lignes seront perdus.",
      label: "Supprimer",
      ton: "danger",
      action: () => {
        setConfirmation(null);
        startTransition(async () => { await supprimerDevis(devis.id); router.push("/admin/devis"); });
      },
    });
  };

  const s = STATUTS[devis.statut] || STATUTS.nouveau;
  const infosProjet = [devis.typeProjet, devis.surface, devis.delai, devis.budget].filter(Boolean);
  const telLink = devis.telephone ? `tel:${devis.telephone.replace(/\s/g, "")}` : null;
  const prixAjout = declChoisie ? declChoisie.prixHT : (produitOuvert?.prixUnitaire ?? 0);
  const dejaEnvoye = ["envoye", "accepte", "refuse"].includes(devis.statut);

  return (
    <div style={{ paddingBottom: 140 }}>
      <style>{`
        .dv-barre { position: fixed; bottom: 0; left: 0; right: 0; }
        .dv-panneau { margin-top: auto; border-radius: 22px 22px 0 0; max-height: 88dvh; width: 100%; }
        .dv-scroll-x { overflow-x: auto; scrollbar-width: none; }
        .dv-scroll-x::-webkit-scrollbar { display: none; }
        @media (min-width: 1024px) {
          .dv-barre { position: sticky; bottom: 20px; left: auto; right: auto; }
          .dv-panneau { margin: auto; border-radius: 22px; max-height: 80vh; width: 560px; }
        }
      `}</style>

      <Link href="/admin/devis" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#f0661b", textDecoration: "none", marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg>
        Devis
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 3 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "#23262a", margin: 0 }}>{devis.numero}</h1>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
      </div>
      <p style={{ fontSize: 12, color: "#5c616a", margin: "0 0 14px" }}>
        Reçu le {dateFR(devis.createdAt)}
        {devis.dateEnvoi ? ` · Envoyé le ${dateFR(devis.dateEnvoi)}` : ""}
        {devis.dateValidite ? ` · Valable jusqu'au ${dateFR(devis.dateValidite)}` : ""}
      </p>

      <Section titre="Client & projet" ouvertParDefaut>
        <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
          <span style={{ color: "#9aa0a8", flexShrink: 0, marginTop: 2, display: "flex" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
          </span>
          <p style={{ fontSize: 12.5, color: "#23262a", margin: 0, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700 }}>{devis.prenom} {devis.nom}</span>
            {devis.societe && <><br />{devis.societe}</>}
            <br />{devis.email}{devis.telephone ? ` · ${devis.telephone}` : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {telLink && (
            <a href={telLink} style={{ flex: 1, textAlign: "center", padding: 9, borderRadius: 999, background: "#f0661b", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Appeler</a>
          )}
          <a href={`mailto:${devis.email}?subject=Votre devis ${devis.numero}`} style={{ flex: 1, textAlign: "center", padding: 9, borderRadius: 999, border: "1px solid #ece8e0", color: "#23262a", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Écrire</a>
        </div>

        {(infosProjet.length > 0 || devis.message) && (
          <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid #f2efe9" }}>
            {infosProjet.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: devis.message ? 9 : 0 }}>
                {infosProjet.map((t) => (
                  <span key={t} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 999, background: "#f4f2ed", color: "#5c616a" }}>{t}</span>
                ))}
              </div>
            )}
            {devis.message && (
              <p style={{ fontSize: 12, color: "#5c616a", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>« {devis.message} »</p>
            )}
          </div>
        )}
      </Section>

      <Section titre="Adresse de livraison" sousTitre={devis.adresse ? `${devis.codePostal || ""} ${devis.ville || ""}`.trim() : "Non renseignée"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div>
            <label style={mini}>Adresse</label>
            <input style={champ} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="N° et nom de rue" />
          </div>
          <div>
            <label style={mini}>Complément</label>
            <input style={champ} value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Bâtiment, étage…" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 110 }}>
              <label style={mini}>Code postal</label>
              <input style={champ} value={form.codePostal} onChange={(e) => set("codePostal", e.target.value)} inputMode="numeric" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={mini}>Ville</label>
              <input style={champ} value={form.ville} onChange={(e) => set("ville", e.target.value)} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Lignes ── */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 14, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: 0 }}>Lignes du devis</p>
          <span style={{ fontSize: 11.5, color: "#9aa0a8" }}>{lignes.length} ligne{lignes.length > 1 ? "s" : ""}</span>
        </div>

        {lignes.length === 0 && (
          <p style={{ fontSize: 12.5, color: "#9aa0a8", textAlign: "center", padding: "16px 0", margin: 0 }}>Aucune ligne — ajoutez un produit ci-dessous.</p>
        )}

        {lignes.map((l, i) => {
          const totalLigne = nb(l.prixHT) * (parseInt(l.quantite, 10) || 0);
          const estCatalogue = !!(l.codeRacine || l.vitrineId);
          const lien = urlProduit(l);
          return (
            <div key={l.id} style={{ border: "1px solid #ece8e0", borderRadius: 12, padding: 11, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 9, background: "#f4f2ed", flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
                  {l.imageUrl ? (
                    <img src={l.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4c0b6" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {estCatalogue ? (
                    <>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a", margin: 0, lineHeight: 1.3 }}>{l.designation}</p>
                      {l.config && <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: "2px 0 0", lineHeight: 1.4 }}>{l.config}</p>}
                      {lien && (
                        <a href={lien} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color: "#f0661b", textDecoration: "none", marginTop: 4 }}>
                          Voir la fiche
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 17 17 7M7 7h10v10" /></svg>
                        </a>
                      )}
                    </>
                  ) : (
                    <input style={{ ...champ, padding: "7px 10px", fontSize: 12 }} value={l.designation} onChange={(e) => setLigne(i, "designation", e.target.value)} placeholder="Désignation (prestation, transport…)" />
                  )}
                </div>
                <button onClick={() => supprimerLigne(i)} title="Retirer"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#c4735a", flexShrink: 0, padding: 0, display: "flex", alignItems: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
                </button>
              </div>

              <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
                <div style={{ width: 62 }}>
                  <label style={mini}>Qté</label>
                  <input style={{ ...champ, padding: "8px 10px" }} value={l.quantite} onChange={(e) => setLigne(i, "quantite", e.target.value)} inputMode="numeric" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={mini}>Prix unitaire HT</label>
                  <input style={{ ...champ, padding: "8px 10px" }} value={l.prixHT} onChange={(e) => setLigne(i, "prixHT", e.target.value)} inputMode="decimal" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#23262a", margin: 0, paddingBottom: 9, whiteSpace: "nowrap", minWidth: 78, textAlign: "right" }}>{euro(totalLigne)}</p>
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={ouvrirPanneau} type="button"
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: "#23262a", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
            + Ajouter un produit
          </button>
          <button onClick={ajouterLigneLibre} type="button"
            style={{ padding: "11px 16px", borderRadius: 10, border: "1.5px dashed #e8e3da", background: "#faf8f4", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#5c616a", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Ligne libre
          </button>
        </div>
      </div>

      {/* ── Remise & frais ── */}
      <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 14, marginBottom: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: "0 0 12px" }}>Remise & frais</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={mini}>Remise</label>
            <div style={{ display: "flex", gap: 5 }}>
              <input style={{ ...champ, flex: 1, minWidth: 0 }} value={form.remiseValeur} onChange={(e) => set("remiseValeur", e.target.value)} inputMode="decimal" />
              <div style={{ display: "flex", border: "1.5px solid #e8e3da", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                {[["pourcentage", "%"], ["montant", "€"]].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => set("remiseType", val)}
                    style={{ width: 28, background: form.remiseType === val ? "#f0661b" : "#fff", color: form.remiseType === val ? "#fff" : "#9aa0a8", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={mini}>Livraison €</label>
            <input style={champ} value={form.fraisLivraison} onChange={(e) => set("fraisLivraison", e.target.value)} inputMode="decimal" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={mini}>Installation €</label>
            <input style={champ} value={form.fraisInstallation} onChange={(e) => set("fraisInstallation", e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div style={{ paddingTop: 12, borderTop: "1px solid #f2efe9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
            <span style={{ color: "#9aa0a8" }}>Sous-total HT</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(totaux.sousTotal)}</span>
          </div>
          {totaux.remise > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
              <span style={{ color: "#9aa0a8" }}>Remise {form.remiseType === "pourcentage" ? `${nb(form.remiseValeur)} %` : ""}</span>
              <span style={{ color: "#d9551a", fontWeight: 600 }}>− {euro(totaux.remise)}</span>
            </div>
          )}
          {nb(form.fraisLivraison) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
              <span style={{ color: "#9aa0a8" }}>Livraison</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(nb(form.fraisLivraison))}</span>
            </div>
          )}
          {nb(form.fraisInstallation) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
              <span style={{ color: "#9aa0a8" }}>Installation</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(nb(form.fraisInstallation))}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 10 }}>
            <span style={{ color: "#9aa0a8" }}>TVA (20 %)</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(totaux.totalTVA)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f2efe9" }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#23262a" }}>Total TTC</span>
            <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "var(--font-display)", color: "#f0661b" }}>{euro(totaux.totalTTC)}</span>
          </div>
        </div>
      </div>

      <Section titre="Mot d'accompagnement" sousTitre="Visible par le client sur son devis">
        <textarea style={{ ...champ, minHeight: 90, resize: "vertical", lineHeight: 1.6, marginTop: 12 }}
          value={form.noteClient} onChange={(e) => set("noteClient", e.target.value)}
          placeholder="Bonjour, suite à notre échange, voici notre proposition pour l'aménagement de vos bureaux…" />
      </Section>

      <Section titre="Note interne" sousTitre="Jamais visible par le client">
        <textarea style={{ ...champ, minHeight: 70, resize: "vertical", lineHeight: 1.6, marginTop: 12 }}
          value={form.noteInterne} onChange={(e) => set("noteInterne", e.target.value)}
          placeholder="Remarques, points à vérifier, historique des échanges…" />
      </Section>

      <Section titre="Statut du devis" sousTitre={s.label}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
          {Object.entries(STATUTS).map(([cle, st]) => {
            const actif = devis.statut === cle;
            return (
              <button key={cle} onClick={() => changerStatut(cle)} disabled={isPending || actif}
                style={{
                  padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: actif ? "default" : "pointer",
                  fontFamily: "inherit", border: actif ? `1.5px solid ${st.color}` : "1px solid #ece8e0",
                  background: actif ? st.bg : "#fff", color: actif ? st.color : "#5c616a",
                }}>
                {st.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <a href={`/api/devis/${devis.id}/pdf`} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#23262a", textDecoration: "none", padding: "8px 14px", borderRadius: 999, border: "1px solid #ece8e0" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            Aperçu du PDF
          </a>
          {dejaEnvoye && (
            <a href={`/mon-devis/${devis.token}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#23262a", textDecoration: "none", padding: "8px 14px", borderRadius: 999, border: "1px solid #ece8e0" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M7 7h10v10" /></svg>
              Page du client
            </a>
          )}
        </div>

        <button onClick={supprimer} disabled={isPending}
          style={{ display: "block", marginTop: 14, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#c4735a", fontFamily: "inherit", padding: 0 }}>
          Supprimer ce devis
        </button>
      </Section>

      {/* ── Barre d'action ── */}
      <div className="dv-barre" style={{ zIndex: 40 }}>
        <div style={{
          background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)",
          borderTop: "1px solid #ece8e0", padding: "12px 14px",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}>
          {message && (
            <p style={{
              fontSize: 12, margin: "0 0 10px", padding: "8px 11px", borderRadius: 9, lineHeight: 1.5,
              background: message.type === "ok" ? "#e8f6f0" : "#fce6d6",
              color: message.type === "ok" ? "#1f7a52" : "#d9551a",
            }}>
              {message.texte}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Total TTC</p>
              <p style={{ fontSize: 19, fontWeight: 700, fontFamily: "var(--font-display)", color: "#23262a", margin: "1px 0 0" }}>{euro(totaux.totalTTC)}</p>
            </div>
            {saved && <span style={{ fontSize: 11, color: "#1f7a52", fontWeight: 600 }}>✓ Enregistré</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={enregistrer} disabled={saving || envoi}
              style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid #ece8e0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#23262a", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, opacity: saving || envoi ? 0.6 : 1 }}>
              {saving ? "…" : "Enregistrer"}
            </button>
            <button onClick={envoyer} disabled={envoi || saving || lignes.length === 0}
              style={{
                flex: 1, padding: 12, borderRadius: 999, background: "#f0661b", color: "#fff", border: "none",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                cursor: envoi || lignes.length === 0 ? "not-allowed" : "pointer",
                opacity: envoi || lignes.length === 0 ? 0.5 : 1,
              }}>
              {envoi ? "Envoi en cours…" : dejaEnvoye ? "Renvoyer au client" : "Envoyer au client"}
            </button>
          </div>
        </div>
      </div>

      {/* ══ Panneau d'ajout ══ */}
      {panneauOuvert && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", flexDirection: "column", padding: 0 }}>
          <div onClick={fermerPanneau} style={{ position: "absolute", inset: 0, background: "rgba(33,36,40,0.5)" }} />

          <div className="dv-panneau" style={{ position: "relative", display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>

            {produitOuvert ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "15px 16px 13px", borderBottom: "1px solid #f2efe9", flexShrink: 0 }}>
                  <button onClick={() => setProduitOuvert(null)}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, minWidth: 0 }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#f7f4ef", display: "grid", placeItems: "center", color: "#23262a", flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#23262a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{produitOuvert.nom}</span>
                  </button>
                  <button onClick={fermerPanneau}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: "#f7f4ef", display: "grid", placeItems: "center", border: "none", cursor: "pointer", color: "#5c616a", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                <div style={{ padding: "14px 16px", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 12, background: "#f4f2ed", flexShrink: 0, overflow: "hidden" }}>
                      {produitOuvert.imageUrl && <img src={produitOuvert.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f0661b", margin: 0 }}>{produitOuvert.gammeNom}</p>
                      <p style={{ fontSize: 11.5, color: "#5c616a", margin: "4px 0 0" }}>
                        {[produitOuvert.categorieNom, produitOuvert.sousCategorieNom].filter(Boolean).join(" · ")}
                      </p>
                      {urlProduit(produitOuvert) && (
                        <a href={urlProduit(produitOuvert)} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color: "#f0661b", textDecoration: "none", marginTop: 5 }}>
                          Voir la fiche
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 17 17 7M7 7h10v10" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
                  {produitOuvert.declinaisons.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "#5c616a", padding: "10px 14px", borderRadius: 12, background: "#faf8f4", margin: 0 }}>
                      Produit à prix unique — {euro0(produitOuvert.prixUnitaire || 0)}
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 11px", lineHeight: 1.5 }}>
                        Choisissez la déclinaison — les finitions seront sélectionnées par le client.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {produitOuvert.declinaisons.map((d) => {
                          const actif = declChoisie?.id === d.id;
                          return (
                            <button key={d.id} onClick={() => setDeclChoisie(d)}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                padding: "13px 15px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                                border: actif ? "1.5px solid #f0661b" : "1px solid #ece8e0",
                                background: actif ? "#fce6d6" : "#fff",
                              }}>
                              <span style={{ fontSize: 13.5, color: actif ? "#d9551a" : "#23262a", fontWeight: actif ? 700 : 400, minWidth: 0 }}>{d.libelle}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: actif ? "#d9551a" : "#23262a", whiteSpace: "nowrap" }}>{euro0(d.prixHT)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ flexShrink: 0, padding: "14px 16px", borderTop: "1px solid #f2efe9", paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#9aa0a8" }}>Quantité</span>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #ece8e0", borderRadius: 999, marginLeft: "auto" }}>
                      <button onClick={() => setQteAjout((q) => Math.max(1, q - 1))}
                        style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", color: "#5c616a", fontSize: 15 }}>−</button>
                      <span style={{ width: 26, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{qteAjout}</span>
                      <button onClick={() => setQteAjout((q) => q + 1)}
                        style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", color: "#5c616a", fontSize: 15 }}>+</button>
                    </div>
                  </div>
                  <button onClick={confirmerAjout}
                    style={{ width: "100%", padding: 13, borderRadius: 999, background: "#f0661b", color: "#fff", border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Ajouter au devis · {euro0(prixAjout * qteAjout)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "15px 16px 13px", flexShrink: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15.5, fontWeight: 700, color: "#23262a", margin: 0 }}>Ajouter un produit</p>
                    <p style={{ fontSize: 11, color: "#9aa0a8", margin: "2px 0 0" }}>
                      {catalogue ? `${catalogue.produits.length} produits au catalogue` : "Chargement…"}
                    </p>
                  </div>
                  <button onClick={fermerPanneau}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: "#f7f4ef", display: "grid", placeItems: "center", border: "none", cursor: "pointer", color: "#5c616a", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9aa0a8", display: "flex" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                    </span>
                    <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom du produit…"
                      style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: 12, border: "none", background: "#f7f4ef", fontSize: 13, color: "#23262a", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>
                </div>

                {catalogue && catalogue.categories.length > 0 && (
                  <div className="dv-scroll-x" style={{ display: "flex", gap: 6, padding: "0 16px 10px", flexShrink: 0 }}>
                    <button onClick={() => { setCatId(null); setSousCatId(null); }}
                      style={{
                        padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: catId === null ? 700 : 400,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                        background: catId === null ? "#23262a" : "#fff", color: catId === null ? "#fff" : "#5c616a",
                        border: catId === null ? "1px solid #23262a" : "1px solid #ece8e0",
                      }}>
                      Tout
                    </button>
                    {catalogue.categories.map((c) => {
                      const actif = catId === c.id;
                      return (
                        <button key={c.id} onClick={() => { setCatId(actif ? null : c.id); setSousCatId(null); }}
                          style={{
                            padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: actif ? 700 : 400,
                            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                            background: actif ? "#23262a" : "#fff", color: actif ? "#fff" : "#5c616a",
                            border: actif ? "1px solid #23262a" : "1px solid #ece8e0",
                          }}>
                          {c.nom}
                        </button>
                      );
                    })}
                  </div>
                )}

                {catActive && catActive.sousCategories.length > 0 && (
                  <div className="dv-scroll-x" style={{ display: "flex", gap: 6, padding: "0 16px 12px", flexShrink: 0 }}>
                    <div style={{ borderLeft: "2px solid #fce6d6", paddingLeft: 10, display: "flex", gap: 6 }}>
                      {catActive.sousCategories.map((sc) => {
                        const actif = sousCatId === sc.id;
                        return (
                          <button key={sc.id} onClick={() => setSousCatId(actif ? null : sc.id)}
                            style={{
                              padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: actif ? 700 : 400,
                              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, border: "none",
                              background: actif ? "#fce6d6" : "#faf8f4", color: actif ? "#d9551a" : "#5c616a",
                            }}>
                            {sc.nom}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
                  {!catalogue && <p style={{ fontSize: 12.5, color: "#9aa0a8", textAlign: "center", padding: "24px 0" }}>Chargement du catalogue…</p>}

                  {catalogue && (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#b0aca2", margin: "0 0 9px" }}>
                        {produitsFiltres.length} produit{produitsFiltres.length > 1 ? "s" : ""}
                      </p>

                      {produitsFiltres.length === 0 && (
                        <p style={{ fontSize: 12.5, color: "#9aa0a8", textAlign: "center", padding: "20px 0" }}>Aucun produit ne correspond.</p>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {produitsFiltres.map((p) => (
                          <button key={p.id} onClick={() => ouvrirProduit(p)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: 10, borderRadius: 12, border: "none", background: "#faf8f4", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                            <div style={{ width: 46, height: 46, borderRadius: 10, background: "#f0ece4", flexShrink: 0, overflow: "hidden" }}>
                              {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#23262a", margin: 0, lineHeight: 1.3 }}>{p.nom}</p>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                                <span style={{ fontSize: 10.5, color: "#9aa0a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.gammeNom}</span>
                                {p.prixMini != null && (
                                  <>
                                    <span style={{ width: 2, height: 2, borderRadius: "50%", background: "#d3d1c7", flexShrink: 0 }} />
                                    <span style={{ fontSize: 10.5, color: "#d9551a", fontWeight: 700, whiteSpace: "nowrap" }}>dès {euro0(p.prixMini)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span style={{ color: "#c4c0b6", display: "flex", flexShrink: 0 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 18 6-6-6-6" /></svg>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ModalConfirmation
        ouvert={!!confirmation}
        titre={confirmation?.titre}
        message={confirmation?.message}
        labelConfirmer={confirmation?.label}
        ton={confirmation?.ton}
        chargement={envoi}
        onConfirmer={() => confirmation?.action?.()}
        onAnnuler={() => setConfirmation(null)}
      />
    </div>
  );
}