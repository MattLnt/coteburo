"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "@/components/cart/PaymentForm";
import { accepterDevis, refuserDevis } from "./actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const euro = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const champStyle = "w-full rounded-xl border border-line bg-surface px-3.5 sm:px-4 py-3 text-[13.5px] sm:text-sm text-ink outline-none focus:border-orange transition";
const labelStyle = "block text-[12px] sm:text-[13px] font-semibold mb-1.5 text-ink";

export default function MonDevisClient({ devis, finitionsParVitrine, telephone, email }) {
  const [etape, setEtape] = useState("devis"); // devis | finitions | paiement | refuse
  const [choix, setChoix] = useState({}); // { ligneId: { groupeId: "Palette — Nom" } }
  const [clientSecret, setClientSecret] = useState("");
  const [numero, setNumero] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirmRefus, setConfirmRefus] = useState(false);

  const [adresse, setAdresse] = useState({
    prenom: devis.prenom || "",
    nom: devis.nom || "",
    societe: devis.societe || "",
    adresse: devis.adresse || "",
    complement: devis.complement || "",
    codePostal: devis.codePostal || "",
    ville: devis.ville || "",
  });
  const setAdr = (k, v) => { setAdresse((a) => ({ ...a, [k]: v })); setErreur(""); };

  const expire = devis.dateValidite && new Date(devis.dateValidite) < new Date();
  const dejaAccepte = devis.statut === "accepte";
  const dejaRefuse = devis.statut === "refuse" || etape === "refuse";

  // Groupes de finitions à choisir, ligne par ligne
  const lignesAvecFinitions = useMemo(() => {
    return devis.lignes.map((l) => ({
      ligne: l,
      groupes: (l.vitrineId && finitionsParVitrine[l.vitrineId]) || [],
    }));
  }, [devis.lignes, finitionsParVitrine]);

  const totalChoix = lignesAvecFinitions.reduce((n, x) => n + x.groupes.length, 0);
  const choixFaits = lignesAvecFinitions.reduce((n, x) => {
    const c = choix[x.ligne.id] || {};
    return n + x.groupes.filter((g) => c[g.id]).length;
  }, 0);
  const restants = totalChoix - choixFaits;
  const tousChoisis = restants === 0;

  const choisir = (ligneId, groupeId, valeur) => {
    setChoix((c) => ({ ...c, [ligneId]: { ...(c[ligneId] || {}), [groupeId]: valeur } }));
  };

  const adresseComplete = ["prenom", "nom", "adresse", "codePostal", "ville"].every((k) => adresse[k]?.trim());

  const lancerPaiement = async () => {
    if (!adresseComplete) { setErreur("Merci de compléter votre adresse de livraison."); return; }
    setEnvoi(true);
    setErreur("");
    const res = await accepterDevis(devis.token, { finitions: choix, client: adresse });
    setEnvoi(false);
    if (res?.error) { setErreur(res.error); return; }
    setClientSecret(res.clientSecret);
    setNumero(res.numero);
    setEtape("paiement");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const lancerRefus = async () => {
    setConfirmRefus(false);
    setEnvoi(true);
    await refuserDevis(devis.token);
    setEnvoi(false);
    setEtape("refuse");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: "flat",
      variables: {
        colorPrimary: "#f0661b", colorBackground: "#ffffff", colorText: "#23262a",
        colorDanger: "#d9551a", fontFamily: "system-ui, sans-serif",
        borderRadius: "12px", spacingUnit: "4px",
      },
    },
  };

  // ══ Devis déjà accepté ══
  if (dejaAccepte && etape !== "paiement") {
    return (
      <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-12 sm:py-20 text-center">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-[#e8f6f0] text-[#1f7a52]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h1 className="font-display font-bold text-[24px] sm:text-3xl">Devis déjà accepté</h1>
        <p className="text-ink-soft mt-3 text-[13.5px] sm:text-base leading-relaxed">
          Vous avez accepté le devis {devis.numero}. Notre équipe vous contacte pour organiser la livraison.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-center gap-2.5 mt-7">
          <a href={`/api/devis/${devis.id}/pdf?token=${devis.token}`} target="_blank" rel="noopener noreferrer"
            className="rounded-full border border-line font-semibold px-6 py-3.5 text-[13.5px] hover:bg-ink hover:text-white transition">
            Télécharger le devis
          </a>
          <Link href="/compte/commandes" className="rounded-full bg-orange text-white font-semibold px-6 py-3.5 text-[13.5px] hover:bg-orange-dark transition">
            Suivre ma commande
          </Link>
        </div>
      </main>
    );
  }

  // ══ Devis refusé ══
  if (dejaRefuse) {
    return (
      <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-12 sm:py-20 text-center">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-surface-2 text-ink-soft">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </div>
        <h1 className="font-display font-bold text-[24px] sm:text-3xl">Devis décliné</h1>
        <p className="text-ink-soft mt-3 text-[13.5px] sm:text-base leading-relaxed max-w-md mx-auto">
          Nous avons bien noté votre réponse. Si votre projet évolue ou si vous souhaitez une proposition ajustée, nous restons à votre disposition.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-center gap-2.5 mt-7">
          <a href={`tel:${telephone.replace(/\s/g, "")}`} className="rounded-full bg-orange text-white font-semibold px-6 py-3.5 text-[13.5px] hover:bg-orange-dark transition">
            {telephone}
          </a>
          <Link href="/catalogue" className="rounded-full border border-line font-semibold px-6 py-3.5 text-[13.5px] hover:bg-ink hover:text-white transition">
            Voir le catalogue
          </Link>
        </div>
      </main>
    );
  }

  // ══ Étape paiement ══
  if (etape === "paiement" && clientSecret) {
    return (
      <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-6 sm:py-14 pb-[150px] lg:pb-14">
        <h1 className="font-display font-bold text-[24px] sm:text-4xl mb-4 sm:mb-6">Régler ma commande</h1>

        <div className="flex items-center gap-2 mb-5 sm:mb-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-orange text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <span className="text-[12px] text-ink-soft">Finitions</span>
          </div>
          <span className="flex-1 h-[1.5px] rounded-full bg-orange" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-orange text-white text-[11px] font-semibold">2</span>
            <span className="text-[12px] font-semibold text-ink">Paiement</span>
          </div>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6 mb-3">
          <h2 className="font-display font-bold text-[15px] sm:text-lg mb-3.5">Livraison</h2>
          <div className="rounded-xl bg-surface-2 px-3.5 sm:px-4 py-3 text-[12px] sm:text-[13px] text-ink-soft leading-relaxed">
            <span className="font-semibold text-ink">{adresse.prenom} {adresse.nom}</span>{adresse.societe ? ` · ${adresse.societe}` : ""}<br />
            {adresse.adresse}{adresse.complement ? `, ${adresse.complement}` : ""}, {adresse.codePostal} {adresse.ville}<br />
            {devis.email}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <h2 className="font-display font-bold text-[15px] sm:text-lg mb-3.5 sm:mb-5">Paiement</h2>
          <Elements stripe={stripePromise} options={stripeOptions}>
            <PaymentForm numero={numero} email={devis.email} montant={devis.totalTTC} />
          </Elements>
        </section>
      </main>
    );
  }

  // ══ Étape finitions ══
  if (etape === "finitions") {
    return (
      <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-6 sm:py-14 pb-[170px]">
        <button onClick={() => setEtape("devis")} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-orange mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg>
          Retour au devis
        </button>

        <h1 className="font-display font-bold text-[24px] sm:text-4xl mb-4 sm:mb-6">Finalisez votre commande</h1>

        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-orange text-white text-[11px] font-semibold">1</span>
            <span className="text-[12px] font-semibold text-ink">Finitions</span>
          </div>
          <span className="flex-1 h-[1.5px] rounded-full bg-line" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-line text-ink-soft text-[11px] font-semibold">2</span>
            <span className="text-[12px] text-ink-soft">Paiement</span>
          </div>
        </div>

        {totalChoix > 0 && (
          <p className="text-ink-soft text-[13px] sm:text-[14px] mb-4 leading-relaxed">
            Choisissez les coloris de vos produits. Ils n&apos;ont aucun impact sur le prix.
          </p>
        )}

        <div className="flex flex-col gap-2.5 sm:gap-3">
          {lignesAvecFinitions.map(({ ligne, groupes }) => (
            <div key={ligne.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-[9px] bg-surface-2 shrink-0 overflow-hidden grid place-items-center">
                  {ligne.imageUrl ? (
                    <img src={ligne.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-soft/30"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-[13px] leading-snug">{ligne.designation}</p>
                  <p className="text-[10.5px] text-ink-soft mt-0.5">
                    {[ligne.config, `Qté ${ligne.quantite}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {groupes.length === 0 ? (
                <p className="text-[11.5px] text-ink-soft/70 mt-3">Aucun choix à faire</p>
              ) : (
                groupes.map((g, gi) => {
                  const valeur = (choix[ligne.id] || {})[g.id];
                  return (
                    <div key={g.id} className={gi === 0 ? "mt-3.5" : "mt-3.5 pt-3.5 border-t border-line"}>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[12px] font-semibold text-ink">{g.nom}</span>
                        {valeur ? (
                          <span className="text-[#1f7a52] flex">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" fill="none" stroke="#fff" strokeWidth="2.5" /></svg>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-orange-dark">À choisir</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2.5 sm:gap-3">
                        {g.finitions.map((f) => {
                          const label = f.paletteNom ? `${f.paletteNom} — ${f.nom}` : f.nom;
                          const actif = valeur === label;
                          return (
                            <button key={f.id} type="button" onClick={() => choisir(ligne.id, g.id, label)} title={label}
                              className="flex flex-col items-center gap-1 w-[46px]">
                              <span className={`block w-[38px] h-[38px] rounded-full border-2 overflow-hidden transition ${actif ? "border-orange" : "border-line"}`}
                                style={{ background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                                {f.imageUrl && <img src={f.imageUrl} alt="" className="w-full h-full object-cover rounded-full" />}
                              </span>
                              <span className={`text-[9px] text-center leading-tight ${actif ? "text-orange-dark font-semibold" : "text-ink-soft"}`}>{f.nom}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>

        {/* Adresse de livraison — modifiable avant paiement */}
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 mt-2.5 sm:mt-3">
          <h2 className="font-display font-bold text-[15px] mb-3.5">Adresse de livraison</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelStyle}>Prénom *</label>
              <input className={champStyle} value={adresse.prenom} onChange={(e) => setAdr("prenom", e.target.value)} />
            </div>
            <div>
              <label className={labelStyle}>Nom *</label>
              <input className={champStyle} value={adresse.nom} onChange={(e) => setAdr("nom", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelStyle}>Société</label>
              <input className={champStyle} value={adresse.societe} onChange={(e) => setAdr("societe", e.target.value)} placeholder="Optionnel" />
            </div>
            <div className="col-span-2">
              <label className={labelStyle}>Adresse *</label>
              <input className={champStyle} value={adresse.adresse} onChange={(e) => setAdr("adresse", e.target.value)} placeholder="N° et nom de rue" />
            </div>
            <div className="col-span-2">
              <label className={labelStyle}>Complément</label>
              <input className={champStyle} value={adresse.complement} onChange={(e) => setAdr("complement", e.target.value)} placeholder="Bâtiment, étage… (optionnel)" />
            </div>
            <div>
              <label className={labelStyle}>Code postal *</label>
              <input className={champStyle} value={adresse.codePostal} onChange={(e) => setAdr("codePostal", e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className={labelStyle}>Ville *</label>
              <input className={champStyle} value={adresse.ville} onChange={(e) => setAdr("ville", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Barre fixe */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
          {erreur && (
            <p className="text-[12px] text-orange-dark bg-orange-tint rounded-lg px-3 py-2 mb-2.5 leading-relaxed">{erreur}</p>
          )}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="min-w-0">
              <p className="text-[10.5px] text-ink-soft">Montant TTC</p>
              <p className="font-display font-bold text-[19px] text-ink leading-tight">{euro(devis.totalTTC)}</p>
            </div>
            {restants > 0 && (
              <span className="text-[11px] font-semibold text-orange-dark shrink-0">
                {restants} choix restant{restants > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button onClick={lancerPaiement} disabled={!tousChoisis || envoi || !adresseComplete}
            className="w-full rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-50">
            {envoi ? "Préparation du paiement…" : "Continuer vers le paiement →"}
          </button>
        </div>
      </main>
    );
  }

  // ══ Étape 1 : le devis ══
  return (
    <main className="mx-auto max-w-[720px] px-5 sm:px-7 py-5 sm:py-12 pb-[130px]">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-3xl p-5 sm:p-8 mb-3 sm:mb-4"
        style={{ background: "linear-gradient(150deg, #23262a 0%, #2d2620 60%, #3a2820 100%)" }}>
        <div className="absolute -top-10 -right-8 w-[170px] h-[170px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,102,27,0.3), transparent 70%)" }} />
        <div className="relative">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-orange">Devis {devis.numero}</p>
          <h1 className="font-display font-bold text-white text-[24px] sm:text-3xl mt-2 leading-tight">Votre proposition</h1>
          <p className="text-white/60 text-[12.5px] sm:text-sm mt-2">
            Pour {devis.prenom} {devis.nom}{devis.societe ? ` · ${devis.societe}` : ""}
          </p>
          <div className="mt-4 pt-3.5 border-t border-white/10">
            <p className="text-white/60 text-[11px]">Montant total TTC</p>
            <p className="font-display font-bold text-white text-[28px] sm:text-4xl mt-0.5 leading-none">{euro(devis.totalTTC)}</p>
            {devis.dateValidite && (
              <span className={`inline-block text-[10.5px] font-semibold px-2.5 py-1 rounded-full mt-2.5 ${expire ? "bg-white/10 text-white/70" : "bg-orange/20 text-[#f0a06b]"}`}>
                {expire ? `Expiré le ${dateFR(devis.dateValidite)}` : `Valable jusqu'au ${dateFR(devis.dateValidite)}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <a href={`/api/devis/${devis.id}/pdf?token=${devis.token}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-[12.5px] font-semibold text-ink mb-3 hover:border-orange transition">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
        Télécharger le PDF
      </a>

      {expire && (
        <div className="rounded-2xl bg-orange-tint p-4 mb-3">
          <p className="text-[13px] font-semibold text-orange-dark mb-1">Ce devis a expiré</p>
          <p className="text-[12.5px] text-orange-dark/85 leading-relaxed">
            Vous pouvez toujours le consulter, mais il n&apos;est plus payable en ligne. Contactez-nous pour une proposition à jour.
          </p>
        </div>
      )}

      {devis.noteClient && (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 mb-2.5">
          <div className="flex gap-3">
            <span className="w-[3px] rounded-sm bg-orange shrink-0" />
            <p className="text-[12.5px] sm:text-[13.5px] text-ink-soft leading-relaxed italic whitespace-pre-wrap">{devis.noteClient}</p>
          </div>
        </div>
      )}

      {/* Détail */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <p className="font-display font-bold text-[15px] sm:text-lg px-4 sm:px-5 pt-4 pb-3">Détail</p>

        {devis.lignes.map((l) => (
          <div key={l.id} className="px-4 sm:px-5 py-3 border-t border-line">
            <div className="flex gap-3">
              <div className="w-[50px] h-[50px] rounded-[10px] bg-surface-2 shrink-0 overflow-hidden grid place-items-center">
                {l.imageUrl ? (
                  <img src={l.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-soft/30"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-[13px] leading-snug">{l.designation}</p>
                {l.config && <p className="text-[11px] text-ink-soft mt-0.5">{l.config}</p>}
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <span className="text-[11px] text-ink-soft">Qté {l.quantite}</span>
                  <span className="font-semibold text-ink text-[13.5px] whitespace-nowrap">{euro(l.prixHT * l.quantite)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="px-4 sm:px-5 py-4 border-t border-line bg-surface-2/50">
          <div className="flex justify-between text-[12.5px] mb-1.5"><span className="text-ink-soft">Total HT</span><span className="font-semibold">{euro(devis.totalHT)}</span></div>
          <div className="flex justify-between text-[12.5px] mb-2.5"><span className="text-ink-soft">TVA (20 %)</span><span className="font-semibold">{euro(devis.totalTVA)}</span></div>
          <div className="flex justify-between items-center pt-2.5 border-t border-line">
            <span className="font-display font-bold text-[14.5px]">Total TTC</span>
            <span className="font-display font-bold text-[19px] text-orange">{euro(devis.totalTTC)}</span>
          </div>
        </div>
      </div>

      {/* Refus discret */}
      <button onClick={() => setConfirmRefus(true)} disabled={envoi}
        className="block mx-auto mt-5 text-[12px] font-semibold text-ink-soft hover:text-ink transition">
        Décliner cette proposition
      </button>

      {/* Barre fixe */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex gap-2">
          <a href={`tel:${telephone.replace(/\s/g, "")}`}
            className="px-4 sm:px-5 py-3.5 rounded-full border border-line bg-white text-[12.5px] font-semibold text-ink-soft whitespace-nowrap flex items-center">
            Une question ?
          </a>
          <button onClick={() => setEtape("finitions")} disabled={expire}
            className="flex-1 rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-40">
            {expire ? "Devis expiré" : "Accepter ce devis"}
          </button>
        </div>
      </div>

      {/* Confirmation de refus */}
      {confirmRefus && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
          <div onClick={() => setConfirmRefus(false)} className="absolute inset-0 bg-charcoal/50 backdrop-blur-[2px]" />
          <div className="relative bg-white w-full sm:w-[400px] rounded-t-[22px] sm:rounded-[20px] p-5 sm:p-6"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
            <p className="font-display font-bold text-[17px] text-ink mb-1.5">Décliner cette proposition ?</p>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Nous serons informés de votre décision. Vous pourrez toujours nous recontacter si votre projet évolue.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmRefus(false)}
                className="flex-1 py-3 rounded-full border border-line text-[13.5px] font-semibold text-ink-soft">
                Annuler
              </button>
              <button onClick={lancerRefus} disabled={envoi}
                className="flex-1 py-3 rounded-full bg-charcoal text-white text-[13.5px] font-semibold disabled:opacity-60">
                Décliner
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}