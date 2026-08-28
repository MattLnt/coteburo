"use client";
import { useState, useMemo } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useDevis } from "@/components/devis/DevisContext";
import { identifierAxesEtOptions, resoudreSelection, prochaineEtapeProduit, compterEtapesRestantes } from "@/lib/optionsProduit";
import { prochainAxe, compterAxesRestants, resoudreDeclinaison } from "@/lib/declinaisonsLibres";
import GalerieProduit from "@/components/GalerieProduit";
import FavoriButton from "@/components/FavoriButton";
import { useOptionsAcheteur } from "@/components/OptionsAcheteur";

const fmt0 = (n) => (n == null ? null : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`);
const fmt2 = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

// Découpe les finitions d'un groupe en sous-blocs par palette d'origine,
// en conservant l'ordre. Les finitions sans palette forment un bloc sans titre.
function sousBlocsPalette(finitions) {
  const blocs = [];
  let courant = null;
  (finitions || []).forEach((f) => {
    const cle = f.paletteNom || "__sans__";
    if (!courant || courant.cle !== cle) {
      courant = { cle, nom: f.paletteNom || null, items: [] };
      blocs.push(courant);
    }
    courant.items.push(f);
  });
  return blocs;
}

// Bloc de configuration — carte blanche qui isole chaque choix.
function Bloc({ titre, aChoisir, children }) {
  return (
    <div className="rounded-2xl bg-surface border border-line lg:border-transparent lg:bg-transparent p-4 lg:p-0 lg:mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-ink text-[13.5px] lg:text-[15px]">{titre}</p>
        {aChoisir && <span className="text-[10.5px] lg:text-[11.5px] text-orange-dark font-semibold">À choisir</span>}
      </div>
      {children}
    </div>
  );
}

// Section descriptive repliable — tout déroulé, ça faisait beaucoup de texte
// entre la configuration et la suite de la page.
function SectionRepliable({ titre, contenu, ouvertParDefaut }) {
  const [ouvert, setOuvert] = useState(!!ouvertParDefaut);
  return (
    <div className="rounded-2xl bg-surface border border-line overflow-hidden lg:border-none lg:bg-transparent lg:rounded-none">
      <button type="button" onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 lg:hidden">
        <span className="font-semibold text-ink text-[13.5px] text-left">{titre}</span>
        <span className={`text-ink-soft shrink-0 transition-transform ${ouvert ? "rotate-180 text-orange-dark" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      <div className={`${ouvert ? "block" : "hidden"} lg:block px-4 pb-4 pt-0 border-t border-line lg:p-0 lg:border-none`}>
        <h2 className="hidden lg:block font-display font-bold text-2xl mb-4">{titre}</h2>
        {contenu && <div className="prose prose-sm max-w-none text-ink-soft leading-relaxed mt-3 lg:mt-0 text-[13px] lg:text-base" dangerouslySetInnerHTML={{ __html: contenu }} />}
      </div>
    </div>
  );
}

export default function FicheProduit({ data }) {
  const { addItem } = useCart();
  const { addDevis } = useDevis();
  const { carte, groupesFinition, gammeNom, gammeSlug, surDevis, favori, connecte } = data;
  const produits = carte.produits || [];
  const images = carte.images?.length ? carte.images : [];
  const axesDecl = carte.axesDeclinaisons || [];
  const declLignes = carte.declinaisons || [];

  // Produit vendu à PRIX FIXE : aucun produit de l'ancien système et aucun axe de choix.
  // On teste l'absence d'AXES et non de déclinaisons : un produit basculé en prix fixe
  // peut garder des lignes de déclinaisons résiduelles en base, inutilisables sans axe.
  const prixFixe = produits.length === 0 && axesDecl.length === 0;

  // Options / accessoires — logique partagée avec FicheProduitLibre
  const { optionsUI, totalOptions, optionsOK, ajouterOptions } = useOptionsAcheteur({
    options: carte.optionsAdditionnelles,
    carte,
    addItem,
  });

  const finitionsAVoter = useMemo(
    () => [...(groupesFinition || []), ...((carte.finitionsProduit) || [])],
    [groupesFinition, carte.finitionsProduit]
  );

  const identifs = useMemo(() => identifierAxesEtOptions(produits), [produits]);

  const [historique, setHistorique] = useState([]);
  const [selection, setSelection] = useState({});
  const [optionsReponses, setOptionsReponses] = useState({});
  const [prefAxes, setPrefAxes] = useState({});
  const [prefOptions, setPrefOptions] = useState({});
  const [declHistorique, setDeclHistorique] = useState([]);
  const [declReponses, setDeclReponses] = useState({});
  const [declPrefValeurs, setDeclPrefValeurs] = useState({});
  const [finitionsSel, setFinitionsSel] = useState({});
  const [phase, setPhase] = useState("config"); // config | declinaison | recap
  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);
  const [ajouteDevis, setAjouteDevis] = useState(false);

  const dejaTraites = useMemo(() => new Set(historique.map((h) => h.cle)), [historique]);
  const dejaTraitesDecl = useMemo(() => new Set(declHistorique.map((h) => h.axeId)), [declHistorique]);

  const etapeCourante = useMemo(() => {
    if (phase === "config") return prochaineEtapeProduit(identifs, produits, selection, optionsReponses, dejaTraites);
    return null;
  }, [phase, identifs, produits, selection, optionsReponses, dejaTraites]);

  const etapeDeclCourante = useMemo(() => {
    if (phase === "declinaison") return prochainAxe(axesDecl, declLignes, declReponses, dejaTraitesDecl);
    return null;
  }, [phase, axesDecl, declLignes, declReponses, dejaTraitesDecl]);

  useMemo(() => {
    if (phase === "config" && etapeCourante === null) {
      setPhase(axesDecl.length > 0 ? "declinaison" : "recap");
    }
  }, [phase, etapeCourante, axesDecl.length]);

  useMemo(() => {
    if (phase === "declinaison" && etapeDeclCourante === null) {
      setPhase("recap");
    }
  }, [phase, etapeDeclCourante]);

  const { match } = useMemo(() => resoudreSelection(produits, selection, optionsReponses), [produits, selection, optionsReponses]);
  const produitFinal = match || (produits.length === 1 ? produits[0] : null);

  const { match: declMatch } = useMemo(() => resoudreDeclinaison(declLignes, declReponses), [declLignes, declReponses]);
  const declinaisonFinale = declMatch || (declLignes.length === 1 && axesDecl.length > 0 ? declLignes[0] : null);

  const prixResolu = produitFinal
    ? (produitFinal.prixVenteHT ?? produitFinal.prixPublicHT)
    : declinaisonFinale
    ? Number(declinaisonFinale.prixVenteHT)
    : carte.prixMini;
  const prixAffiche = surDevis ? (carte.prixAPartir ?? prixResolu) : prixResolu;
  const ttc = !surDevis && prixAffiche != null ? prixAffiche * 1.2 : null;

  const referenceFinale = produitFinal
    ? { codeRacine: produitFinal.codeRacine, designation: produitFinal.designation }
    : declinaisonFinale
    ? { codeRacine: declinaisonFinale.id, designation: carte.nom }
    : (prixFixe && prixAffiche != null)
    ? { codeRacine: carte.id, designation: carte.nom }
    : null;

  const nbConfigRepondu = historique.length;
  const nbConfigRestant = phase === "config" ? compterEtapesRestantes(identifs, produits, selection, optionsReponses, dejaTraites) : 0;
  const nbDeclRepondu = declHistorique.length;
  const nbDeclRestant = phase === "declinaison" ? compterAxesRestants(axesDecl, declLignes, declReponses, dejaTraitesDecl) : (phase === "config" ? axesDecl.length : 0);
  const etapeActuelleNum = nbConfigRepondu + nbDeclRepondu;
  const etapeTotalNum = nbConfigRepondu + nbConfigRestant + nbDeclRepondu + nbDeclRestant;

  const choisirAxe = (key, label, value) => {
    setHistorique((h) => [...h, { cle: `axe:${key}`, type: "axe", key, label, valeurChoisie: value }]);
    setSelection((s) => ({ ...s, [key]: value }));
    setPrefAxes((p) => ({ ...p, [key]: value }));
  };
  const choisirOption = (key, label, val) => {
    setHistorique((h) => [...h, { cle: `option:${key}`, type: "option", key, label, valeurChoisie: val }]);
    setOptionsReponses((o) => ({ ...o, [key]: val }));
    setPrefOptions((p) => ({ ...p, [key]: val }));
  };
  const choisirDecl = (axeId, nomAxe, valeur) => {
    setDeclHistorique((h) => [...h, { axeId, nom: nomAxe, valeur }]);
    setDeclReponses((r) => ({ ...r, [axeId]: valeur }));
    setDeclPrefValeurs((p) => ({ ...p, [axeId]: valeur }));
  };
  const choisirFinition = (groupeId, finitionId) => {
    setFinitionsSel((f) => ({ ...f, [groupeId]: finitionId }));
  };

  const popDerniereConfig = () => {
    setHistorique((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      if (last.type === "axe") {
        setSelection((s) => { const n = { ...s }; delete n[last.key]; return n; });
        setPrefAxes((p) => { const n = { ...p }; delete n[last.key]; return n; });
      } else {
        setOptionsReponses((o) => { const n = { ...o }; delete n[last.key]; return n; });
        setPrefOptions((p) => { const n = { ...p }; delete n[last.key]; return n; });
      }
      return h.slice(0, -1);
    });
  };

  const popDerniereDeclReponse = () => {
    setDeclHistorique((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setDeclReponses((r) => { const n = { ...r }; delete n[last.axeId]; return n; });
      setDeclPrefValeurs((p) => { const n = { ...p }; delete n[last.axeId]; return n; });
      return h.slice(0, -1);
    });
  };

  const reculer = () => {
    if (phase === "declinaison") {
      if (declHistorique.length > 0) {
        popDerniereDeclReponse();
      } else {
        popDerniereConfig();
        setPhase("config");
      }
      return;
    }
    if (phase === "recap") {
      if (declHistorique.length > 0) {
        popDerniereDeclReponse();
        setPhase("declinaison");
      } else if (historique.length > 0) {
        popDerniereConfig();
        setPhase("config");
      } else {
        setPhase(axesDecl.length > 0 ? "declinaison" : "config");
      }
      return;
    }
    popDerniereConfig();
  };

  const libelleConfig = () => {
    const parts = historique.map((h) => `${h.label}: ${h.type === "option" ? (h.valeurChoisie ? "Oui" : "Non") : h.valeurChoisie}`);
    for (const h of declHistorique) parts.push(`${h.nom}: ${h.valeur}`);
    for (const g of finitionsAVoter) {
      const f = g.finitions.find((x) => x.id === finitionsSel[g.id]);
      if (f) parts.push(`${g.nom}: ${f.paletteNom ? `${f.paletteNom} ${f.nom}` : f.nom}`);
    }
    return parts.join(" · ");
  };

  const finitionsOK = finitionsAVoter.length === 0 || finitionsAVoter.every((g) => finitionsSel[g.id]);
  const peutAjouter = !!referenceFinale && finitionsOK && optionsOK;
  const peutDemanderDevis = finitionsOK;

  const ajouterPanier = () => {
    if (!peutAjouter) return;
    const itemPourPanier = produitFinal
      ? {
          type: "ancien",
          codeRacine: produitFinal.codeRacine,
          slug: carte.slug,
          categorieSlug: carte.categorieSlug || null,
          sousCategorieSlug: carte.sousCategorieSlug || null,
          designation: produitFinal.designation,
          marque: "Buronomic",
          image: images[0] || null,
          prix: prixAffiche,
        }
      : {
          type: "nouveau",
          vitrineId: carte.id,
          declinaisonId: declinaisonFinale ? declinaisonFinale.id : null,
          slug: carte.slug,
          categorieSlug: carte.categorieSlug || null,
          sousCategorieSlug: carte.sousCategorieSlug || null,
          designation: carte.nom,
          marque: "Buronomic",
          image: images[0] || null,
          prix: prixAffiche,
        };
    const parentId = addItem(itemPourPanier, libelleConfig() || null, qte);
    ajouterOptions(parentId);
    setAjoute(true); setTimeout(() => setAjoute(false), 2000);
  };
  const ajouterAuDevis = () => {
    if (!peutDemanderDevis) return;
    addDevis({
      codeRacine: referenceFinale?.codeRacine || null,
      gammeSlug, carteSlug: carte.slug,
      designation: referenceFinale ? referenceFinale.designation : `${carte.nom} (${gammeNom})`,
      gammeNom,
      image: images[0] || null,
      config: libelleConfig() || null,
      finitions: [],
      prixIndicatif: prixAffiche,
    }, qte);
    setAjouteDevis(true);
    setTimeout(() => setAjouteDevis(false), 2000);
  };

  const gros = (actif) => `px-3.5 lg:px-4 py-2.5 rounded-xl border text-[12.5px] lg:text-[13.5px] font-medium transition ${
    actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50 hover:bg-surface-2"}`;

  const peutReculer = historique.length > 0 || declHistorique.length > 0 || (phase !== "config" && !prixFixe);
  const totalGeneral = (prixAffiche != null ? prixAffiche * qte : 0) + totalOptions;

  const selecteurQte = (
    <div className="flex items-center border border-line rounded-full overflow-hidden shrink-0">
      <button onClick={() => setQte((q) => Math.max(1, q - 1))} className="w-9 h-9 lg:w-10 lg:h-11 grid place-items-center hover:bg-surface-2 text-ink-soft">−</button>
      <span className="w-7 lg:w-10 text-center font-semibold text-[14px]">{qte}</span>
      <button onClick={() => setQte((q) => q + 1)} className="w-9 h-9 lg:w-10 lg:h-11 grid place-items-center hover:bg-surface-2 text-ink-soft">+</button>
    </div>
  );

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-5 lg:gap-10 items-start">
        <div className="lg:sticky lg:top-[260px]">
          <GalerieProduit images={images} alt={carte.nom} />
        </div>

        <div>
          <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{gammeNom}</p>
          <h1 className="font-display font-bold text-[24px] sm:text-3xl lg:text-4xl mt-1.5 lg:mt-2 leading-tight">{carte.nom}</h1>

          {(!surDevis || prixAffiche != null) && (
            <div className="flex items-end gap-2.5 lg:gap-3 mt-3 lg:mt-5">
              {(surDevis || !referenceFinale) && <span className="text-ink-soft text-[13px] lg:text-[15px] mb-0.5 lg:mb-1">à partir de</span>}
              <span className="font-display font-bold text-[26px] lg:text-3xl">{surDevis ? fmt0(prixAffiche) : fmt2(prixAffiche)}</span>
              <span className="text-ink-soft text-[13px] lg:text-base mb-0.5 lg:mb-1">HT</span>
            </div>
          )}
          {ttc != null && <p className="text-[11.5px] lg:text-[13px] text-ink-soft mt-1">{fmt2(ttc)} TTC</p>}

          <div className="mt-3 lg:mt-4">
            <FavoriButton vitrineId={carte.id} initial={!!favori} connecte={!!connecte} variant="text" />
          </div>

          {carte.descriptif && (
            <div className="text-ink-soft mt-3 lg:mt-4 leading-relaxed prose prose-sm max-w-none text-[13px] lg:text-base" dangerouslySetInnerHTML={{ __html: carte.descriptif }} />
          )}

          {/* ── Blocs de configuration ── */}
          <div className="flex flex-col gap-2 lg:gap-0 mt-4 lg:mt-6 lg:pt-6 lg:border-t lg:border-line">
            {finitionsAVoter.map((g) => {
              const selectionneeId = finitionsSel[g.id];
              const blocs = sousBlocsPalette(g.finitions);
              return (
                <Bloc key={g.id} titre={g.nom} aChoisir={!selectionneeId}>
                  {blocs.map((bloc, bi) => (
                    <div key={`${g.id}-${bloc.cle}-${bi}`} className={bi > 0 ? "mt-4" : ""}>
                      {bloc.nom && (
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <span className="text-[10.5px] lg:text-[11.5px] font-semibold text-ink-soft uppercase tracking-[0.06em]">{bloc.nom}</span>
                          <span className="flex-1 h-px bg-line" />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2.5 lg:gap-3">
                        {bloc.items.map((f) => {
                          const actif = selectionneeId === f.id;
                          return (
                            <button key={f.id} type="button" onClick={() => choisirFinition(g.id, f.id)} title={f.nom} className="flex flex-col items-center gap-1.5 w-[52px]">
                              <span className={`rounded-full border-2 overflow-hidden transition block w-[42px] h-[42px] ${actif ? "border-orange" : "border-line hover:border-orange/40"}`} style={{ background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                                {f.imageUrl && <img src={f.imageUrl} alt={f.nom} className="w-full h-full object-cover rounded-full" />}
                              </span>
                              <span className={`text-[10px] lg:text-[11px] text-center leading-tight ${actif ? "text-orange-dark font-semibold" : "text-ink-soft"}`}>{f.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Bloc>
              );
            })}

            {phase === "config" && etapeCourante?.type === "axe" && (
              <Bloc titre={etapeCourante.label} aChoisir>
                <div className="flex flex-wrap gap-2">
                  {etapeCourante.axe.valeurs.map((v) => {
                    const actif = prefAxes[etapeCourante.key] === v.value;
                    return (
                      <button key={v.value} onClick={() => choisirAxe(etapeCourante.key, etapeCourante.label, v.value)} className={gros(actif)}>{v.label}</button>
                    );
                  })}
                </div>
              </Bloc>
            )}

            {phase === "config" && etapeCourante?.type === "option" && (
              <Bloc titre={`${etapeCourante.label} ?`} aChoisir>
                <div className="flex gap-2">
                  <button onClick={() => choisirOption(etapeCourante.key, etapeCourante.label, true)} className={gros(prefOptions[etapeCourante.key] === true)}>Oui</button>
                  <button onClick={() => choisirOption(etapeCourante.key, etapeCourante.label, false)} className={gros(prefOptions[etapeCourante.key] === false)}>Non</button>
                </div>
              </Bloc>
            )}

            {phase === "declinaison" && etapeDeclCourante && (
              <Bloc titre={etapeDeclCourante.axe.nom} aChoisir>
                <div className="flex flex-wrap gap-2">
                  {etapeDeclCourante.valeurs.map((v) => {
                    const actif = declPrefValeurs[etapeDeclCourante.axe.id] === v;
                    return (
                      <button key={v} onClick={() => choisirDecl(etapeDeclCourante.axe.id, etapeDeclCourante.axe.nom, v)} className={gros(actif)}>{v}</button>
                    );
                  })}
                </div>
              </Bloc>
            )}

            {phase === "recap" && !surDevis && optionsUI}

            {phase === "recap" && (referenceFinale || surDevis) && (
              <Bloc titre="Votre configuration">
                <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                  {referenceFinale && (
                    <div className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4">
                      <span className="text-ink-soft">Modèle</span>
                      <span className="text-ink font-medium text-right">{referenceFinale.designation}</span>
                    </div>
                  )}
                  {historique.map((h) => (
                    <div key={h.cle} className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4">
                      <span className="text-ink-soft">{h.label}</span>
                      <span className="text-ink font-medium">{h.type === "option" ? (h.valeurChoisie ? "Oui" : "Non") : h.valeurChoisie}</span>
                    </div>
                  ))}
                  {declHistorique.map((h) => (
                    <div key={h.axeId} className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4">
                      <span className="text-ink-soft">{h.nom}</span>
                      <span className="text-ink font-medium">{h.valeur}</span>
                    </div>
                  ))}
                  {finitionsAVoter.map((g) => {
                    const f = g.finitions.find((x) => x.id === finitionsSel[g.id]);
                    return f ? (
                      <div key={g.id} className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4 items-center">
                        <span className="text-ink-soft">{g.nom}</span>
                        <span className="text-ink font-medium inline-flex items-center gap-2 text-right">
                          <span className="rounded-full border border-line overflow-hidden inline-block w-4 h-4 shrink-0" style={{ background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                            {f.imageUrl && <img src={f.imageUrl} alt="" className="w-full h-full object-cover rounded-full" />}
                          </span>
                          {f.paletteNom ? `${f.paletteNom} — ${f.nom}` : f.nom}
                        </span>
                      </div>
                    ) : null;
                  })}
                  {surDevis && historique.length === 0 && declHistorique.length === 0 && (
                    <div className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] text-ink-soft">Aucune préférence renseignée — un conseiller vous accompagnera.</div>
                  )}
                </div>
              </Bloc>
            )}

            {phase === "recap" && !referenceFinale && !surDevis && (
              <p className="text-[12.5px] text-ink-soft bg-surface-2 rounded-xl px-4 py-3">Configuration incomplète — revenez en arrière.</p>
            )}

            {!finitionsOK && phase === "recap" && (
              <p className="text-[12.5px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3">Choisissez une finition dans chaque catégorie.</p>
            )}
            {!optionsOK && phase === "recap" && (
              <p className="text-[12.5px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3">Terminez la configuration des options sélectionnées.</p>
            )}
          </div>

          {phase !== "recap" && etapeTotalNum > 0 && (
            <div className="mt-4 lg:mt-6">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: etapeTotalNum }).map((_, i) => (
                  <div key={i} className={`h-[5px] flex-1 rounded-full transition-all duration-300 ${i < etapeActuelleNum ? "bg-orange" : "bg-line"}`} />
                ))}
              </div>
              <p className="text-[11px] lg:text-[11.5px] text-ink-soft mt-2 text-right">Étape {etapeActuelleNum} sur {etapeTotalNum}</p>
            </div>
          )}

          {peutReculer && (
            <div className="mt-4 lg:mt-6">
              <button onClick={reculer} className="text-[13px] lg:text-[14px] font-semibold text-ink-soft hover:text-ink">← Retour</button>
            </div>
          )}

          {/* Actions — desktop uniquement, la barre fixe prend le relais sur mobile */}
          <div className="hidden lg:block mt-5">
            <div className="flex items-center gap-3 flex-wrap">
              {selecteurQte}
              {surDevis ? (
                <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis} className="flex-1 min-w-[200px] rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {ajouteDevis ? "✓ Ajouté au devis" : "Ajouter au devis"}
                </button>
              ) : (
                <>
                  <button onClick={ajouterPanier} disabled={!peutAjouter} className="flex-1 min-w-[180px] rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {ajoute ? "✓ Ajouté" : "Ajouter au panier"}
                  </button>
                  {referenceFinale && (
                    <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis} className="rounded-full bg-charcoal text-white font-semibold px-6 py-3.5 hover:bg-[#2d3035] transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">
                      {ajouteDevis ? "✓ Ajouté" : "+ Devis"}
                    </button>
                  )}
                </>
              )}
            </div>
            {surDevis && <p className="text-[12.5px] text-ink-soft mt-2.5">Sans engagement — nos experts vous recontactent avec un devis personnalisé.</p>}
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-3 mt-5 lg:mt-8 text-center">
            <div className="rounded-xl bg-surface lg:bg-transparent border border-line py-2.5 lg:py-3 px-2">
              <span className="block font-display font-bold text-ink text-[11px] lg:text-[13px]">Livraison</span>
              <span className="text-ink-soft text-[10px] lg:text-[12px]">& montage</span>
            </div>
            <div className="rounded-xl bg-surface lg:bg-transparent border border-line py-2.5 lg:py-3 px-2">
              <span className="block font-display font-bold text-ink text-[11px] lg:text-[13px]">Garantie 7 ans</span>
              <span className="text-ink-soft text-[10px] lg:text-[12px]">offerte</span>
            </div>
            <div className="rounded-xl bg-surface lg:bg-transparent border border-line py-2.5 lg:py-3 px-2">
              <span className="block font-display font-bold text-ink text-[11px] lg:text-[13px]">Conseil 3D</span>
              <span className="text-ink-soft text-[10px] lg:text-[12px]">sur devis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sections descriptives — repliables sur mobile */}
      {carte.sectionsDevis?.length > 0 && (
        <div className="mt-6 lg:mt-14 lg:pt-14 lg:border-t lg:border-line flex flex-col gap-2 lg:gap-0">
          {carte.sectionsDevis.map((s, i) => (
            <div key={s.id} className="lg:mb-10 lg:last:mb-0">
              <SectionRepliable titre={s.titre || "Détails"} contenu={s.contenu} ouvertParDefaut={i === 0} />
            </div>
          ))}
        </div>
      )}

      {/* ══ Barre d'achat fixe (mobile) ══
          Sans elle, il faut faire défiler toute la configuration avant de
          trouver le bouton d'ajout au panier. */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <p className="text-[10.5px] text-ink-soft">{surDevis ? "Prix indicatif" : "Total HT"}</p>
            <p className="font-display font-bold text-[19px] text-ink leading-tight">
              {surDevis ? fmt0(prixAffiche) : fmt2(totalGeneral)}
            </p>
          </div>
          {!surDevis && selecteurQte}
        </div>

        <div className="flex gap-2">
          {surDevis ? (
            <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis}
              className="flex-1 rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-40">
              {ajouteDevis ? "✓ Ajouté au devis" : "Ajouter au devis"}
            </button>
          ) : (
            <>
              <button onClick={ajouterPanier} disabled={!peutAjouter}
                className="flex-1 rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-40">
                {ajoute ? "✓ Ajouté au panier" : "Ajouter au panier"}
              </button>
              {referenceFinale && (
                <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis} aria-label="Ajouter au devis"
                  className="w-12 grid place-items-center rounded-full bg-charcoal text-white disabled:opacity-40">
                  {ajouteDevis ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}