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

export default function FicheProduit({ data }) {
  const { addItem } = useCart();
  const { addDevis } = useDevis();
  const { carte, groupesFinition, gammeNom, gammeSlug, surDevis, favori, connecte } = data;
  const produits = carte.produits || [];
  const images = carte.images?.length ? carte.images : [];
  const axesDecl = carte.axesDeclinaisons || [];
  const declLignes = carte.declinaisons || [];

  // Options / accessoires — logique partagée avec FicheProduitLibre (composant OptionsAcheteur)
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

  const referenceFinale = produitFinal
    ? { codeRacine: produitFinal.codeRacine, designation: produitFinal.designation }
    : declinaisonFinale
    ? { codeRacine: declinaisonFinale.id, designation: carte.nom }
    : null;

  const prixResolu = produitFinal
    ? (produitFinal.prixVenteHT ?? produitFinal.prixPublicHT)
    : declinaisonFinale
    ? Number(declinaisonFinale.prixVenteHT)
    : carte.prixMini;
  const prixAffiche = surDevis ? (carte.prixAPartir ?? prixResolu) : prixResolu;
  const ttc = !surDevis && prixAffiche != null ? prixAffiche * 1.2 : null;

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
      if (f) parts.push(`${g.nom}: ${f.nom}`);
    }
    return parts.join(" · ");
  };

  const finitionsOK = finitionsAVoter.length === 0 || finitionsAVoter.every((g) => finitionsSel[g.id]);
  const peutAjouter = !!referenceFinale && finitionsOK && optionsOK;
  const peutDemanderDevis = finitionsOK;

  // Construit l'objet transmis au panier — le type dépend explicitement de quel système
  // a résolu ce produit, pour que la route de paiement sache où revérifier le prix ensuite.
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
          declinaisonId: declinaisonFinale.id,
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

  const gros = (actif) => `px-4 py-2.5 rounded-xl border text-[13.5px] font-medium transition ${
    actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50 hover:bg-surface-2"}`;

  const peutReculer = historique.length > 0 || declHistorique.length > 0 || phase !== "config";

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div className="lg:sticky lg:top-[260px]">
          <GalerieProduit images={images} alt={carte.nom} />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{gammeNom}</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">{carte.nom}</h1>

          {(!surDevis || prixAffiche != null) && (
            <div className="flex items-end gap-3 mt-5">
              {(surDevis || !referenceFinale) && <span className="text-ink-soft text-[15px] mb-1">à partir de</span>}
              <span className="font-display font-bold text-3xl">{surDevis ? fmt0(prixAffiche) : fmt2(prixAffiche)}</span>
              <span className="text-ink-soft mb-1">HT</span>
              {ttc != null && <span className="text-[13px] text-ink-soft mb-1.5">· {fmt2(ttc)} TTC</span>}
            </div>
          )}

          <div className="mt-4">
            <FavoriButton vitrineId={carte.id} initial={!!favori} connecte={!!connecte} variant="text" />
          </div>

          {carte.descriptif && (
            <div className="text-ink-soft mt-4 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: carte.descriptif }} />
          )}

          {finitionsAVoter.length > 0 && (
            <div className="mt-6 pt-6 border-t border-line">
              {finitionsAVoter.map((g) => {
                const selectionneeId = finitionsSel[g.id];
                return (
                  <div key={g.id} className="mb-5 last:mb-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-ink text-[14px]">{g.nom}</p>
                      {!selectionneeId && <span className="text-[11.5px] text-orange-dark font-medium">À choisir</span>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {g.finitions.map((f) => {
                        const actif = selectionneeId === f.id;
                        return (
                          <button key={f.id} onClick={() => choisirFinition(g.id, f.id)} title={f.nom} className="flex flex-col items-center gap-1.5">
                            <span className={`rounded-full border-2 overflow-hidden transition block ${actif ? "border-orange" : "border-line hover:border-orange/40"}`} style={{ width: 44, height: 44, background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                              {f.imageUrl && <img src={f.imageUrl} alt={f.nom} className="w-full h-full object-cover rounded-full" />}
                            </span>
                            <span className={`text-[11px] ${actif ? "text-orange-dark font-semibold" : "text-ink-soft"}`}>{f.nom}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={finitionsAVoter.length > 0 ? "mt-7" : "mt-6 pt-6 border-t border-line"}>
            {phase === "config" && etapeCourante?.type === "axe" && (
              <div>
                <p className="font-semibold text-ink text-[16px] mb-3.5">{etapeCourante.label}</p>
                <div className="flex flex-wrap gap-2">
                  {etapeCourante.axe.valeurs.map((v) => {
                    const actif = prefAxes[etapeCourante.key] === v.value;
                    return (
                      <button key={v.value} onClick={() => choisirAxe(etapeCourante.key, etapeCourante.label, v.value)} className={gros(actif)}>{v.label}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {phase === "config" && etapeCourante?.type === "option" && (
              <div>
                <p className="font-semibold text-ink text-[16px] mb-3.5">{etapeCourante.label} ?</p>
                <div className="flex gap-2">
                  <button onClick={() => choisirOption(etapeCourante.key, etapeCourante.label, true)} className={gros(prefOptions[etapeCourante.key] === true)}>Oui</button>
                  <button onClick={() => choisirOption(etapeCourante.key, etapeCourante.label, false)} className={gros(prefOptions[etapeCourante.key] === false)}>Non</button>
                </div>
              </div>
            )}

            {phase === "declinaison" && etapeDeclCourante && (
              <div>
                <p className="font-semibold text-ink text-[16px] mb-3.5">{etapeDeclCourante.axe.nom}</p>
                <div className="flex flex-wrap gap-2">
                  {etapeDeclCourante.valeurs.map((v) => {
                    const actif = declPrefValeurs[etapeDeclCourante.axe.id] === v;
                    return (
                      <button key={v} onClick={() => choisirDecl(etapeDeclCourante.axe.id, etapeDeclCourante.axe.nom, v)} className={gros(actif)}>{v}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {phase === "recap" && (
              <div>
                <p className="font-semibold text-ink text-[16px] mb-3.5">Votre configuration</p>
                {(referenceFinale || surDevis) ? (
                  <div className="rounded-2xl border border-line divide-y divide-line overflow-hidden mb-5">
                    {referenceFinale && (
                      <div className="px-4 py-3 text-[13.5px] flex justify-between gap-4">
                        <span className="text-ink-soft">Modèle</span>
                        <span className="text-ink font-medium text-right">{referenceFinale.designation}</span>
                      </div>
                    )}
                    {historique.map((h) => (
                      <div key={h.cle} className="px-4 py-3 text-[13.5px] flex justify-between gap-4">
                        <span className="text-ink-soft">{h.label}</span>
                        <span className="text-ink font-medium">{h.type === "option" ? (h.valeurChoisie ? "Oui" : "Non") : h.valeurChoisie}</span>
                      </div>
                    ))}
                    {declHistorique.map((h) => (
                      <div key={h.axeId} className="px-4 py-3 text-[13.5px] flex justify-between gap-4">
                        <span className="text-ink-soft">{h.nom}</span>
                        <span className="text-ink font-medium">{h.valeur}</span>
                      </div>
                    ))}
                    {finitionsAVoter.map((g) => {
                      const f = g.finitions.find((x) => x.id === finitionsSel[g.id]);
                      return f ? (
                        <div key={g.id} className="px-4 py-3 text-[13.5px] flex justify-between gap-4 items-center">
                          <span className="text-ink-soft">{g.nom}</span>
                          <span className="text-ink font-medium inline-flex items-center gap-2">
                            <span className="rounded-full border border-line overflow-hidden inline-block" style={{ width: 16, height: 16, background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                              {f.imageUrl && <img src={f.imageUrl} alt="" className="w-full h-full object-cover rounded-full" />}
                            </span>
                            {f.nom}
                          </span>
                        </div>
                      ) : null;
                    })}
                    {surDevis && historique.length === 0 && declHistorique.length === 0 && (
                      <div className="px-4 py-3 text-[13.5px] text-ink-soft">Aucune préférence de configuration renseignée — un conseiller vous accompagnera dans le choix.</div>
                    )}
                    {!surDevis && (
                      <div className="px-4 py-3 flex justify-between items-center bg-surface-2/40">
                        <span className="text-ink-soft text-[13.5px]">{totalOptions > 0 ? "Total HT" : "Prix unitaire HT"}</span>
                        <span className="font-display font-bold text-lg">{fmt2((prixAffiche != null ? prixAffiche * qte : 0) + totalOptions)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-soft bg-surface-2 rounded-xl px-4 py-3 mb-4">Configuration incomplète — revenez en arrière.</p>
                )}

                {!surDevis && optionsUI}

                {!finitionsOK && (
                  <p className="text-[13px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3 mb-4">Choisissez une finition dans chaque catégorie ci-dessus avant de continuer.</p>
                )}
                {!optionsOK && (
                  <p className="text-[13px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3 mb-4">Terminez la configuration des options sélectionnées (déclinaison / finition).</p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center border border-line rounded-full overflow-hidden">
                    <button onClick={() => setQte((q) => Math.max(1, q - 1))} className="w-10 h-11 grid place-items-center hover:bg-surface-2">−</button>
                    <span className="w-10 text-center font-semibold">{qte}</span>
                    <button onClick={() => setQte((q) => q + 1)} className="w-10 h-11 grid place-items-center hover:bg-surface-2">+</button>
                  </div>
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
                          {ajouteDevis ? "✓ Ajouté au devis" : "+ Ajouter au devis"}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {surDevis && <p className="text-[12.5px] text-ink-soft mt-2.5">Sans engagement — nos experts vous recontactent avec un devis personnalisé.</p>}
              </div>
            )}
          </div>

          {phase !== "recap" && (
            <div className="mt-6">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: etapeTotalNum }).map((_, i) => (
                  <div key={i} className={`h-[5px] flex-1 rounded-full transition-all duration-300 ${i < etapeActuelleNum ? "bg-orange" : "bg-line"}`} />
                ))}
              </div>
              <p className="text-[11.5px] text-ink-soft mt-2 text-right">Étape {etapeActuelleNum} sur {etapeTotalNum}</p>
            </div>
          )}

          {peutReculer && (
            <div className="mt-6">
              <button onClick={reculer} className="text-[14px] font-semibold text-ink-soft hover:text-ink">← Retour</button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-8 text-center text-[12px]">
            <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Livraison</span><span className="text-ink-soft">& montage</span></div>
            <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Garantie 7 ans</span><span className="text-ink-soft">offerte</span></div>
            <div className="rounded-xl border border-line py-3 px-2"><span className="block font-display font-bold text-ink text-[13px]">Conseil 3D</span><span className="text-ink-soft">sur devis</span></div>
          </div>
        </div>
      </div>

      {carte.sectionsDevis?.length > 0 && (
        <div className="mt-14 pt-14 border-t border-line">
          {carte.sectionsDevis.map((s) => (
            <div key={s.id} className="mb-10 last:mb-0">
              {s.titre && <h2 className="font-display font-bold text-2xl mb-4">{s.titre}</h2>}
              {s.contenu && <div className="prose prose-sm max-w-none text-ink-soft leading-relaxed" dangerouslySetInnerHTML={{ __html: s.contenu }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}