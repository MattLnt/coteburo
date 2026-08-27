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
  const [menuOuvert, setMenuOuvert] = useState(false);

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

  // Chaque onglet porte un libellé long (desktop), un libellé court (menu mobile)
  // et un compteur affiché à droite dans le menu.
  const tabs = [
    { val: "recit", labelLong: `Récit & citation${recit || citationTexte ? " ✓" : ""}`, labelCourt: "Récit & citation", compteur: (recit || citationTexte) ? "✓" : null },
    { val: "galerie", labelLong: `Galerie${galerie.length > 0 ? ` (${galerie.length})` : ""}`, labelCourt: "Galerie", compteur: galerie.length || null },
    { val: "avantapres", labelLong: `Avant / Après${avantImageUrl[0] && apresImageUrl[0] ? " ✓" : ""}`, labelCourt: "Avant / Après", compteur: (avantImageUrl[0] && apresImageUrl[0]) ? "✓" : null },
    { val: "carnet", labelLong: `Carnet de chantier${carnetChantier.length > 0 ? ` (${carnetChantier.length})` : ""}`, labelCourt: "Carnet de chantier", compteur: carnetChantier.length || null },
    { val: "produits", labelLong: `Produits liés${produitsLiesIds.length > 0 ? ` (${produitsLiesIds.length})` : ""}`, labelCourt: "Produits liés", compteur: produitsLiesIds.length || null },
  ];

  const ongletCourant = tabs.find((t) => t.val === onglet) || tabs[0];
  const indexCourant = tabs.findIndex((t) => t.val === onglet) + 1;

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };
  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18 };
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <style>{`
        /* Mobile : menu déroulant de sections, avant/après empilés, carnet sur 2 lignes.
           Desktop : barre d'onglets et grilles côte à côte. */
        .rd-menu-mobile { display: block; }
        .rd-onglets-desktop { display: none; }
        .rd-avantapres { display: flex; flex-direction: column; gap: 12px; }
        .rd-citation-duo { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .rd-carnet-ligne { display: grid; grid-template-columns: 1fr 40px; gap: 8px; align-items: center; }
        .rd-carnet-valeur { grid-column: 1 / 2; }
        .rd-carnet-entete { display: block; }
        .rd-titre { font-size: 20px; }
        @media (min-width: 1024px) {
          .rd-menu-mobile { display: none; }
          .rd-onglets-desktop { display: flex; }
          .rd-avantapres { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .rd-citation-duo { grid-template-columns: 1fr 1fr; gap: 14px; }
          .rd-carnet-ligne { grid-template-columns: 1fr 1fr 40px; gap: 10px; }
          .rd-carnet-valeur { grid-column: auto; }
          .rd-carnet-entete { display: flex; align-items: center; justify-content: space-between; }
          .rd-titre { font-size: 26px; }
        }
      `}</style>

      <div style={{ marginBottom: 18 }}>
        <h1 className="rd-titre" style={{ fontWeight: 800, color: "#23262a", margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{realisation.titre}</h1>
        <p style={{ color: "#5c616a", marginTop: 6, fontSize: 13.5 }}>
          {[realisation.client, realisation.secteur, realisation.surface].filter(Boolean).join(" · ") || "Infos de base à compléter"}
        </p>
      </div>

      {/* ── Menu de sections (mobile) ── */}
      <div className="rd-menu-mobile" style={{
        border: "1px solid " + (menuOuvert ? "#f0c4a0" : "#ece8e0"),
        borderRadius: 12, background: "#fff", marginBottom: 16, overflow: "hidden",
      }}>
        <button
          type="button"
          onClick={() => setMenuOuvert((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}
        >
          <span>
            <span style={{ display: "block", fontSize: 10, color: "#9aa0a8" }}>Section {indexCourant} / {tabs.length}</span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#23262a", marginTop: 1 }}>{ongletCourant.labelCourt}</span>
          </span>
          <span style={{ color: menuOuvert ? "#d9551a" : "#9aa0a8", display: "flex", transform: menuOuvert ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </button>

        {menuOuvert && (
          <div style={{ borderTop: "1px solid #f2efe9", padding: 6 }}>
            {tabs.map((t) => {
              const actif = t.val === onglet;
              return (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => { setOnglet(t.val); setMenuOuvert(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "10px 12px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    background: actif ? "#fce6d6" : "transparent",
                    color: actif ? "#d9551a" : "#5c616a",
                    fontSize: 13, fontWeight: actif ? 700 : 500,
                  }}
                >
                  <span>{t.labelCourt}</span>
                  {t.compteur != null && (
                    <span style={{ fontSize: 11.5, color: actif ? "#d9551a" : "#9aa0a8", fontWeight: 600, flexShrink: 0 }}>{t.compteur}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Onglets (desktop) ── */}
      <div className="rd-onglets-desktop" style={{ gap: 4, background: "#f0ece4", padding: 4, borderRadius: 12, marginBottom: 20, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.val} onClick={() => setOnglet(t.val)}
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: onglet === t.val ? "#fff" : "transparent", color: onglet === t.val ? "#f0661b" : "#5c616a",
              boxShadow: onglet === t.val ? "0 1px 3px rgba(0,0,0,0.06)" : "none", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {t.labelLong}
          </button>
        ))}
      </div>

      {onglet === "recit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <label style={label}>Récit du projet</label>
            <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 14px", lineHeight: 1.5 }}>Le texte principal affiché sur la fiche — présentez le contexte, la démarche, les choix faits.</p>
            <TiptapEditor value={recit} onChange={(html) => { setRecit(html); dirty(); }} />
          </div>

          <div style={card}>
            <label style={label}>Citation client</label>
            <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 14px", lineHeight: 1.5 }}>Affichée en encart dans le récit et en grand témoignage en bas de page.</p>
            <div style={{ marginBottom: 12 }}>
              <textarea value={citationTexte} onChange={(e) => { setCitationTexte(e.target.value); dirty(); }}
                placeholder="Ce qui nous a marqués, c'est la méthode..." rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>
            <div className="rd-citation-duo">
              <input value={citationAuteur} onChange={(e) => { setCitationAuteur(e.target.value); dirty(); }} placeholder="Nom" style={inputStyle} />
              <input value={citationPoste} onChange={(e) => { setCitationPoste(e.target.value); dirty(); }} placeholder="Poste, société" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {onglet === "galerie" && (
        <div style={card}>
          <label style={label}>Galerie photo</label>
          <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 14px", lineHeight: 1.5 }}>Plusieurs photos du projet réalisé.</p>
          <ImageUploader images={galerie} onChange={(imgs) => { setGalerie(imgs); dirty(); }} />
        </div>
      )}

      {onglet === "avantapres" && (
        <div className="rd-avantapres">
          <div style={card}>
            <label style={label}>Photo « Avant »</label>
            <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 14px", lineHeight: 1.5 }}>Optionnelle. La section n'apparaît sur le site que si les deux photos sont remplies.</p>
            <ImageUploader images={avantImageUrl} onChange={(imgs) => { setAvantImageUrl(imgs.slice(-1)); dirty(); }} />
          </div>
          <div style={card}>
            <label style={label}>Photo « Après »</label>
            <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 14px", lineHeight: 1.5 }}>Optionnelle.</p>
            <ImageUploader images={apresImageUrl} onChange={(imgs) => { setApresImageUrl(imgs.slice(-1)); dirty(); }} />
          </div>
        </div>
      )}

      {onglet === "carnet" && (
        <div style={card}>
          <div className="rd-carnet-entete" style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...label, marginBottom: 4 }}>Carnet de chantier</label>
              <p style={{ fontSize: 12, color: "#9aa0a8", margin: 0, lineHeight: 1.5 }}>Lignes libres affichées dans l'encart latéral — délai, équipe, garantie…</p>
            </div>
            <button onClick={ajouterLigneCarnet} type="button"
              style={{ padding: "10px 16px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
              + Ajouter une ligne
            </button>
          </div>

          {carnetChantier.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9aa0a8", fontSize: 13, border: "1px dashed #e8e3da", borderRadius: 12 }}>
              Aucune ligne. Ajoutez-en une.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {carnetChantier.map((l) => (
                <div key={l.id} className="rd-carnet-ligne">
                  <input value={l.label} onChange={(e) => majLigneCarnet(l.id, "label", e.target.value)} placeholder="Livraison" style={inputStyle} />
                  <input className="rd-carnet-valeur" value={l.valeur} onChange={(e) => majLigneCarnet(l.id, "valeur", e.target.value)} placeholder="4 jours" style={inputStyle} />
                  <button onClick={() => supprimerLigneCarnet(l.id)} title="Supprimer"
                    style={{ width: 40, height: 40, borderRadius: 9, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 15, gridRow: 1, gridColumn: -1 }}>
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
          <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 14px", lineHeight: 1.5 }}>Le mobilier utilisé sur ce projet, affiché avec des liens vers le catalogue.</p>

          <input value={rechercheProduit} onChange={(e) => setRechercheProduit(e.target.value)}
            placeholder="Rechercher un produit ou une gamme…" style={{ ...inputStyle, marginBottom: 14 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
            {produitsFiltres.map((p) => {
              const actif = produitsLiesIds.includes(p.id);
              return (
                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: actif ? "#fef4ee" : "transparent", border: "1px solid " + (actif ? "#f0661b" : "#f2efe9") }}>
                  <input type="checkbox" checked={actif} onChange={() => toggleProduit(p.id)} style={{ width: 17, height: 17, accentColor: "#f0661b", flexShrink: 0 }} />
                  <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "#f0ece4", flexShrink: 0 }}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</p>
                    <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.gammeNom}</p>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 20, paddingTop: 18, borderTop: "1px solid #ece8e0", flexWrap: "wrap" }}>
        {saved && <span style={{ fontSize: 13.5, color: "#1f7a52", fontWeight: 600 }}>✓ Tout est enregistré</span>}
        <button onClick={enregistrerTout} disabled={isPending}
          style={{ flex: "1 1 auto", maxWidth: 300, padding: "14px 32px", borderRadius: 14, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px -6px rgba(240,102,27,0.5)", fontFamily: "inherit" }}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}