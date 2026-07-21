"use client";
import { useState, useMemo } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useDevis } from "@/components/devis/DevisContext";
import { filtrerDeclinaisons, resoudreDeclinaison, prochainAxe, compterAxesRestants } from "@/lib/declinaisonsLibres";
import GalerieProduit from "@/components/GalerieProduit";
import FavoriButton from "@/components/FavoriButton";

const fmt = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

export default function FicheProduitLibre({ data }) {
  const { addItem } = useCart();
  const { addDevis } = useDevis();
  const { carte, gammeNom, gammeSlug, groupesFinition, favori, connecte } = data;
  const axes = carte.axesDeclinaisons || [];
  const declinaisons = carte.declinaisons || [];
  const images = carte.images?.length ? carte.images : [];

  const finitionsAVoter = useMemo(
    () => [...(groupesFinition || []), ...((carte.finitionsProduit) || [])],
    [groupesFinition, carte.finitionsProduit]
  );

  const [historique, setHistorique] = useState([]); // [{axeId, nom, valeur}]
  const [reponses, setReponses] = useState({});
  const [prefValeurs, setPrefValeurs] = useState({});
  const [finitionsSel, setFinitionsSel] = useState({});
  const [phase, setPhase] = useState("config"); // config | recap
  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);
  const [ajouteDevis, setAjouteDevis] = useState(false);

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
  const peutAjouter = !!declinaisonFinale && finitionsOK;

  const ajouterPanier = () => {
    if (!peutAjouter) return;
    addItem(
      {
        codeRacine: declinaisonFinale.id,
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
                {etapeCourante.valeurs.map((v) => {
                  const actif = prefValeurs[etapeCourante.axe.id] === v;
                  return (
                    <button key={v} onClick={() => choisirValeur(etapeCourante.axe.id, etapeCourante.axe.nom, v)} className={gros(actif)}>{v}</button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "recap" && (
            <div>
              <p className="font-semibold text-ink text-[16px] mb-3.5">Votre configuration</p>
              {declinaisonFinale ? (
                <div className="rounded-2xl border border-line divide-y divide-line overflow-hidden mb-5">
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
                  <div className="px-4 py-3 flex justify-between items-center bg-surface-2/40">
                    <span className="text-ink-soft text-[13.5px]">Prix unitaire HT</span>
                    <span className="font-display font-bold text-lg">{fmt(prixHT)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-ink-soft bg-surface-2 rounded-xl px-4 py-3 mb-4">Configuration incomplète — revenez en arrière.</p>
              )}
              {!finitionsOK && (
                <p className="text-[13px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3 mb-4">Choisissez une finition dans chaque catégorie ci-dessus avant de continuer.</p>
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
  );
}