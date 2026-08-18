"use client";
import { useState, useMemo } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useDevis } from "@/components/devis/DevisContext";
import { filtrerDeclinaisons, resoudreDeclinaison, prochainAxe, compterAxesRestants } from "@/lib/declinaisonsLibres";
import GalerieProduit from "@/components/GalerieProduit";
import FavoriButton from "@/components/FavoriButton";

const fmt = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

// ─────────── Helpers option (déclinaisons + finitions) ───────────
const estDeclOption = (o) => !(o.sansDeclinaisons ?? true) && (o.axes || []).length > 0;

// Déclinaison de l'option correspondant aux valeurs choisies (toutes les valeurs requises)
const declinaisonOption = (o, valeurs) => {
  const axes = o.axes || [];
  if (!axes.length || !axes.every((a) => valeurs?.[a.id])) return null;
  return (o.declinaisons || []).find((d) => axes.every((a) => (d.valeurs || {})[a.id] === valeurs[a.id])) || null;
};

const prixOption = (o, cfg) => {
  if (!estDeclOption(o)) {
    const p = o.prixVenteHT ?? o.prixHT;
    return p != null ? Number(p) : null;
  }
  const d = declinaisonOption(o, cfg?.valeurs || {});
  return d && d.prixVenteHT != null ? Number(d.prixVenteHT) : null;
};

// Groupes de finitions applicables à une option : groupes nommés (Piètement, Plateau…) + ceux liés aux valeurs choisies
const groupesFinitionOption = (o, valeurs) => {
  const g = [];
  // Groupes de finitions nommés (ex : Piètement, Plateau) — toujours affichés
  (o.groupesFinition || []).forEach((grp) => {
    if (grp.finitions?.length) g.push({ id: `opt:${o.id}:grp:${grp.id}`, nom: grp.nom || "Coloris", finitions: grp.finitions });
  });
  // Finitions liées à une valeur d'axe choisie (finitionsParValeur)
  (o.axes || []).forEach((a) => {
    const v = valeurs?.[a.id];
    const fins = v && a.finitionsParValeur ? a.finitionsParValeur[v] : null;
    if (fins?.length) g.push({ id: `opt:${o.id}:axe:${a.id}:${v}`, nom: `${a.nom} — ${v}`, finitions: fins });
  });
  return g;
};

const optionConfiguree = (o, cfg) => {
  if (!cfg) return true;
  if (estDeclOption(o)) {
    const axes = o.axes || [];
    if (!axes.every((a) => cfg.valeurs?.[a.id])) return false;
    if (!declinaisonOption(o, cfg.valeurs)) return false;
  }
  const groupes = groupesFinitionOption(o, cfg.valeurs || {});
  if (!groupes.every((gr) => cfg.finitions?.[gr.id])) return false;
  return true;
};

const libelleOption = (o, cfg) => {
  const parts = [];
  (o.axes || []).forEach((a) => { if (cfg?.valeurs?.[a.id]) parts.push(cfg.valeurs[a.id]); });
  groupesFinitionOption(o, cfg?.valeurs || {}).forEach((gr) => {
    const f = gr.finitions.find((x) => (x.id || x.nom) === cfg?.finitions?.[gr.id]);
    if (f) parts.push(f.nom);
  });
  return parts.join(" / ");
};

export default function FicheProduitLibre({ data }) {
  const { addItem } = useCart();
  const { addDevis } = useDevis();
  const { carte, gammeNom, gammeSlug, groupesFinition, favori, connecte } = data;
  const axes = carte.axesDeclinaisons || [];
  const declinaisons = carte.declinaisons || [];
  const images = carte.images?.length ? carte.images : [];
  const optionsDispo = (carte.optionsAdditionnelles || []).filter((o) => {
    if (!o || !o.nom) return false;
    if (estDeclOption(o)) return (o.declinaisons || []).length > 0;
    return (o.prixVenteHT ?? o.prixHT) != null;
  });

  const [historique, setHistorique] = useState([]); // [{axeId, nom, valeur}]
  const [reponses, setReponses] = useState({});
  const [prefValeurs, setPrefValeurs] = useState({});
  const [finitionsSel, setFinitionsSel] = useState({});
  const [phase, setPhase] = useState("config"); // config | recap
  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);
  const [ajouteDevis, setAjouteDevis] = useState(false);
  const [optionsCfg, setOptionsCfg] = useState({}); // { [id]: { qte, valeurs:{}, finitions:{} } }
  const [lightbox, setLightbox] = useState(null); // { option, index } ou null

  const toggleOption = (id) =>
    setOptionsCfg((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = { qte: 1, valeurs: {}, finitions: {} }; return n; });
  const setQteOption = (id, q) =>
    setOptionsCfg((s) => (s[id] ? { ...s, [id]: { ...s[id], qte: Math.max(1, q) } } : s));
  const setValeurOption = (id, axeId, val) =>
    setOptionsCfg((s) => {
      const cur = s[id] || { qte: 1, valeurs: {}, finitions: {} };
      const valeurs = { ...cur.valeurs, [axeId]: val };
      const finitions = { ...cur.finitions };
      Object.keys(finitions).forEach((k) => { if (k.startsWith(`opt:${id}:axe:${axeId}:`)) delete finitions[k]; });
      return { ...s, [id]: { ...cur, valeurs, finitions } };
    });
  const setFinitionOption = (id, groupeId, finVal) =>
    setOptionsCfg((s) => (s[id] ? { ...s, [id]: { ...s[id], finitions: { ...s[id].finitions, [groupeId]: finVal } } } : s));

  const totalOptions = optionsDispo.reduce((t, o) => {
    const cfg = optionsCfg[o.id];
    if (!cfg) return t;
    const p = prixOption(o, cfg);
    return t + (p != null && optionConfiguree(o, cfg) ? p * cfg.qte : 0);
  }, 0);
  const optionsOK = optionsDispo.every((o) => !optionsCfg[o.id] || optionConfiguree(o, optionsCfg[o.id]));

  // Groupes de finitions rattachés aux valeurs d'axe choisies (finitionsParValeur) du PRODUIT.
  const groupesValeur = useMemo(() => {
    const out = [];
    for (const a of axes) {
      const val = reponses[a.id];
      const fins = val && a.finitionsParValeur ? a.finitionsParValeur[val] : null;
      if (fins && fins.length) {
        out.push({
          id: `axe:${a.id}:${val}`,
          nom: `${a.nom} — ${val}`,
          finitions: fins.map((f, i) => ({ id: f.id || `${a.id}:${val}:${i}`, nom: f.nom, couleur: f.couleur || null, imageUrl: f.imageUrl || null })),
        });
      }
    }
    return out;
  }, [axes, reponses]);

  const finitionsAVoter = useMemo(() => {
    const groupes = [...(groupesFinition || []), ...((carte.finitionsProduit) || []), ...groupesValeur];
    return groupes.map((g) => ({
      ...g,
      finitions: [...(g.finitions || [])]
        .map((f, i) => ({ f, i }))
        .sort((a, b) => ((a.f.ordre ?? a.i) - (b.f.ordre ?? b.i)))
        .map((x) => x.f),
    }));
  }, [groupesFinition, carte.finitionsProduit, groupesValeur]);

  const dejaTraites = useMemo(() => new Set(historique.map((h) => h.axeId)), [historique]);

  const etapeCourante = useMemo(() => {
    if (phase !== "config") return null;
    return prochainAxe(axes, declinaisons, reponses, dejaTraites);
  }, [phase, axes, declinaisons, reponses, dejaTraites]);

  useMemo(() => {
    if (phase === "config" && etapeCourante === null) setPhase("recap");
  }, [phase, etapeCourante]);

  const { match } = useMemo(() => resoudreDeclinaison(declinaisons, reponses), [declinaisons, reponses]);
  const declinaisonFinale = match || (declinaisons.length === 1 ? declinaisons[0] : null);
  const prixHT = declinaisonFinale ? declinaisonFinale.prixVenteHT : (declinaisons.length ? Math.min(...declinaisons.map((d) => Number(d.prixVenteHT) || 0)) : null);
  const ttc = prixHT != null ? prixHT * 1.2 : null;

  const nbRepondu = historique.length;
  const nbRestant = phase === "config" ? compterAxesRestants(axes, declinaisons, reponses, dejaTraites) : 0;
  const etapeActuelleNum = nbRepondu;
  const etapeTotalNum = nbRepondu + nbRestant;

  const choisirValeur = (axeId, nomAxe, valeur) => {
    setHistorique((h) => [...h, { axeId, nom: nomAxe, valeur }]);
    setReponses((r) => ({ ...r, [axeId]: valeur }));
    setPrefValeurs((p) => ({ ...p, [axeId]: valeur }));
    setFinitionsSel((f) => {
      const n = { ...f };
      Object.keys(n).forEach((k) => { if (k.startsWith(`axe:${axeId}:`)) delete n[k]; });
      return n;
    });
  };

  const choisirFinition = (groupeId, finitionId) => {
    setFinitionsSel((f) => ({ ...f, [groupeId]: finitionId }));
  };

  const popDerniereReponse = () => {
    setHistorique((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setReponses((r) => { const n = { ...r }; delete n[last.axeId]; return n; });
      setPrefValeurs((p) => { const n = { ...p }; delete n[last.axeId]; return n; });
      setFinitionsSel((f) => { const n = { ...f }; Object.keys(n).forEach((k) => { if (k.startsWith(`axe:${last.axeId}:`)) delete n[k]; }); return n; });
      return h.slice(0, -1);
    });
  };

  const reculer = () => {
    if (historique.length === 0) return;
    popDerniereReponse();
    setPhase("config");
  };

  const libelleDeclinaison = () => {
    const parts = historique.map((h) => h.valeur);
    for (const g of finitionsAVoter) {
      const f = g.finitions.find((x) => x.id === finitionsSel[g.id]);
      if (f) parts.push(f.nom);
    }
    return parts.join(" / ");
  };

  const finitionsOK = finitionsAVoter.length === 0 || finitionsAVoter.every((g) => finitionsSel[g.id]);
  const peutAjouter = !!declinaisonFinale && finitionsOK && optionsOK;

  const ajouterPanier = () => {
    if (!peutAjouter) return;
    const parentId = addItem(
      {
        type: "nouveau",
        vitrineId: carte.id,
        declinaisonId: declinaisonFinale.id,
        slug: carte.slug,
        categorieSlug: carte.categorieSlug || null,
        sousCategorieSlug: carte.sousCategorieSlug || null,
        designation: carte.nom,
        marque: "Buronomic",
        image: images[0] || null,
        prix: prixHT,
      },
      libelleDeclinaison() || null, qte
    );
    // Chaque option cochée = une ligne rattachée au produit parent.
    // On transporte vitrineId + optionId (+ optionDeclinaisonId) pour vérif du prix en base au paiement.
    optionsDispo.forEach((o) => {
      const cfg = optionsCfg[o.id];
      if (!cfg) return;
      const d = estDeclOption(o) ? declinaisonOption(o, cfg.valeurs) : null;
      const prix = prixOption(o, cfg);
      if (prix == null) return;
      const ref = (d && d.referenceFournisseur) || o.reference || null;
      const lbl = libelleOption(o, cfg);
      addItem(
        {
          codeRacine: `opt-${o.id}-${d ? d.id : "simple"}`,
          vitrineId: carte.id,
          optionId: o.id,
          optionDeclinaisonId: d ? d.id : null,
          reference: ref,
          slug: carte.slug,
          categorieSlug: carte.categorieSlug || null,
          sousCategorieSlug: carte.sousCategorieSlug || null,
          designation: o.nom + (lbl ? ` — ${lbl}` : ""),
          marque: "Buronomic",
          image: (o.images && o.images[0]) || null,
          prix,
          parentId,
        },
        lbl || null, cfg.qte
      );
    });
    setAjoute(true); setTimeout(() => setAjoute(false), 2000);
  };

  const ajouterAuDevisAussi = () => {
    if (!declinaisonFinale || !finitionsOK) return;
    addDevis({ codeRacine: declinaisonFinale.id, gammeSlug, carteSlug: carte.slug, designation: carte.nom, gammeNom, image: images[0] || null, config: libelleDeclinaison() || null, prixIndicatif: prixHT }, qte);
    setAjouteDevis(true); setTimeout(() => setAjouteDevis(false), 2000);
  };

  const gros = (actif) => `px-4 py-2.5 rounded-xl border text-[13.5px] font-medium transition ${
    actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50 hover:bg-surface-2"}`;

  const peutReculer = historique.length > 0;

  return (
    <div>
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div className="lg:sticky lg:top-6">
          <GalerieProduit images={images} alt={carte.nom} />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{gammeNom}</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">{carte.nom}</h1>

          <div className="flex items-end gap-3 mt-5">
            {!declinaisonFinale && <span className="text-ink-soft text-[15px] mb-1">à partir de</span>}
            <span className="font-display font-bold text-3xl">{fmt(prixHT)}</span>
            <span className="text-ink-soft mb-1">HT</span>
            {ttc != null && <span className="text-[13px] text-ink-soft mb-1.5">· {fmt(ttc)} TTC</span>}
          </div>

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
            {phase === "config" && etapeCourante && (
              <div>
                <p className="font-semibold text-ink text-[16px] mb-3.5">{etapeCourante.axe.nom}</p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const ordre = etapeCourante.axe.valeurs || [];
                    const rang = (v) => { const i = ordre.indexOf(v); return i === -1 ? 9999 : i; };
                    return [...etapeCourante.valeurs].sort((a, b) => rang(a) - rang(b)).map((v) => {
                      const actif = prefValeurs[etapeCourante.axe.id] === v;
                      return (
                        <button key={v} onClick={() => choisirValeur(etapeCourante.axe.id, etapeCourante.axe.nom, v)} className={gros(actif)}>{v}</button>
                      );
                    });
                  })()}
                </div>
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

          {optionsDispo.length > 0 && (
            <div className="mt-6 pt-6 border-t border-line">
              <p className="font-semibold text-ink text-[16px] mb-1">Options / Accessoires</p>
              <p className="text-[12.5px] text-ink-soft mb-4">Ajoutez des accessoires. Chaque option s'ajoute au panier avec sa propre référence.</p>
              <div className="flex flex-col gap-2.5">
                {optionsDispo.map((o) => (
                  <OptionRow
                    key={o.id}
                    o={o}
                    cfg={optionsCfg[o.id]}
                    onToggle={toggleOption}
                    onQte={setQteOption}
                    onValeur={setValeurOption}
                    onFinition={setFinitionOption}
                    onZoom={setLightbox}
                  />
                ))}
              </div>
              {totalOptions > 0 && (
                <p className="text-[13px] text-ink-soft mt-3 text-right">Total options : <span className="font-bold text-ink">+ {fmt(totalOptions)}</span></p>
              )}
            </div>
          )}

          {phase === "recap" && (
            <div className="mt-6">
              <p className="font-semibold text-ink text-[16px] mb-3.5">Votre configuration</p>
              {declinaisonFinale ? (
                <div className="rounded-2xl border border-line divide-y divide-line overflow-hidden">
                  <div className="px-4 py-3 text-[13.5px] flex justify-between gap-4">
                    <span className="text-ink-soft">Modèle</span>
                    <span className="text-ink font-medium text-right">{carte.nom}</span>
                  </div>
                  {historique.map((h) => (
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
                  {optionsDispo.filter((o) => optionsCfg[o.id]).map((o) => {
                    const cfg = optionsCfg[o.id];
                    const p = prixOption(o, cfg);
                    const lbl = libelleOption(o, cfg);
                    return (
                      <div key={o.id} className="px-4 py-3 text-[13.5px] flex justify-between gap-4">
                        <span className="text-ink-soft">Option · {o.nom}{lbl ? ` (${lbl})` : ""}{cfg.qte > 1 ? ` ×${cfg.qte}` : ""}</span>
                        <span className="text-ink font-medium">+ {fmt((p || 0) * cfg.qte)}</span>
                      </div>
                    );
                  })}
                  <div className="px-4 py-3 flex justify-between items-center bg-surface-2/40">
                    <span className="text-ink-soft text-[13.5px]">{totalOptions > 0 ? "Total HT" : "Prix unitaire HT"}</span>
                    <span className="font-display font-bold text-lg">{fmt((prixHT != null ? prixHT * qte : 0) + totalOptions)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-ink-soft bg-surface-2 rounded-xl px-4 py-3">Configuration incomplète — revenez en arrière.</p>
              )}
            </div>
          )}

          {phase === "recap" && (
            <div className="mt-5">
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
                <button onClick={ajouterPanier} disabled={!peutAjouter} className="flex-1 min-w-[180px] rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {ajoute ? "✓ Ajouté" : "Ajouter au panier"}
                </button>
                {declinaisonFinale && (
                  <button onClick={ajouterAuDevisAussi} disabled={!finitionsOK} className="rounded-full bg-charcoal text-white font-semibold px-6 py-3.5 hover:bg-[#2d3035] transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">
                    {ajouteDevis ? "✓ Ajouté au devis" : "+ Ajouter au devis"}
                  </button>
                )}
              </div>
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

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ background: "rgba(33,38,42,0.72)", backdropFilter: "blur(2px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="text-center">
            <div className="relative inline-block">
              {(lightbox.option.images || []).length > 1 && (
                <>
                  <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index - 1 + l.option.images.length) % l.option.images.length }))} className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white grid place-items-center text-charcoal">‹</button>
                  <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index + 1) % l.option.images.length }))} className="absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white grid place-items-center text-charcoal">›</button>
                </>
              )}
              <img src={lightbox.option.images[lightbox.index]} alt={lightbox.option.nom} className="max-w-[70vw] max-h-[70vh] rounded-2xl border-4 border-white object-contain" />
            </div>
            <p className="text-white text-[14px] font-semibold mt-3">{lightbox.option.nom}{(lightbox.option.images || []).length > 1 ? ` (${lightbox.index + 1}/${lightbox.option.images.length})` : ""}</p>
            {(lightbox.option.images || []).length > 1 && (
              <div className="flex gap-1.5 justify-center mt-2">
                {lightbox.option.images.map((im, k) => (
                  <button key={k} onClick={() => setLightbox((l) => ({ ...l, index: k }))} className="w-9 h-9 rounded-lg overflow-hidden" style={{ border: k === lightbox.index ? "2px solid #f0661b" : "2px solid transparent" }}>
                    <img src={im} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-[12px] text-white/70 mt-2">Cliquer à l'extérieur pour fermer</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── Une option configurable (déclinaison + finitions + quantité) ───────────
function OptionRow({ o, cfg, onToggle, onQte, onValeur, onFinition, onZoom }) {
  const sel = !!cfg;
  const q = cfg?.qte || 1;
  const img = (o.images && o.images[0]) || null;
  const multi = (o.images || []).length > 1;
  const decl = estDeclOption(o);
  const prix = prixOption(o, cfg || { valeurs: {} });
  const groupes = groupesFinitionOption(o, cfg?.valeurs || {});
  const configuree = optionConfiguree(o, cfg);

  const valeurBtn = (actif) => `px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition ${
    actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50"}`;

  return (
    <div className={`p-3 rounded-xl border transition ${sel ? "border-orange bg-orange-tint" : "border-line"}`}>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={sel} onChange={() => onToggle(o.id)} style={{ width: 18, height: 18, accentColor: "#f0661b", cursor: "pointer" }} />
        <button type="button" onClick={() => img && onZoom({ option: o, index: 0 })} className="relative w-[54px] h-[54px] rounded-lg overflow-hidden shrink-0 bg-surface-2" style={{ cursor: img ? "zoom-in" : "default" }}>
          {img ? <img src={img} alt={o.nom} className="w-full h-full object-cover" /> : null}
          {multi && <span className="absolute bottom-0.5 right-0.5 bg-charcoal/80 text-white text-[10px] font-bold px-1.5 rounded">{o.images.length}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink">{o.nom}</p>
          {o.description && <p className="text-[12px] text-ink-soft leading-snug">{o.description}</p>}
          {!decl && o.reference && <p className="text-[12px] text-ink-soft">Réf. {o.reference}</p>}
        </div>
        {sel && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onQte(o.id, q - 1)} className="w-7 h-7 rounded-lg border border-line bg-surface-2 grid place-items-center">−</button>
            <span className="w-5 text-center text-[14px] font-bold">{q}</span>
            <button type="button" onClick={() => onQte(o.id, q + 1)} className="w-7 h-7 rounded-lg border border-line bg-surface-2 grid place-items-center">+</button>
          </div>
        )}
        <span className="text-[14px] font-bold text-orange-dark whitespace-nowrap min-w-[80px] text-right">
          {decl && !configuree ? "à configurer" : `+ ${fmt((prix != null ? prix : 0) * (sel ? q : 1))}`}
        </span>
      </div>

      {sel && decl && (
        <div className="mt-3 pl-9 flex flex-col gap-3">
          {(o.axes || []).map((a) => (
            <div key={a.id}>
              <p className="text-[12.5px] font-semibold text-ink mb-1.5">
                {a.nom}{!cfg.valeurs?.[a.id] && <span className="text-orange-dark font-medium"> · à choisir</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {(a.valeurs || []).map((v) => (
                  <button key={v} type="button" onClick={() => onValeur(o.id, a.id, v)} className={valeurBtn(cfg.valeurs?.[a.id] === v)}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && groupes.length > 0 && (
        <div className="mt-3 pl-9 flex flex-col gap-3">
          {groupes.map((gr) => (
            <div key={gr.id}>
              <p className="text-[12.5px] font-semibold text-ink mb-1.5">
                {gr.nom}{!cfg.finitions?.[gr.id] && <span className="text-orange-dark font-medium"> · à choisir</span>}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {gr.finitions.map((f) => {
                  const val = f.id || f.nom;
                  const actif = cfg.finitions?.[gr.id] === val;
                  return (
                    <button key={val} type="button" onClick={() => onFinition(o.id, gr.id, val)} title={f.nom} className="flex flex-col items-center gap-1">
                      <span className={`rounded-full border-2 overflow-hidden block ${actif ? "border-orange" : "border-line hover:border-orange/40"}`} style={{ width: 36, height: 36, background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                        {f.imageUrl && <img src={f.imageUrl} alt={f.nom} className="w-full h-full object-cover rounded-full" />}
                      </span>
                      <span className={`text-[10.5px] ${actif ? "text-orange-dark font-semibold" : "text-ink-soft"}`}>{f.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}