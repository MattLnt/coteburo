"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import TiptapEditor from "@/components/dashboard/TiptapEditor";
import { sauverRealisationComplete } from "../actions";

function uid() { return Math.random().toString(36).slice(2, 9); }

export function RealisationEditForm({ realisation, produitsDisponibles }) {
  const router = useRouter();

  const [recit, setRecit] = useState(realisation.recit || "");
  const [citationTexte, setCitationTexte] = useState(realisation.citationTexte || "");
  const [citationAuteur, setCitationAuteur] = useState(realisation.citationAuteur || "");
  const [citationPoste, setCitationPoste] = useState(realisation.citationPoste || "");
  const [galerie, setGalerie] = useState(realisation.galerie || []);
  const [avantImageUrl, setAvantImageUrl] = useState(realisation.avantImageUrl ? [realisation.avantImageUrl] : []);
  const [apresImageUrl, setApresImageUrl] = useState(realisation.apresImageUrl ? [realisation.apresImageUrl] : []);
  const [carnetChantier, setCarnetChantier] = useState(
    (realisation.carnetChantier || []).map((l) => ({ id: uid(), ...l }))
  );
  const [produitsLiesIds, setProduitsLiesIds] = useState((realisation.produitsLies || []).map((p) => p.id));
  const [rechercheProduit, setRechercheProduit] = useState("");

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [onglet, setOnglet] = useState("recit");

  const dirty = () => setSaved(false);

  const ajouterLigneCarnet = () => { setCarnetChantier((l) => [...l, { id: uid(), label: "", valeur: "" }]); dirty(); };
  const majLigneCarnet = (id, champ, val) => { setCarnetChantier((l) => l.map((x) => (x.id === id ? { ...x, [champ]: val } : x))); dirty(); };
  const supprimerLigneCarnet = (id) => { setCarnetChantier((l) => l.filter((x) => x.id !== id)); dirty(); };

  const toggleProduit = (id) => {
    setProduitsLiesIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    dirty();
  };

  const produitsFiltres = produitsDisponibles.filter((p) =>
    p.nom.toLowerCase().includes(rechercheProduit.toLowerCase()) ||
    p.gammeNom.toLowerCase().includes(rechercheProduit.toLowerCase())
  );

  const enregistrerTout = () => {
    setSaved(false);
    startTransition(async () => {
      await sauverRealisationComplete(realisation.id, {
        recit, citationTexte, citationAuteur, citationPoste,
        galerie,
        avantImageUrl: avantImageUrl[0] || null,
        apresImageUrl: apresImageUrl[0] || null,
        carnetChantier: carnetChantier
          .filter((l) => l.label.trim() || l.valeur.trim())
          .map(({ label, valeur }) => ({ label, valeur })),
        produitsLiesIds,
      });
      setSaved(true);
      router.refresh();
    });
  };

  const tabs = [
    ["recit", `Récit & citation${recit || citationTexte ? " ✓" : ""}`],
    ["galerie", `Galerie${galerie.length > 0 ? ` (${galerie.length})` : ""}`],
    ["avantapres", `Avant / Après${avantImageUrl[0] && apresImageUrl[0] ? " ✓" : ""}`],
    ["carnet", `Carnet de chantier${carnetChantier.length > 0 ? ` (${carnetChantier.length})` : ""}`],
    ["produits", `Produits liés${produitsLiesIds.length > 0 ? ` (${produitsLiesIds.length})` : ""}`],
  ];

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };
  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#23262a", margin: 0, letterSpacing: "-0.01em" }}>{realisation.titre}</h1>
        <p style={{ color: "#5c616a", marginTop: 6, fontSize: 14 }}>
          {[realisation.client, realisation.secteur, realisation.surface].filter(Boolean).join(" · ") || "Infos de base à compléter"}
        </p>
      </div>

      {/* Barre d'onglets */}
      <div style={{ display: "flex", gap: 4, background: "#f0ece4", padding: 4, borderRadius: 12, marginBottom: 20, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map(([val, lbl]) => (
          <button key={val} onClick={() => setOnglet(val)}
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: onglet === val ? "#fff" : "transparent", color: onglet === val ? "#f0661b" : "#5c616a",
              boxShadow: onglet === val ? "0 1px 3px rgba(0,0,0,0.06)" : "none", whiteSpace: "nowrap" }}>
            {lbl}
          </button>
        ))}
      </div>

      {onglet === "recit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={card}>
            <label style={label}>Récit du projet</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>Le texte principal affiché sur la fiche — présentez le contexte, la démarche, les choix faits.</p>
            <TiptapEditor value={recit} onChange={(html) => { setRecit(html); dirty(); }} />
          </div>

          <div style={card}>
            <label style={label}>Citation client</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>Affichée en encart dans le récit et en grand témoignage en bas de page.</p>
            <div style={{ marginBottom: 14 }}>
              <textarea value={citationTexte} onChange={(e) => { setCitationTexte(e.target.value); dirty(); }}
                placeholder="Ce qui nous a marqués, c'est la méthode..." rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <input value={citationAuteur} onChange={(e) => { setCitationAuteur(e.target.value); dirty(); }} placeholder="Nom" style={inputStyle} />
              <input value={citationPoste} onChange={(e) => { setCitationPoste(e.target.value); dirty(); }} placeholder="Poste, société" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {onglet === "galerie" && (
        <div style={card}>
          <label style={label}>Galerie photo</label>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>Plusieurs photos du projet réalisé.</p>
          <ImageUploader images={galerie} onChange={(imgs) => { setGalerie(imgs); dirty(); }} />
        </div>
      )}

      {onglet === "avantapres" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={card}>
            <label style={label}>Photo « Avant »</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>Optionnelle. La section n'apparaît sur le site que si les deux photos sont remplies.</p>
            <ImageUploader images={avantImageUrl} onChange={(imgs) => { setAvantImageUrl(imgs.slice(-1)); dirty(); }} />
          </div>
          <div style={card}>
            <label style={label}>Photo « Après »</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 14px" }}>Optionnelle.</p>
            <ImageUploader images={apresImageUrl} onChange={(imgs) => { setApresImageUrl(imgs.slice(-1)); dirty(); }} />
          </div>
        </div>
      )}

      {onglet === "carnet" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <label style={{ ...label, marginBottom: 4 }}>Carnet de chantier</label>
              <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>Lignes libres affichées dans l'encart latéral — délai, équipe, garantie...</p>
            </div>
            <button onClick={ajouterLigneCarnet} type="button"
              style={{ padding: "9px 16px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
              + Ajouter une ligne
            </button>
          </div>

          {carnetChantier.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12 }}>
              Aucune ligne. Ajoutez-en une.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {carnetChantier.map((l) => (
                <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 10, alignItems: "center" }}>
                  <input value={l.label} onChange={(e) => majLigneCarnet(l.id, "label", e.target.value)} placeholder="Livraison" style={inputStyle} />
                  <input value={l.valeur} onChange={(e) => majLigneCarnet(l.id, "valeur", e.target.value)} placeholder="4 jours" style={inputStyle} />
                  <button onClick={() => supprimerLigneCarnet(l.id)} title="Supprimer"
                    style={{ width: 40, height: 40, borderRadius: 9, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 15 }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onglet === "produits" && (
        <div style={card}>
          <label style={{ ...label, marginBottom: 4 }}>Produits liés</label>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>Le mobilier utilisé sur ce projet, affiché avec des liens vers le catalogue.</p>

          <input value={rechercheProduit} onChange={(e) => setRechercheProduit(e.target.value)}
            placeholder="Rechercher un produit ou une gamme…" style={{ ...inputStyle, marginBottom: 16 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
            {produitsFiltres.map((p) => {
              const actif = produitsLiesIds.includes(p.id);
              return (
                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: actif ? "#fef4ee" : "transparent", border: "1px solid " + (actif ? "#f0661b" : "transparent") }}>
                  <input type="checkbox" checked={actif} onChange={() => toggleProduit(p.id)} style={{ width: 17, height: 17, accentColor: "#f0661b", flexShrink: 0 }} />
                  <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "#f0ece4", flexShrink: 0 }}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a", margin: 0 }}>{p.nom}</p>
                    <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: 0 }}>{p.gammeNom}</p>
                  </div>
                </label>
              );
            })}
            {produitsFiltres.length === 0 && (
              <p style={{ fontSize: 13, color: "#9aa0a8", textAlign: "center", padding: 20 }}>Aucun produit ne correspond à cette recherche.</p>
            )}
          </div>
        </div>
      )}

      {/* Bouton unique, toujours visible */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 24, paddingTop: 20, borderTop: "1px solid #ece8e0" }}>
        {saved && <span style={{ fontSize: 13.5, color: "#1f7a52", fontWeight: 600 }}>✓ Tout est enregistré</span>}
        <button onClick={enregistrerTout} disabled={isPending}
          style={{ padding: "15px 32px", borderRadius: 14, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px -6px rgba(240,102,27,0.5)" }}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}