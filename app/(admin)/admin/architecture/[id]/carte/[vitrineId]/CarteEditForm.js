"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import TiptapEditor from "@/components/dashboard/TiptapEditor";
import SelecteurOptions from "@/components/dashboard/SelecteurOptions";
import SectionsDescriptives from "./SectionsDescriptives";
import DeclinaisonsBoutique from "./DeclinaisonsBoutique";
import OptionsAdditionnelles from "./OptionsAdditionnelles";
import SelecteurOptionsLiees from "./SelecteurOptionsLiees";
import FinitionsProduit from "./FinitionsProduit";
import PrixProduit from "./PrixProduit";
import { sauverCarteComplete, changerGammeProduit, getGammesPourRecherche } from "./actions";

export default function CarteEditForm({ carte }) {
  const router = useRouter();

  const [nom, setNom] = useState(carte.nom);
  const [descriptif, setDescriptif] = useState(carte.descriptif || "");
  const [galerie, setGalerie] = useState(
    carte.images?.length ? carte.images : (carte.imageUrl ? [carte.imageUrl] : [])
  );
  const [categorieIds, setCategorieIds] = useState(carte.categorieIds || []);
  const [sousCategorieIds, setSousCategorieIds] = useState(carte.sousCategorieIds || []);
  const [categoriePrincipaleId, setCategoriePrincipaleId] = useState(
    carte.categoriePrincipaleId || (carte.categorieIds || [])[0] || ""
  );
  const [sousCategoriePrincipaleId, setSousCategoriePrincipaleId] = useState(
    carte.sousCategoriePrincipaleId || (carte.sousCategorieIds || [])[0] || ""
  );
  const [bestSeller, setBestSeller] = useState(!!carte.bestSeller);
  const [promoPct, setPromoPct] = useState(carte.promoPct ?? "");
  const [promoDebut, setPromoDebut] = useState(carte.promoDebut || "");
  const [promoFin, setPromoFin] = useState(carte.promoFin || "");
  const [venteSurDevis, setVenteSurDevis] = useState(!!carte.venteSurDevis);
  const [publie, setPublie] = useState(!!carte.publie);

  const [sectionsDevis, setSectionsDevis] = useState(carte.sectionsDevis || []);
  const [prixAPartir, setPrixAPartir] = useState(carte.prixAPartir ?? "");

  const [sansDeclinaisons, setSansDeclinaisons] = useState(!!carte.sansDeclinaisons);
  const [prixUnitaireTarifHT, setPrixUnitaireTarifHT] = useState(carte.prixUnitaireTarifHT ?? "");
  const [prixUnitaireHT, setPrixUnitaireHT] = useState(carte.prixUnitaireHT ?? "");
  const [prixUnitaireVerrouille, setPrixUnitaireVerrouille] = useState(!!carte.prixUnitaireVerrouille);
  const [referenceUnitaire, setReferenceUnitaire] = useState(carte.referenceUnitaire ?? "");
  const [optionsAdditionnelles, setOptionsAdditionnelles] = useState(carte.optionsAdditionnelles ?? []);
  const [optionsLieesIds, setOptionsLieesIds] = useState(carte.optionsLieesIds ?? []);

  const [largeurMin, setLargeurMin] = useState(carte.largeurMin ?? "");
  const [largeurMax, setLargeurMax] = useState(carte.largeurMax ?? "");
  const [hauteurMin, setHauteurMin] = useState(carte.hauteurMin ?? "");
  const [hauteurMax, setHauteurMax] = useState(carte.hauteurMax ?? "");
  const [profondeurMin, setProfondeurMin] = useState(carte.profondeurMin ?? "");
  const [profondeurMax, setProfondeurMax] = useState(carte.profondeurMax ?? "");

  const [axesDeclinaisons, setAxesDeclinaisons] = useState(carte.axesDeclinaisons || []);
  const [declinaisonsLignes, setDeclinaisonsLignes] = useState(carte.declinaisons || []);

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [onglet, setOnglet] = useState("infos");
  const [erreurSave, setErreurSave] = useState("");

  const surDevis = carte.gammeForceDevis || venteSurDevis;
  const utiliseAncienSysteme = (carte.produits || []).length > 0;
  const estProduitOption = !!carte.estProduitOption;

  const categoriesChoisies = carte.categoriesDisponibles.filter((c) => categorieIds.includes(c.id));
  const sousCategoriesDispo = [];
  const vus = new Set();
  for (const c of categoriesChoisies) {
    for (const s of c.sousCategories) {
      if (!vus.has(s.id)) { vus.add(s.id); sousCategoriesDispo.push(s); }
    }
  }
  const sousCategoriesChoisies = sousCategoriesDispo.filter((s) => sousCategorieIds.includes(s.id));

  const nbSectionsDevis = sectionsDevis.length;
  const nbAxes = axesDeclinaisons.length;
  const nbDeclinaisons = declinaisonsLignes.length;
  const prixLigneRempli = (l) => {
    const vente = Number(l.prixVenteHT);
    const tarif = Number(l.prixTarifHT);
    if (l.prixVerrouille) return !Number.isNaN(vente) && vente > 0;
    return (!Number.isNaN(tarif) && tarif > 0) || (!Number.isNaN(vente) && vente > 0);
  };
  const nbPrixRemplis = declinaisonsLignes.filter(prixLigneRempli).length;
  const nbOptions = (optionsAdditionnelles || []).length;
  const nbOptionsTotal = nbOptions + optionsLieesIds.length;

  const prixUniqueEffectif = (() => {
    const marge = carte.margeGlobale ?? 0.3;
    const vente = Number(prixUnitaireHT);
    if (prixUnitaireVerrouille && !Number.isNaN(vente) && vente > 0) return vente;
    const tarif = Number(prixUnitaireTarifHT);
    if (!Number.isNaN(tarif) && tarif > 0) return Math.round(tarif * (1 + marge) * 100) / 100;
    if (!Number.isNaN(vente) && vente > 0) return vente;
    return null;
  })();

  const dirty = () => { setSaved(false); setErreurSave(""); };

  const toggleCategorie = (id) => {
    const next = categorieIds.includes(id) ? categorieIds.filter((x) => x !== id) : [...categorieIds, id];
    setCategorieIds(next);
    const dispo = new Set(
      carte.categoriesDisponibles
        .filter((c) => next.includes(c.id))
        .flatMap((c) => c.sousCategories.map((s) => s.id))
    );
    const nextSous = sousCategorieIds.filter((sid) => dispo.has(sid));
    setSousCategorieIds(nextSous);
    setCategoriePrincipaleId((prev) => (next.length === 0 ? "" : (!next.includes(prev) ? next[0] : prev)));
    setSousCategoriePrincipaleId((prev) => (nextSous.length === 0 ? "" : (!nextSous.includes(prev) ? nextSous[0] : prev)));
    dirty();
  };

  const toggleSousCategorie = (id) => {
    const next = sousCategorieIds.includes(id) ? sousCategorieIds.filter((x) => x !== id) : [...sousCategorieIds, id];
    setSousCategorieIds(next);
    setSousCategoriePrincipaleId((prev) => (next.length === 0 ? "" : (!next.includes(prev) ? next[0] : prev)));
    dirty();
  };

  const choisirPrincipale = (id) => { setCategoriePrincipaleId(id); dirty(); };
  const choisirSousPrincipale = (id) => { setSousCategoriePrincipaleId(id); dirty(); };

  const changerPromo = ({ promoPct: pp, promoDebut: pd, promoFin: pf }) => {
    if (pp !== undefined) setPromoPct(pp);
    if (pd !== undefined) setPromoDebut(pd);
    if (pf !== undefined) setPromoFin(pf);
    dirty();
  };

  const enregistrerTout = () => {
    const optionsSansNom = (optionsAdditionnelles || [])
      .map((o, i) => ({ n: i + 1, nom: (o.nom || "").trim() }))
      .filter((o) => !o.nom);
    if (optionsSansNom.length > 0) {
      setOnglet("options");
      setErreurSave(`Chaque option doit avoir un nom — complète ou supprime l'option ${optionsSansNom.map((o) => o.n).join(", ")}.`);
      return;
    }
    setErreurSave("");
    setSaved(false);
    startTransition(async () => {
      await sauverCarteComplete(carte.id, {
        nom, descriptif,
        imageUrl: galerie[0] || null,
        images: galerie,
        sectionsDevis,
        prixAPartir,
        sansDeclinaisons,
        prixUnitaireTarifHT: prixUnitaireTarifHT === "" ? null : Number(prixUnitaireTarifHT),
        prixUnitaireHT: prixUnitaireHT === "" ? null : Number(prixUnitaireHT),
        prixUnitaireVerrouille,
        referenceUnitaire,
        optionsAdditionnelles,
        optionsLieesIds,
        largeurMin: largeurMin === "" ? null : Number(largeurMin),
        largeurMax: largeurMax === "" ? null : Number(largeurMax),
        hauteurMin: hauteurMin === "" ? null : Number(hauteurMin),
        hauteurMax: hauteurMax === "" ? null : Number(hauteurMax),
        profondeurMin: profondeurMin === "" ? null : Number(profondeurMin),
        profondeurMax: profondeurMax === "" ? null : Number(profondeurMax),
        axesDeclinaisons,
        declinaisons: declinaisonsLignes,
        categorieIds,
        sousCategorieIds,
        categoriePrincipaleId,
        sousCategoriePrincipaleId,
        bestSeller,
        promoPct,
        promoDebut,
        promoFin,
        venteSurDevis,
        publie,
      });
      setSaved(true);
      router.refresh();
    });
  };

  const tabs = [
    ["infos", `Nom & description${nom && descriptif ? " ✓" : ""}`],
    ["galerie", `Photos${galerie.length > 0 ? ` (${galerie.length})` : ""}`],
    ["technique", `Descriptif technique${nbSectionsDevis > 0 ? ` (${nbSectionsDevis})` : ""}`],
    ["declinaisons", sansDeclinaisons ? "Déclinaisons" : `Déclinaisons${nbDeclinaisons > 0 ? ` (${nbDeclinaisons})` : ""}`],
    ["finitions", "Finitions"],
  ];
  if (!estProduitOption) tabs.push(["options", `Options${nbOptionsTotal > 0 ? ` (${nbOptionsTotal})` : ""}`]);
  tabs.push(["prix", surDevis ? "Prix" : (sansDeclinaisons ? `Prix${(prixUnitaireHT !== "" && prixUnitaireHT != null) || (prixUnitaireTarifHT !== "" && prixUnitaireTarifHT != null) ? " ✓" : ""}` : `Prix${nbDeclinaisons > 0 ? ` (${nbPrixRemplis}/${nbDeclinaisons})` : ""}`)]);
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

  const etoile = (rempli) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={rempli ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
  );

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

  const nomsCategories = categoriesChoisies.map((c) => c.nom).join(", ");
  const nomsSousCategories = sousCategoriesChoisies.map((s) => s.nom).join(", ");
  const nomPrincipale = categoriesChoisies.find((c) => c.id === categoriePrincipaleId)?.nom || "";
  const nomSousPrincipale = sousCategoriesChoisies.find((s) => s.id === sousCategoriePrincipaleId)?.nom || "";

  return (
    <div>
      <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#23262a", margin: 0, letterSpacing: "-0.02em" }}>{carte.nom}</h1>
          <p style={{ color: "#5c616a", marginTop: 8, fontSize: 14 }}>Produit de la gamme {carte.gammeNom}</p>
        </div>

        <button
          type="button"
          onClick={() => { setPublie((p) => !p); dirty(); }}
          style={{
            padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: "1.5px solid " + (publie ? "#1f7a52" : "#ece8e0"),
            background: publie ? "#e8f6f0" : "#f0ece4",
            color: publie ? "#1f7a52" : "#5c616a",
            display: "inline-flex", alignItems: "center", gap: 7,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: publie ? "#1f7a52" : "#9aa0a8", flexShrink: 0 }} />
          {publie ? "Publié" : "Brouillon"}
        </button>

        <span style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
          background: surDevis ? "#fef4ee" : "#e8f6f0", color: surDevis ? "#b45528" : "#1f7a52" }}>
          {surDevis ? "Sur devis" : "Boutique (checkout)"}
        </span>
        {estProduitOption && (
          <span style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: "#fef4ee", color: "#d9551a" }}>
            Accessoire
          </span>
        )}
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

      {!publie && (
        <div style={{ background: "#fef4ee", border: "1px solid #f7d9c6", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#b45528" }}>
          ⓘ Ce produit est en <strong>brouillon</strong> — il n'apparaît nulle part sur le site public tant qu'il n'est pas publié. Clique sur le badge « Brouillon » ci-dessus, puis « Enregistrer ».
        </div>
      )}

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
        <div>
          {onglet === "infos" && (
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label style={label}>Nom du produit</label>
                <input value={nom} onChange={(e) => { setNom(e.target.value); dirty(); }}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 16, fontWeight: 600, color: "#23262a", outline: "none" }} />
              </div>

              <SelecteurGammeProduit vitrineId={carte.id} gammeNomActuelle={carte.gammeNom} />

              <div>
                <label style={label}>Catégorie(s)</label>
                <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>Plusieurs possibles — le produit apparaît dans chacune.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {carte.categoriesDisponibles.map((c) => {
                    const actif = categorieIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleCategorie(c.id)} style={pastille(actif)}>
                        {actif && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                        {c.nom}
                      </button>
                    );
                  })}
                </div>
              </div>

              {categorieIds.length > 0 && (
                <div>
                  <label style={label}>Catégorie principale (URL)</label>
                  <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>C'est elle qui détermine le début de l'adresse du produit.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {categoriesChoisies.map((c) => {
                      const actif = c.id === categoriePrincipaleId;
                      return (
                        <button key={c.id} type="button" onClick={() => choisirPrincipale(c.id)} style={pastille(actif)}>
                          {etoile(actif)}
                          {c.nom}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {categorieIds.length > 0 && (
                <div>
                  <label style={label}>Sous-catégorie(s)</label>
                  <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>Optionnelles — plusieurs possibles.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {sousCategoriesDispo.map((s) => {
                      const actif = sousCategorieIds.includes(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleSousCategorie(s.id)} style={pastille(actif)}>
                          {actif && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                          {s.nom}
                        </button>
                      );
                    })}
                    {sousCategoriesDispo.length === 0 && (
                      <span style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic" }}>Aucune sous-catégorie pour ces catégories.</span>
                    )}
                  </div>
                </div>
              )}

              {sousCategorieIds.length > 0 && (
                <div>
                  <label style={label}>Sous-catégorie principale (URL)</label>
                  <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>C'est elle qui apparaît dans l'adresse du produit (segment après la catégorie).</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {sousCategoriesChoisies.map((s) => {
                      const actif = s.id === sousCategoriePrincipaleId;
                      return (
                        <button key={s.id} type="button" onClick={() => choisirSousPrincipale(s.id)} style={pastille(actif)}>
                          {etoile(actif)}
                          {s.nom}
                        </button>
                      );
                    })}
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
                <label style={label}>Dimensions (cm) — pour les filtres du catalogue</label>
                <p style={{ fontSize: 12, color: "#9aa0a8", margin: "0 0 12px" }}>
                  Renseigne les bornes de chaque dimension. Pour une taille unique, mets la même valeur en min et max (ex. largeur 100 → 100). Laisse vide si non pertinent.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {[
                    ["Largeur", largeurMin, setLargeurMin, largeurMax, setLargeurMax],
                    ["Hauteur", hauteurMin, setHauteurMin, hauteurMax, setHauteurMax],
                    ["Profondeur", profondeurMin, setProfondeurMin, profondeurMax, setProfondeurMax],
                  ].map(([lbl, vMin, sMin, vMax, sMax]) => (
                    <div key={lbl}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#5c616a", display: "block", marginBottom: 6 }}>{lbl}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" value={vMin} onChange={(e) => { sMin(e.target.value); dirty(); }} placeholder="min"
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }} />
                        <span style={{ color: "#9aa0a8", fontSize: 13 }}>–</span>
                        <input type="number" value={vMax} onChange={(e) => { sMax(e.target.value); dirty(); }} placeholder="max"
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  ))}
                </div>
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
              sansDeclinaisons={sansDeclinaisons}
              onChangeSansDeclinaisons={(v) => { setSansDeclinaisons(v); dirty(); }}
              referenceUnitaire={referenceUnitaire}
              onChangeReferenceUnitaire={(v) => { setReferenceUnitaire(v); dirty(); }}
            />
          )}

          {onglet === "finitions" && (
            <FinitionsProduit vitrineId={carte.id} />
          )}

          {onglet === "options" && !estProduitOption && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SelecteurOptionsLiees
                vitrineId={carte.id}
                selectedIds={optionsLieesIds}
                onChange={(ids) => { setOptionsLieesIds(ids); dirty(); }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 12px" }}>
                  <span style={{ height: 1, flex: 1, background: "#ece8e0" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#9aa0a8" }}>Options spécifiques à ce produit (avancé)</span>
                  <span style={{ height: 1, flex: 1, background: "#ece8e0" }} />
                </div>
                <OptionsAdditionnelles
                  options={optionsAdditionnelles}
                  onChange={(o) => { setOptionsAdditionnelles(o); dirty(); }}
                />
              </div>
            </div>
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
              margeGlobale={carte.margeGlobale}
              sansDeclinaisons={sansDeclinaisons}
              prixUnitaireTarifHT={prixUnitaireTarifHT}
              onChangePrixUnitaireTarif={(v) => { setPrixUnitaireTarifHT(v); dirty(); }}
              prixUnitaireHT={prixUnitaireHT}
              onChangePrixUnitaire={(v) => { setPrixUnitaireHT(v); dirty(); }}
              prixUnitaireVerrouille={prixUnitaireVerrouille}
              onChangePrixUnitaireVerrouille={(v) => { setPrixUnitaireVerrouille(v); dirty(); }}
            />
          )}

          {onglet === "ancien" && (
            <div style={card}>
              <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 18px" }}>Cette carte contient encore des produits de l'ancien import. Cet onglet disparaîtra une fois la base purgée.</p>
              <SelecteurOptions produits={carte.produits} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 24, paddingTop: 20, borderTop: "1px solid #ece8e0" }}>
            {erreurSave && <span style={{ fontSize: 13.5, color: "#b45528", fontWeight: 600 }}>⚠ {erreurSave}</span>}
            {saved && <span style={{ fontSize: 13.5, color: "#1f7a52", fontWeight: 600 }}>✓ Tout est enregistré</span>}
            <button onClick={enregistrerTout} disabled={isPending}
              style={{ padding: "15px 32px", borderRadius: 14, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px -6px rgba(240,102,27,0.5)" }}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: "linear-gradient(150deg, #23262a 0%, #33261f 100%)", borderRadius: 20, padding: 26, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />

            <p style={{ position: "relative", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#f0661b", margin: "0 0 10px" }}>Récapitulatif</p>
            <h2 style={{ position: "relative", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.01em" }}>{nom.trim() || "Nom du produit"}</h2>

            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 11, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              {ligneRecap("Statut", publie, publie ? "Publié" : "Brouillon")}
              {ligneRecap("Mode", true, surDevis ? "Sur devis" : "Boutique")}
              {estProduitOption && ligneRecap("Type", true, "Accessoire")}
              {ligneRecap("Best-seller", bestSeller, bestSeller ? "Oui" : "Non")}
              {ligneRecap("Promotion", !!promoPct, promoPct ? `-${promoPct}%` : "Aucune")}
              {ligneRecap("Catégorie(s)", categorieIds.length > 0, nomsCategories || "Non définie")}
              {categorieIds.length > 0 && ligneRecap("Catégorie URL", !!categoriePrincipaleId, nomPrincipale || "—")}
              {sousCategorieIds.length > 0 && ligneRecap("Sous-catégorie(s)", true, nomsSousCategories)}
              {sousCategorieIds.length > 0 && ligneRecap("Sous-catégorie URL", !!sousCategoriePrincipaleId, nomSousPrincipale || "—")}
              {!estProduitOption && ligneRecap("Options", nbOptionsTotal > 0, nbOptionsTotal > 0 ? `${nbOptionsTotal} liée${nbOptionsTotal > 1 ? "s" : ""}` : "Aucune")}
              {ligneRecap("Photos", galerie.length > 0, galerie.length > 0 ? `${galerie.length} photo${galerie.length > 1 ? "s" : ""}` : "Aucune")}
              {ligneRecap("Descriptif court", !!descriptif, descriptif ? "Rempli" : "Vide")}
              {ligneRecap("Descriptif technique", nbSectionsDevis > 0, nbSectionsDevis > 0 ? `${nbSectionsDevis} section${nbSectionsDevis > 1 ? "s" : ""}` : "Vide")}
              {sansDeclinaisons ? (
                ligneRecap("Type", true, "Prix unique")
              ) : (
                <>
                  {ligneRecap("Axes de choix", nbAxes > 0, nbAxes > 0 ? `${nbAxes} axe${nbAxes > 1 ? "s" : ""}` : "Aucun")}
                  {ligneRecap("Déclinaisons", nbDeclinaisons > 0, nbDeclinaisons > 0 ? `${nbDeclinaisons} ligne${nbDeclinaisons > 1 ? "s" : ""}` : "Vide")}
                </>
              )}
              {surDevis
                ? ligneRecap("Prix", true, prixAPartir ? `Sur devis (dès ${Number(prixAPartir).toLocaleString("fr-FR")} €)` : "Sur devis")
                : sansDeclinaisons
                  ? ligneRecap("Prix", prixUniqueEffectif != null, prixUniqueEffectif != null ? `${prixUniqueEffectif.toLocaleString("fr-FR")} €` : "Non défini")
                  : ligneRecap("Prix", nbDeclinaisons > 0 && nbPrixRemplis === nbDeclinaisons, nbDeclinaisons === 0 ? "Aucune combinaison" : `${nbPrixRemplis}/${nbDeclinaisons} rempli${nbPrixRemplis > 1 ? "s" : ""}`)}
            </div>
          </div>

          {categorieIds.length === 0 && (
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

// ─────────── Sélecteur de gamme — recherche + création à la volée, redirige vers la nouvelle URL ───────────
function SelecteurGammeProduit({ vitrineId, gammeNomActuelle }) {
  const router = useRouter();
  const [gammes, setGammes] = useState([]);
  const [edition, setEdition] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (edition && gammes.length === 0) {
      getGammesPourRecherche().then(setGammes);
    }
  }, [edition, gammes.length]);

  const gammesFiltrees = gammes.filter((g) => g.nom.toLowerCase().includes(recherche.trim().toLowerCase())).slice(0, 8);
  const gammeExisteExactement = gammes.some((g) => g.nom.toLowerCase() === recherche.trim().toLowerCase());

  const choisir = (gammeId, nouvelleGammeNom) => {
    setErreur("");
    startTransition(async () => {
      const res = await changerGammeProduit(vitrineId, { gammeId, nouvelleGammeNom });
      if (!res.ok) { setErreur(res.error || "Une erreur est survenue."); return; }
      router.push(`/admin/architecture/${res.gammeId}/carte/${vitrineId}`);
      router.refresh();
    });
  };

  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 };
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <label style={label}>Gamme</label>
      {!edition ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 12, background: "#faf8f4", border: "1.5px solid #ece8e0" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "#23262a" }}>{gammeNomActuelle}</span>
          <button type="button" onClick={() => setEdition(true)} style={{ fontSize: 12.5, fontWeight: 600, color: "#f0661b", background: "none", border: "none", cursor: "pointer" }}>Changer</button>
        </div>
      ) : (
        <div>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher ou créer une gamme…"
            style={inputStyle}
            autoFocus
          />
          {recherche.trim() && (
            <div style={{ marginTop: 8, border: "1px solid #ece8e0", borderRadius: 12, overflow: "hidden" }}>
              {gammesFiltrees.map((g) => (
                <button key={g.id} type="button" onClick={() => choisir(g.id, null)} disabled={isPending}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px", fontSize: 14, color: "#23262a", background: "#fff", border: "none", borderBottom: "1px solid #f2efe9", cursor: "pointer" }}>
                  {g.nom}
                </button>
              ))}
              {!gammeExisteExactement && (
                <button type="button" onClick={() => choisir(null, recherche.trim())} disabled={isPending}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "11px 16px", fontSize: 14, fontWeight: 600, color: "#f0661b", background: "#fef4ee", border: "none", cursor: "pointer" }}>
                  + Créer « {recherche.trim()} »
                </button>
              )}
            </div>
          )}
          <button type="button" onClick={() => { setEdition(false); setRecherche(""); setErreur(""); }} style={{ fontSize: 12.5, color: "#9aa0a8", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>Annuler</button>
        </div>
      )}
      {erreur && <p style={{ fontSize: 12.5, color: "#b45528", marginTop: 8 }}>{erreur}</p>}
      <p style={{ fontSize: 12, color: "#9aa0a8", margin: "10px 0 0" }}>Changer la gamme redirige automatiquement vers la nouvelle page du produit.</p>
    </div>
  );
}