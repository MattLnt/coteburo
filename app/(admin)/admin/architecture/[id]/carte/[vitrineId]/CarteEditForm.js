"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import TiptapEditor from "@/components/dashboard/TiptapEditor";
import SelecteurOptions from "@/components/dashboard/SelecteurOptions";
import SectionsDescriptives from "./SectionsDescriptives";
import DeclinaisonsBoutique from "./DeclinaisonsBoutique";
import FinitionsProduit from "./FinitionsProduit";
import PrixProduit from "./PrixProduit";
import { sauverCarteComplete } from "./actions";

export default function CarteEditForm({ carte }) {
  const router = useRouter();

  const [nom, setNom] = useState(carte.nom);
  const [descriptif, setDescriptif] = useState(carte.descriptif || "");
  // Une seule liste de photos — la première sert automatiquement de vignette partout
  // (catalogue, recherche, carrousels), les suivantes forment la galerie de la fiche produit.
  const [galerie, setGalerie] = useState(
    carte.images?.length ? carte.images : (carte.imageUrl ? [carte.imageUrl] : [])
  );
  const [categorieId, setCategorieId] = useState(carte.categorieId || "");
  const [sousCategorieId, setSousCategorieId] = useState(carte.sousCategorieId || "");
  const [bestSeller, setBestSeller] = useState(!!carte.bestSeller);
  const [promoPct, setPromoPct] = useState(carte.promoPct ?? "");
  const [promoDebut, setPromoDebut] = useState(carte.promoDebut || "");
  const [promoFin, setPromoFin] = useState(carte.promoFin || "");
  const [venteSurDevis, setVenteSurDevis] = useState(!!carte.venteSurDevis);

  const [sectionsDevis, setSectionsDevis] = useState(carte.sectionsDevis || []);
  const [prixAPartir, setPrixAPartir] = useState(carte.prixAPartir ?? "");

  const [axesDeclinaisons, setAxesDeclinaisons] = useState(carte.axesDeclinaisons || []);
  const [declinaisonsLignes, setDeclinaisonsLignes] = useState(carte.declinaisons || []);

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [onglet, setOnglet] = useState("infos");

  // Reflète le choix en temps réel — sauf si la gamme force le devis, auquel cas rien ne peut le contourner
  const surDevis = carte.gammeForceDevis || venteSurDevis;
  const utiliseAncienSysteme = (carte.produits || []).length > 0;

  const categorieChoisie = carte.categoriesDisponibles.find((c) => c.id === categorieId);
  const sousCategoriesDispo = categorieChoisie?.sousCategories || [];

  const nbSectionsDevis = sectionsDevis.length;
  const nbAxes = axesDeclinaisons.length;
  const nbDeclinaisons = declinaisonsLignes.length;
  const nbPrixRemplis = declinaisonsLignes.filter((l) => l.prixVenteHT !== "" && l.prixVenteHT != null).length;

  const dirty = () => setSaved(false);

  const changerCategorie = (id) => {
    setCategorieId(id);
    setSousCategorieId(""); // reset : les sous-catégories dépendent de la catégorie
    dirty();
  };

  const changerPromo = ({ promoPct: pp, promoDebut: pd, promoFin: pf }) => {
    if (pp !== undefined) setPromoPct(pp);
    if (pd !== undefined) setPromoDebut(pd);
    if (pf !== undefined) setPromoFin(pf);
    dirty();
  };

  const enregistrerTout = () => {
    setSaved(false);
    startTransition(async () => {
      await sauverCarteComplete(carte.id, {
        nom, descriptif,
        imageUrl: galerie[0] || null,
        images: galerie,
        sectionsDevis,
        prixAPartir,
        axesDeclinaisons,
        declinaisons: declinaisonsLignes,
        categorieId: categorieId || null,
        sousCategorieId: sousCategorieId || null,
        bestSeller,
        promoPct,
        promoDebut,
        promoFin,
        venteSurDevis,
      });
      setSaved(true);
      router.refresh();
    });
  };

  const tabs = [
    ["infos", `Nom & description${nom && descriptif ? " ✓" : ""}`],
    ["galerie", `Photos${galerie.length > 0 ? ` (${galerie.length})` : ""}`],
    ["technique", `Descriptif technique${nbSectionsDevis > 0 ? ` (${nbSectionsDevis})` : ""}`],
    ["declinaisons", `Déclinaisons${nbDeclinaisons > 0 ? ` (${nbDeclinaisons})` : ""}`],
    ["finitions", "Finitions"],
    ["prix", surDevis ? "Prix" : `Prix${nbDeclinaisons > 0 ? ` (${nbPrixRemplis}/${nbDeclinaisons})` : ""}`],
  ];
  if (!surDevis && utiliseAncienSysteme) tabs.push(["ancien", "Ancien sélecteur"]);

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };
  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };

  const pastille = (actif, desactive = false) => ({
    padding: "11px 20px", borderRadius: 999, cursor: desactive ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
    border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"),
    background: actif ? "#fce6d6" : "#fff",
    color: desactive ? "#c4c0b8" : (actif ? "#d9551a" : "#5c616a"),
    display: "inline-flex", alignItems: "center", gap: 7,
    opacity: desactive ? 0.6 : 1,
  });

  const ligneRecap = (lbl, ok, texte) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#9aa0a8" }}>{lbl}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ok ? "#f0661b" : "#6b7178", fontWeight: 600 }}>
        {ok ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
        ) : (
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6b7178", display: "inline-block" }} />
        )}
        {texte}
      </span>
    </div>
  );

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#23262a", margin: 0, letterSpacing: "-0.02em" }}>{carte.nom}</h1>
          <p style={{ color: "#5c616a", marginTop: 8, fontSize: 14 }}>Produit de la gamme {carte.gammeNom}</p>
        </div>
        <span style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
          background: surDevis ? "#fef4ee" : "#e8f6f0", color: surDevis ? "#b45528" : "#1f7a52" }}>
          {surDevis ? "Sur devis" : "Boutique (checkout)"}
        </span>
        {bestSeller && (
          <span style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: "#fef4ee", color: "#d9551a", display: "inline-flex", alignItems: "center", gap: 5 }}>
            ★ Best-seller
          </span>
        )}
        {promoPct && (
          <span style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: "#e8f6f0", color: "#1f7a52" }}>
            -{promoPct}%
          </span>
        )}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* ── Colonne contenu de l'onglet actif ── */}
        <div>
          {onglet === "infos" && (
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label style={label}>Nom du produit</label>
                <input value={nom} onChange={(e) => { setNom(e.target.value); dirty(); }}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 16, fontWeight: 600, color: "#23262a", outline: "none" }} />
              </div>

              <div>
                <label style={label}>Catégorie</label>
                <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>Détermine l'URL du produit — jamais la gamme.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {carte.categoriesDisponibles.map((c) => {
                    const actif = c.id === categorieId;
                    return (
                      <button key={c.id} type="button" onClick={() => changerCategorie(c.id)} style={pastille(actif)}>
                        {actif && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                        {c.nom}
                      </button>
                    );
                  })}
                </div>
              </div>

              {categorieId && (
                <div>
                  <label style={label}>Sous-catégorie</label>
                  <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>Optionnelle.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <button type="button" onClick={() => { setSousCategorieId(""); dirty(); }} style={pastille(!sousCategorieId)}>
                      {!sousCategorieId && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                      Aucune
                    </button>
                    {sousCategoriesDispo.map((s) => {
                      const actif = s.id === sousCategorieId;
                      return (
                        <button key={s.id} type="button" onClick={() => { setSousCategorieId(s.id); dirty(); }} style={pastille(actif)}>
                          {actif && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                          {s.nom}
                        </button>
                      );
                    })}
                    {sousCategoriesDispo.length === 0 && (
                      <span style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic" }}>Aucune sous-catégorie pour cette catégorie.</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label style={label}>Mise en avant</label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 13, cursor: "pointer", padding: "16px 18px", borderRadius: 14, border: "1.5px solid " + (bestSeller ? "#f0661b" : "#f0ece4"), background: bestSeller ? "#fef4ee" : "#faf8f4" }}>
                  <input type="checkbox" checked={bestSeller} onChange={(e) => { setBestSeller(e.target.checked); dirty(); }} style={{ width: 19, height: 19, accentColor: "#f0661b", marginTop: 1 }} />
                  <span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "#23262a", display: "block" }}>Best-seller</span>
                    <span style={{ fontSize: 12.5, color: "#9aa0a8", display: "block", marginTop: 4, lineHeight: 1.5 }}>
                      Affiche ce produit dans le carrousel « Meilleures ventes » de la page d'accueil.
                    </span>
                  </span>
                </label>
              </div>

              <div>
                <label style={label}>Descriptif court (intro)</label>
                <TiptapEditor value={descriptif} onChange={(html) => { setDescriptif(html); dirty(); }} />
              </div>
            </div>
          )}

          {onglet === "galerie" && (
            <div style={card}>
              <label style={label}>Photos du produit</label>
              <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 14px" }}>
                Ajoute toutes les photos de ce produit. La <strong>première</strong> (marquée « Principale ») sert automatiquement de vignette partout où le produit apparaît en dehors de sa propre fiche — catalogue, recherche, carrousels. Les autres forment la galerie visible sur sa fiche. Utilise les flèches ← → sous chaque photo pour changer l'ordre, donc pour choisir laquelle est mise en avant.
              </p>
              <ImageUploader images={galerie} onChange={(imgs) => { setGalerie(imgs); dirty(); }} />
            </div>
          )}

          {onglet === "technique" && (
            <SectionsDescriptives sections={sectionsDevis} onChangeSections={(s) => { setSectionsDevis(s); dirty(); }} />
          )}

          {onglet === "declinaisons" && (
            <DeclinaisonsBoutique
              axes={axesDeclinaisons}
              lignes={declinaisonsLignes}
              onChangeAxes={(a) => { setAxesDeclinaisons(a); dirty(); }}
              onChangeLignes={(l) => { setDeclinaisonsLignes(l); dirty(); }}
            />
          )}

          {onglet === "finitions" && (
            <FinitionsProduit vitrineId={carte.id} />
          )}

          {onglet === "prix" && (
            <PrixProduit
              surDevis={surDevis}
              gammeForceDevis={carte.gammeForceDevis}
              venteSurDevis={venteSurDevis}
              onChangeVenteSurDevis={(v) => { setVenteSurDevis(v); dirty(); }}
              axes={axesDeclinaisons}
              lignes={declinaisonsLignes}
              onChangeLignes={(l) => { setDeclinaisonsLignes(l); dirty(); }}
              prixAPartir={prixAPartir}
              onChangePrixAPartir={(p) => { setPrixAPartir(p); dirty(); }}
              prixMiniAuto={carte.prixMiniAuto}
              promoPct={promoPct}
              promoDebut={promoDebut}
              promoFin={promoFin}
              onChangePromo={changerPromo}
            />
          )}

          {onglet === "ancien" && (
            <div style={card}>
              <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 18px" }}>Cette carte contient encore des produits de l'ancien import. Cet onglet disparaîtra une fois la base purgée.</p>
              <SelecteurOptions produits={carte.produits} />
            </div>
          )}

          {/* ── Bouton unique, toujours visible peu importe l'onglet ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 24, paddingTop: 20, borderTop: "1px solid #ece8e0" }}>
            {saved && <span style={{ fontSize: 13.5, color: "#1f7a52", fontWeight: 600 }}>✓ Tout est enregistré</span>}
            <button onClick={enregistrerTout} disabled={isPending}
              style={{ padding: "15px 32px", borderRadius: 14, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px -6px rgba(240,102,27,0.5)" }}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* ── Colonne récap ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: "linear-gradient(150deg, #23262a 0%, #33261f 100%)", borderRadius: 20, padding: 26, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />

            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", marginBottom: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
              {galerie[0] ? (
                <img src={galerie[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4c525a" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.8" /><path d="m21 15-5-5-11 11" /></svg>
                </div>
              )}
            </div>

            {galerie.length > 1 && (
              <div style={{ position: "relative", display: "flex", gap: 6, marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
                {galerie.slice(1, 7).map((img, i) => (
                  <div key={i} style={{ width: 44, height: 44, borderRadius: 9, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.14)" }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
                {galerie.length > 7 && (
                  <div style={{ width: 44, height: 44, borderRadius: 9, flexShrink: 0, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: 11.5, color: "#9aa0a8", fontWeight: 700 }}>
                    +{galerie.length - 7}
                  </div>
                )}
              </div>
            )}

            <p style={{ position: "relative", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#f0661b", margin: "0 0 10px" }}>Récapitulatif</p>
            <h2 style={{ position: "relative", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.01em" }}>{nom.trim() || "Nom du produit"}</h2>

            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 11, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              {ligneRecap("Mode", true, surDevis ? "Sur devis" : "Boutique")}
              {ligneRecap("Best-seller", bestSeller, bestSeller ? "Oui" : "Non")}
              {ligneRecap("Promotion", !!promoPct, promoPct ? `-${promoPct}%` : "Aucune")}
              {ligneRecap("Catégorie", !!categorieId, categorieChoisie?.nom || "Non définie")}
              {sousCategorieId && ligneRecap("Sous-catégorie", true, sousCategoriesDispo.find((s) => s.id === sousCategorieId)?.nom || "")}
              {ligneRecap("Photos", galerie.length > 0, galerie.length > 0 ? `${galerie.length} photo${galerie.length > 1 ? "s" : ""}` : "Aucune")}
              {ligneRecap("Descriptif court", !!descriptif, descriptif ? "Rempli" : "Vide")}
              {ligneRecap("Descriptif technique", nbSectionsDevis > 0, nbSectionsDevis > 0 ? `${nbSectionsDevis} section${nbSectionsDevis > 1 ? "s" : ""}` : "Vide")}
              {ligneRecap("Axes de choix", nbAxes > 0, nbAxes > 0 ? `${nbAxes} axe${nbAxes > 1 ? "s" : ""}` : "Aucun")}
              {ligneRecap("Déclinaisons", nbDeclinaisons > 0, nbDeclinaisons > 0 ? `${nbDeclinaisons} ligne${nbDeclinaisons > 1 ? "s" : ""}` : "Vide")}
              {surDevis
                ? ligneRecap("Prix à partir de", !!prixAPartir, prixAPartir ? `${prixAPartir} €` : "Non défini")
                : ligneRecap("Prix", nbDeclinaisons > 0 && nbPrixRemplis === nbDeclinaisons, nbDeclinaisons === 0 ? "Aucune combinaison" : `${nbPrixRemplis}/${nbDeclinaisons} rempli${nbPrixRemplis > 1 ? "s" : ""}`)}
            </div>
          </div>

          {!categorieId && (
            <p style={{ fontSize: 12.5, color: "#b45528", marginTop: 14, lineHeight: 1.6, padding: "10px 14px", background: "#fef4ee", borderRadius: 10 }}>
              ⚠ Sans catégorie, ce produit n'aura pas d'URL publique valide.
            </p>
          )}

          <p style={{ fontSize: 12.5, color: "#9aa0a8", marginTop: 14, lineHeight: 1.6, padding: "0 4px" }}>
            Un seul bouton « Enregistrer » sauvegarde toute la page, peu importe l'onglet affiché.
          </p>
        </div>
      </div>
    </div>
  );
}