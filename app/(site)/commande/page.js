"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCart } from "@/components/cart/CartContext";
import PaymentForm from "@/components/cart/PaymentForm";
import ModalMotDePasseOublie from "@/components/ModalMotDePasseOublie";
import { getInfosPrefill } from "./actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const fmt = (n) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const champStyle = "w-full rounded-xl border border-line bg-surface px-3.5 sm:px-4 py-3 text-[13.5px] sm:text-sm text-ink outline-none focus:border-orange transition";
const labelStyle = "block text-[12px] sm:text-[13px] font-semibold mb-1.5 text-ink";
const FORM_KEY = "coteburo_commande_infos";

const CRITERES_MDP = [
  { cle: "longueur", label: "9 car. min.", labelLong: "9 caractères min.", test: (p) => p.length >= 9 },
  { cle: "majuscule", label: "Majuscule", labelLong: "Une majuscule", test: (p) => /[A-Z]/.test(p) },
  { cle: "chiffre", label: "Chiffre", labelLong: "Un chiffre", test: (p) => /[0-9]/.test(p) },
  { cle: "symbole", label: "Symbole", labelLong: "Un symbole (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const MODES = [
  ["invite", "Commander en invité"],
  ["connexion", "Se connecter"],
  ["creation", "Créer un compte"],
];

export default function CommandePage() {
  const { data: session, status: sessionStatus } = useSession();
  const { items, totalHT, loaded } = useCart();
  const [form, setForm] = useState({
    email: "", telephone: "", prenom: "", nom: "", societe: "",
    adresse: "", complement: "", codePostal: "", ville: "", pays: "France",
  });
  const [erreurs, setErreurs] = useState({});
  const [erreurGlobale, setErreurGlobale] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [numero, setNumero] = useState("");
  const [etape, setEtape] = useState("infos"); // "infos" | "paiement"
  const [hydrated, setHydrated] = useState(false);
  const [cgvAcceptees, setCgvAcceptees] = useState(false);
  const [recapOuvert, setRecapOuvert] = useState(false);

  const [frais, setFrais] = useState(null);
  const [chargementFrais, setChargementFrais] = useState(true);
  const [avecInstallation, setAvecInstallation] = useState(false);

  const [modeCompte, setModeCompte] = useState("invite"); // "invite" | "connexion" | "creation"
  const [loginEmail, setLoginEmail] = useState("");
  const [loginMdp, setLoginMdp] = useState("");
  const [loginErreur, setLoginErreur] = useState("");
  const [loginEnvoi, setLoginEnvoi] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [mdpOublieOuvert, setMdpOublieOuvert] = useState(false);
  const mdpValide = CRITERES_MDP.every((c) => c.test(motDePasse));

  const connecte = sessionStatus === "authenticated";

  // Restaure les infos saisies depuis sessionStorage au chargement
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FORM_KEY);
      if (raw) setForm((f) => ({ ...f, ...JSON.parse(raw) }));
    } catch {}
    setHydrated(true);
  }, []);

  // Si connecté et formulaire encore vierge, pré-remplit depuis la dernière commande de ce compte
  useEffect(() => {
    if (!hydrated || !connecte || !session?.user?.email) return;
    setForm((f) => {
      if (f.email || f.prenom || f.nom) return f;
      return { ...f, email: session.user.email };
    });
    getInfosPrefill(session.user.email).then((prefill) => {
      if (!prefill) return;
      setForm((f) => {
        if (f.adresse) return f;
        return {
          ...f,
          prenom: prefill.prenom || f.prenom,
          nom: prefill.nom || f.nom,
          telephone: prefill.telephone || f.telephone,
          societe: prefill.societe || f.societe,
          adresse: prefill.adresse || f.adresse,
          complement: prefill.complement || f.complement,
          codePostal: prefill.codePostal || f.codePostal,
          ville: prefill.ville || f.ville,
        };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, connecte, session?.user?.email]);

  // Sauvegarde les infos à chaque changement
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(form)); } catch {}
  }, [form, hydrated]);

  // Interception du bouton "précédent"
  useEffect(() => {
    const onPop = () => {
      if (etape === "paiement") {
        setEtape("infos");
        window.history.pushState({ etape: "infos" }, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [etape]);

  const tva = totalHT * 0.2;
  const totalTTCProduits = totalHT + tva;

  useEffect(() => {
    if (!loaded || items.length === 0) return;
    setChargementFrais(true);
    fetch(`/api/frais?totalTTC=${totalTTCProduits.toFixed(2)}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setFrais(data); })
      .catch(() => {})
      .finally(() => setChargementFrais(false));
  }, [loaded, items.length, totalTTCProduits]);

  useEffect(() => {
    if (frais && !frais.installationDisponible && avecInstallation) setAvecInstallation(false);
  }, [frais, avecInstallation]);

  const fraisLivraison = frais?.fraisLivraison ?? 0;
  const fraisInstallation = avecInstallation ? (frais?.fraisInstallation ?? 0) : 0;
  const totalTTCFinal = totalTTCProduits + fraisLivraison + fraisInstallation;
  const nbArticles = items.reduce((n, it) => n + it.quantite, 0);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreurs((e) => ({ ...e, [k]: false })); };

  const handleLoginInline = async () => {
    setLoginErreur("");
    if (!loginEmail.trim() || !loginMdp) { setLoginErreur("Renseignez votre email et votre mot de passe."); return; }
    setLoginEnvoi(true);
    const res = await signIn("credentials", { email: loginEmail.trim(), password: loginMdp, redirect: false });
    setLoginEnvoi(false);
    if (res?.error) { setLoginErreur("Email ou mot de passe incorrect."); return; }
    setModeCompte("invite"); // la session passe à "connecté", le bloc de choix disparaît automatiquement
  };

  const valider = () => {
    const requis = ["email", "prenom", "nom", "adresse", "codePostal", "ville"];
    const errs = {};
    requis.forEach((k) => { if (!form[k].trim()) errs[k] = true; });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = true;
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinuer = async () => {
    setErreurGlobale("");
    if (!cgvAcceptees) { setErreurGlobale("Merci d'accepter les conditions générales de vente."); return; }
    if (!valider()) {
      setErreurGlobale("Merci de remplir tous les champs obligatoires.");
      // Ramène l'utilisateur au premier champ en erreur : sur mobile, le
      // message est en bas d'écran, loin du champ concerné.
      document.querySelector('[data-erreur="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const creerCompte = !connecte && modeCompte === "creation";
    if (creerCompte && !mdpValide) { setErreurGlobale("Votre mot de passe ne respecte pas tous les critères."); return; }
    setEnvoi(true);
    try {
      const res = await fetch("/api/commande/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: form, items, avecInstallation,
          creerCompte,
          motDePasse: creerCompte ? motDePasse : undefined,
        }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        if (data.compteCree) {
          await signIn("credentials", { email: form.email, password: motDePasse, redirect: false }).catch(() => {});
        }
        setClientSecret(data.clientSecret);
        setNumero(data.numero);
        setEtape("paiement");
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState({ etape: "paiement" }, "");
      } else {
        setErreurGlobale(data.error || "Une erreur est survenue. Réessayez.");
      }
    } catch {
      setErreurGlobale("Impossible de contacter le serveur de paiement.");
    }
    setEnvoi(false);
  };

  const revenirInfos = () => setEtape("infos");

  if (!loaded) {
    return <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-12 sm:py-20"><div className="h-64 rounded-2xl border border-line bg-surface animate-pulse" /></main>;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-12 sm:py-16 text-center">
        <h1 className="font-display font-bold text-[22px] sm:text-3xl">Votre panier est vide</h1>
        <p className="text-ink-soft mt-2 text-[13px] sm:text-base">Ajoutez des articles avant de passer commande.</p>
        <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-7 py-3.5 mt-6 sm:mt-7 text-[13.5px] sm:text-base hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
      </main>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: "flat",
      variables: {
        colorPrimary: "#f0661b",
        colorBackground: "#ffffff",
        colorText: "#23262a",
        colorDanger: "#d9551a",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "12px",
        spacingUnit: "4px",
      },
    },
  };

  const enPaiement = etape === "paiement" && clientSecret;

  // Indicateur d'étape — rien n'annonçait qu'il y avait deux étapes.
  const indicateurEtapes = (
    <div className="flex items-center gap-2 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 shrink-0">
        <span className={`grid place-items-center w-[22px] h-[22px] rounded-full text-[11px] font-semibold ${enPaiement ? "bg-orange text-white" : "bg-orange text-white"}`}>
          {enPaiement ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg> : "1"}
        </span>
        <span className={`text-[12px] ${enPaiement ? "text-ink-soft" : "font-semibold text-ink"}`}>Informations</span>
      </div>
      <span className={`flex-1 h-[1.5px] rounded-full ${enPaiement ? "bg-orange" : "bg-line"}`} />
      <div className="flex items-center gap-2 shrink-0">
        <span className={`grid place-items-center w-[22px] h-[22px] rounded-full text-[11px] font-semibold ${enPaiement ? "bg-orange text-white" : "bg-line text-ink-soft"}`}>2</span>
        <span className={`text-[12px] ${enPaiement ? "font-semibold text-ink" : "text-ink-soft"}`}>Paiement</span>
      </div>
    </div>
  );

  const lignesTotaux = (
    <div className="flex flex-col gap-2 sm:gap-2.5 text-[12.5px] sm:text-sm">
      <div className="flex justify-between"><span className="text-ink-soft">Sous-total HT</span><span className="font-semibold">{fmt(totalHT)}</span></div>
      <div className="flex justify-between"><span className="text-ink-soft">TVA (20 %)</span><span className="font-semibold">{fmt(tva)}</span></div>
      <div className="flex justify-between">
        <span className="text-ink-soft">Livraison</span>
        {chargementFrais ? <span className="text-ink-soft">…</span> : fraisLivraison === 0 ? (
          <span className="font-semibold text-[#1f7a52]">Offerte</span>
        ) : (
          <span className="font-semibold">{fmt(fraisLivraison)}</span>
        )}
      </div>
      {avecInstallation && (
        <div className="flex justify-between"><span className="text-ink-soft">Installation</span><span className="font-semibold">{fmt(fraisInstallation)}</span></div>
      )}
      <div className="flex justify-between items-center pt-2 border-t border-line mt-1">
        <span className="font-display font-bold text-[15px] sm:text-lg">Total TTC</span>
        <span className="font-display font-bold text-[18px] sm:text-lg text-orange">{fmt(totalTTCFinal)}</span>
      </div>
    </div>
  );

  const listeArticles = (
    <div className="flex flex-col gap-2.5 sm:gap-3 max-h-[280px] overflow-y-auto mb-4 pr-1">
      {items.map((it) => (
        <div key={it.id} className="flex justify-between gap-3 text-[12.5px] sm:text-sm">
          <div className="min-w-0">
            <p className="font-medium text-ink line-clamp-1">{it.designation}</p>
            {it.finition && <p className="text-[11px] sm:text-[12px] text-ink-soft line-clamp-1">{it.finition}</p>}
            <p className="text-[11px] sm:text-[12px] text-ink-soft">Qté : {it.quantite}</p>
          </div>
          <span className="font-semibold whitespace-nowrap">{fmt(it.prix * it.quantite)}</span>
        </div>
      ))}
    </div>
  );

  const caseCgv = (compact) => (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input type="checkbox" checked={cgvAcceptees} onChange={(e) => { setCgvAcceptees(e.target.checked); setErreurGlobale(""); }} className="mt-0.5 w-[17px] h-[17px] accent-orange shrink-0" />
      <span className={`${compact ? "text-[11.5px]" : "text-[12.5px]"} text-ink-soft leading-snug`}>
        J&apos;ai lu et j&apos;accepte les <a href="/cgv" target="_blank" className="text-orange hover:text-orange-dark font-medium underline">CGV</a> et la <a href="/confidentialite" target="_blank" className="text-orange hover:text-orange-dark font-medium underline">politique de confidentialité</a>.
      </span>
    </label>
  );

  return (
    <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-6 sm:py-14 pb-[170px] lg:pb-14">
      <div className="pb-2 text-[11.5px] sm:text-sm text-ink-soft">
        <Link href="/panier" className="hover:text-orange">Panier</Link> / <span className="text-ink">Commande</span>
      </div>
      <h1 className="font-display font-bold text-[24px] sm:text-4xl mb-4 sm:mb-6">Finaliser ma commande</h1>

      {indicateurEtapes}

      <div className="grid lg:grid-cols-[1fr_380px] gap-4 lg:gap-8 items-start">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-3 sm:gap-6">
          {!enPaiement && (
            connecte ? (
              <div className="rounded-2xl border border-line bg-surface-2/60 px-4 sm:px-5 py-3.5 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-tint text-orange-dark font-bold text-[13px] shrink-0">
                  {(session.user.email || "?")[0]?.toUpperCase()}
                </span>
                <p className="text-[12.5px] sm:text-[13.5px] text-ink">Connecté en tant que <span className="font-semibold">{session.user.email}</span> — vos informations ont été pré-remplies.</p>
              </div>
            ) : (
              <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
                <h2 className="font-display font-bold text-[15px] sm:text-lg mb-1">Comment souhaitez-vous commander ?</h2>
                <p className="text-[11.5px] sm:text-[13px] text-ink-soft mb-3.5 sm:mb-4">C&apos;est vous qui choisissez — aucune option n&apos;est obligatoire.</p>

                {/* Liste verticale sur mobile : trois pastilles côte à côte,
                    « Créer un compte » se cassait sur trois lignes. */}
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {MODES.map(([val, label]) => {
                    const actif = modeCompte === val;
                    return (
                      <button key={val} type="button" onClick={() => setModeCompte(val)}
                        className={`flex sm:block items-center gap-2.5 rounded-xl border px-3 py-3 text-[13px] sm:text-[13.5px] font-semibold sm:text-center transition ${actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink-soft hover:border-orange/40"}`}>
                        <span className={`sm:hidden grid place-items-center w-[17px] h-[17px] rounded-full border-[1.5px] shrink-0 ${actif ? "border-orange" : "border-ink-soft/30"}`}>
                          {actif && <span className="w-[9px] h-[9px] rounded-full bg-orange" />}
                        </span>
                        <span className="sm:hidden">{label}</span>
                        <span className="hidden sm:inline">{val === "invite" ? "En invité" : label}</span>
                      </button>
                    );
                  })}
                </div>

                {modeCompte === "invite" && (
                  <p className="text-[11.5px] sm:text-[12.5px] text-ink-soft mt-3.5 sm:mt-4">Vous pourrez créer un compte à tout moment après votre achat pour retrouver vos commandes.</p>
                )}

                {modeCompte === "connexion" && (
                  <div className="mt-3.5 sm:mt-4 flex flex-col gap-3">
                    <input type="email" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginErreur(""); }} placeholder="Votre email" className={champStyle} />
                    <div>
                      <input type="password" value={loginMdp} onChange={(e) => { setLoginMdp(e.target.value); setLoginErreur(""); }} placeholder="Votre mot de passe" className={champStyle} onKeyDown={(e) => e.key === "Enter" && handleLoginInline()} />
                      <button type="button" onClick={() => setMdpOublieOuvert(true)} className="text-[12px] sm:text-[12.5px] font-semibold text-orange hover:text-orange-dark transition mt-2">Mot de passe oublié ?</button>
                    </div>
                    {loginErreur && <p className="text-[12px] sm:text-[12.5px] text-orange-dark">{loginErreur}</p>}
                    <button type="button" onClick={handleLoginInline} disabled={loginEnvoi} className="rounded-full bg-charcoal text-white font-semibold text-[13px] sm:text-[13.5px] px-6 py-3 hover:bg-[#2d3035] transition disabled:opacity-50">
                      {loginEnvoi ? "Connexion…" : "Se connecter"}
                    </button>
                    <p className="text-[12px] sm:text-[12.5px] text-ink-soft">Pas encore de compte ? <button type="button" onClick={() => setModeCompte("creation")} className="text-orange font-semibold hover:text-orange-dark">Créez-en un →</button></p>
                  </div>
                )}

                {modeCompte === "creation" && (
                  <div className="mt-3.5 sm:mt-4">
                    <p className="text-[11.5px] sm:text-[12.5px] text-ink-soft mb-3">Le compte sera créé avec les coordonnées que vous allez renseigner ci-dessous.</p>
                    <label className={labelStyle}>Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={motDePasse}
                        onChange={(e) => { setMotDePasse(e.target.value); setErreurGlobale(""); }}
                        placeholder="Créez un mot de passe"
                        className={`${champStyle} pr-[72px]`}
                      />
                      <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-orange transition text-[12.5px] font-semibold">
                        {showPwd ? "Masquer" : "Voir"}
                      </button>
                    </div>
                    {motDePasse.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {CRITERES_MDP.map((c) => {
                          const ok = c.test(motDePasse);
                          return (
                            <span key={c.cle} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${ok ? "bg-orange-tint text-orange-dark" : "bg-surface-2 text-ink-soft"}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                                <circle cx="12" cy="12" r="10" />
                                {ok && <path d="M8 12l2.5 2.5L16 9" />}
                              </svg>
                              <span className="sm:hidden">{c.label}</span>
                              <span className="hidden sm:inline">{c.labelLong}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          )}

          {/* Formulaire coordonnées — reste monté (masqué en paiement) pour conserver les valeurs */}
          <div className={enPaiement ? "hidden" : "flex flex-col gap-3 sm:gap-6"}>
            <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
              <h2 className="font-display font-bold text-[15px] sm:text-lg mb-3.5 sm:mb-4">Vos coordonnées</h2>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className={labelStyle}>Email *</label>
                  <input data-erreur={erreurs.email || undefined} className={`${champStyle} ${erreurs.email ? "border-orange" : ""}`} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vous@exemple.fr" type="email" inputMode="email" disabled={connecte} />
                </div>
                <div>
                  <label className={labelStyle}>Prénom *</label>
                  <input data-erreur={erreurs.prenom || undefined} className={`${champStyle} ${erreurs.prenom ? "border-orange" : ""}`} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
                </div>
                <div>
                  <label className={labelStyle}>Nom *</label>
                  <input data-erreur={erreurs.nom || undefined} className={`${champStyle} ${erreurs.nom ? "border-orange" : ""}`} value={form.nom} onChange={(e) => set("nom", e.target.value)} />
                </div>
                <div>
                  <label className={labelStyle}>Téléphone</label>
                  <input className={champStyle} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="06 12 34 56 78" type="tel" inputMode="tel" />
                </div>
                <div>
                  <label className={labelStyle}>Société</label>
                  <input className={champStyle} value={form.societe} onChange={(e) => set("societe", e.target.value)} placeholder="Optionnel" />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
              <h2 className="font-display font-bold text-[15px] sm:text-lg mb-3.5 sm:mb-4">Adresse de livraison</h2>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className={labelStyle}>Adresse *</label>
                  <input data-erreur={erreurs.adresse || undefined} className={`${champStyle} ${erreurs.adresse ? "border-orange" : ""}`} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="N° et nom de rue" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelStyle}>Complément d&apos;adresse</label>
                  <input className={champStyle} value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Bâtiment, étage, code… (optionnel)" />
                </div>
                <div>
                  <label className={labelStyle}>Code postal *</label>
                  <input data-erreur={erreurs.codePostal || undefined} className={`${champStyle} ${erreurs.codePostal ? "border-orange" : ""}`} value={form.codePostal} onChange={(e) => set("codePostal", e.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <label className={labelStyle}>Ville *</label>
                  <input data-erreur={erreurs.ville || undefined} className={`${champStyle} ${erreurs.ville ? "border-orange" : ""}`} value={form.ville} onChange={(e) => set("ville", e.target.value)} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
              <h2 className="font-display font-bold text-[15px] sm:text-lg mb-3.5 sm:mb-4">Montage & installation</h2>
              {chargementFrais ? (
                <p className="text-[13px] sm:text-sm text-ink-soft">Calcul en cours…</p>
              ) : frais?.installationDisponible ? (
                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-line p-3.5 sm:p-4 hover:border-orange/50 transition"
                  style={avecInstallation ? { borderColor: "#f0661b", background: "#fef4ee" } : undefined}>
                  <input type="checkbox" checked={avecInstallation} onChange={(e) => setAvecInstallation(e.target.checked)} className="mt-0.5 w-[17px] h-[17px] accent-orange shrink-0" />
                  <span>
                    <span className="font-semibold text-ink text-[13px] sm:text-sm block leading-snug">Je souhaite le montage & l&apos;installation par nos équipes</span>
                    <span className="text-[12px] sm:text-[13px] text-ink-soft block mt-1">
                      +{fmt(frais.fraisInstallation)} — adapté au montant de votre commande.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-[12px] sm:text-[13px] text-ink-soft bg-surface-2 rounded-xl px-3.5 sm:px-4 py-3 leading-relaxed">
                  Votre commande dépasse le montant pour un tarif d&apos;installation automatique — nos équipes vous contacteront pour établir un devis personnalisé.
                </p>
              )}
            </section>
          </div>

          {/* Paiement */}
          {enPaiement && (
            <>
              <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="font-display font-bold text-[15px] sm:text-lg">Livraison</h2>
                  <button onClick={revenirInfos} className="text-[12.5px] sm:text-sm font-semibold text-orange hover:text-orange-dark transition inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
                    Modifier
                  </button>
                </div>

                <div className="rounded-xl bg-surface-2 px-3.5 sm:px-4 py-3 text-[12px] sm:text-[13px] text-ink-soft leading-relaxed">
                  <span className="font-semibold text-ink">{form.prenom} {form.nom}</span>{form.societe ? ` · ${form.societe}` : ""}<br />
                  {form.adresse}{form.complement ? `, ${form.complement}` : ""}, {form.codePostal} {form.ville}<br />
                  {form.email}{form.telephone ? ` · ${form.telephone}` : ""}
                  {avecInstallation && <><br /><span className="text-orange-dark font-medium">✓ Avec montage & installation</span></>}
                  {!connecte && modeCompte === "creation" && <><br /><span className="text-orange-dark font-medium">✓ Compte client créé</span></>}
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
                <h2 className="font-display font-bold text-[15px] sm:text-lg mb-3.5 sm:mb-5">Paiement</h2>
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <PaymentForm numero={numero} email={form.email} montant={totalTTCFinal} />
                </Elements>
              </section>
            </>
          )}
        </div>

        {/* Récap — repliable sur mobile, il occupait un écran entier */}
        <aside className="lg:sticky lg:top-24 rounded-2xl lg:rounded-[20px] border border-line bg-surface overflow-hidden lg:p-6">
          <button type="button" onClick={() => setRecapOuvert((v) => !v)}
            className="lg:hidden w-full flex items-center justify-between px-4 py-3.5">
            <span className="text-left">
              <span className="block font-display font-bold text-[15px] text-ink">Votre commande</span>
              <span className="block text-[11.5px] text-ink-soft mt-0.5">{nbArticles} article{nbArticles > 1 ? "s" : ""} · {fmt(totalTTCFinal)} TTC</span>
            </span>
            <span className={`text-ink-soft shrink-0 transition-transform ${recapOuvert ? "rotate-180 text-orange-dark" : ""}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
            </span>
          </button>

          <div className={`${recapOuvert ? "block" : "hidden"} lg:block px-4 pb-4 pt-0 border-t border-line lg:p-0 lg:border-none`}>
            <h2 className="hidden lg:block font-display font-bold text-xl mb-5">Votre commande</h2>
            <div className="pt-3.5 lg:pt-0">
              {listeArticles}
              <div className="border-t border-line pt-3.5 lg:pt-4">{lignesTotaux}</div>
            </div>
          </div>

          {erreurGlobale && <p className="text-[12.5px] sm:text-sm text-orange-dark bg-orange-tint rounded-lg px-3 py-2 mx-4 mb-4 lg:mx-0 lg:mt-4">{erreurGlobale}</p>}

          {/* Validation desktop — la barre fixe prend le relais sur mobile */}
          {!enPaiement && (
            <div className="hidden lg:block">
              <div className="mt-5">{caseCgv()}</div>
              <button onClick={handleContinuer} disabled={envoi || !cgvAcceptees} className="w-full rounded-full bg-orange text-white font-semibold px-6 py-3.5 mt-4 hover:bg-orange-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {envoi ? "Préparation du paiement…" : "Continuer vers le paiement →"}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ══ Barre de validation fixe (mobile, étape infos) ══
          La case CGV y figure aussi : séparée du bouton, elle bloquait la
          validation sans qu'on comprenne pourquoi. */}
      {!enPaiement && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
          <div className="mb-2.5">{caseCgv(true)}</div>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="min-w-0">
              <p className="text-[10.5px] text-ink-soft">Total TTC</p>
              <p className="font-display font-bold text-[20px] text-ink leading-tight">{fmt(totalTTCFinal)}</p>
            </div>
          </div>
          <button onClick={handleContinuer} disabled={envoi || !cgvAcceptees}
            className="w-full rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-50">
            {envoi ? "Préparation du paiement…" : "Continuer vers le paiement →"}
          </button>
        </div>
      )}

      <ModalMotDePasseOublie open={mdpOublieOuvert} onClose={() => setMdpOublieOuvert(false)} />
    </main>
  );
}