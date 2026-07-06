"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCart } from "@/components/cart/CartContext";
import PaymentForm from "@/components/cart/PaymentForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const fmt = (n) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const champStyle = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-orange transition";
const labelStyle = "block text-[13px] font-semibold mb-1.5 text-ink";
const FORM_KEY = "coteburo_commande_infos";

export default function CommandePage() {
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

  // Restaure les infos saisies depuis sessionStorage au chargement
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FORM_KEY);
      if (raw) setForm((f) => ({ ...f, ...JSON.parse(raw) }));
    } catch {}
    setHydrated(true);
  }, []);

  // Sauvegarde les infos à chaque changement
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(form)); } catch {}
  }, [form, hydrated]);

  // Interception du bouton "précédent" : si on est en paiement, revenir à l'étape infos
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

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreurs((e) => ({ ...e, [k]: false })); };

  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;

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
    if (!valider()) { setErreurGlobale("Merci de remplir tous les champs obligatoires."); return; }
    setEnvoi(true);
    try {
      const res = await fetch("/api/commande/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: form, items }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setNumero(data.numero);
        setEtape("paiement");
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
    return <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-20"><div className="h-64 rounded-2xl border border-line bg-surface animate-pulse" /></main>;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-16 text-center">
        <h1 className="font-display font-bold text-2xl sm:text-3xl">Votre panier est vide</h1>
        <p className="text-ink-soft mt-2">Ajoutez des articles avant de passer commande.</p>
        <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-7 py-3.5 mt-7 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
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

  return (
    <main className="mx-auto max-w-[1400px] px-5 sm:px-7 py-10 sm:py-14">
      <div className="pb-2 text-sm text-ink-soft">
        <Link href="/" className="hover:text-orange">Accueil</Link> / <Link href="/panier" className="hover:text-orange">Panier</Link> / <span className="text-ink">Commande</span>
      </div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl mb-8">Finaliser ma commande</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-6">
          {/* Formulaire coordonnées — reste monté (masqué en paiement) pour conserver les valeurs */}
          <div className={enPaiement ? "hidden" : "flex flex-col gap-6"}>
            <section className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display font-bold text-lg mb-4">Vos coordonnées</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelStyle}>Email *</label>
                  <input className={`${champStyle} ${erreurs.email ? "border-orange" : ""}`} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vous@exemple.fr" type="email" />
                </div>
                <div>
                  <label className={labelStyle}>Prénom *</label>
                  <input className={`${champStyle} ${erreurs.prenom ? "border-orange" : ""}`} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
                </div>
                <div>
                  <label className={labelStyle}>Nom *</label>
                  <input className={`${champStyle} ${erreurs.nom ? "border-orange" : ""}`} value={form.nom} onChange={(e) => set("nom", e.target.value)} />
                </div>
                <div>
                  <label className={labelStyle}>Téléphone</label>
                  <input className={champStyle} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className={labelStyle}>Société</label>
                  <input className={champStyle} value={form.societe} onChange={(e) => set("societe", e.target.value)} placeholder="Optionnel" />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display font-bold text-lg mb-4">Adresse de livraison</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelStyle}>Adresse *</label>
                  <input className={`${champStyle} ${erreurs.adresse ? "border-orange" : ""}`} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="N° et nom de rue" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelStyle}>Complément d'adresse</label>
                  <input className={champStyle} value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Bâtiment, étage, code… (optionnel)" />
                </div>
                <div>
                  <label className={labelStyle}>Code postal *</label>
                  <input className={`${champStyle} ${erreurs.codePostal ? "border-orange" : ""}`} value={form.codePostal} onChange={(e) => set("codePostal", e.target.value)} />
                </div>
                <div>
                  <label className={labelStyle}>Ville *</label>
                  <input className={`${champStyle} ${erreurs.ville ? "border-orange" : ""}`} value={form.ville} onChange={(e) => set("ville", e.target.value)} />
                </div>
              </div>
            </section>
          </div>

          {/* Paiement */}
          {enPaiement && (
            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">Paiement</h2>
                <button onClick={revenirInfos} className="text-sm font-semibold text-orange hover:text-orange-dark transition inline-flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
                  Modifier mes infos
                </button>
              </div>

              <div className="rounded-xl bg-surface-2 px-4 py-3 mb-5 text-[13px] text-ink-soft leading-relaxed">
                <span className="font-semibold text-ink">{form.prenom} {form.nom}</span>{form.societe ? ` · ${form.societe}` : ""}<br />
                {form.adresse}{form.complement ? `, ${form.complement}` : ""}, {form.codePostal} {form.ville}<br />
                {form.email}{form.telephone ? ` · ${form.telephone}` : ""}
              </div>

              <Elements stripe={stripePromise} options={stripeOptions}>
                <PaymentForm numero={numero} email={form.email} />
              </Elements>
            </section>
          )}
        </div>

        {/* Récap */}
        <aside className="lg:sticky lg:top-24 rounded-[20px] border border-line bg-surface p-6">
          <h2 className="font-display font-bold text-xl mb-5">Votre commande</h2>
          <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto mb-4 pr-1">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink line-clamp-1">{it.designation}</p>
                  {it.finition && <p className="text-[12px] text-ink-soft line-clamp-1">{it.finition}</p>}
                  <p className="text-[12px] text-ink-soft">Qté : {it.quantite}</p>
                </div>
                <span className="font-semibold whitespace-nowrap">{fmt(it.prix * it.quantite)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Sous-total HT</span><span className="font-semibold">{fmt(totalHT)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">TVA (20 %)</span><span className="font-semibold">{fmt(tva)}</span></div>
            <div className="flex justify-between items-center pt-2 border-t border-line mt-1">
              <span className="font-display font-bold text-lg">Total TTC</span>
              <span className="font-display font-bold text-lg text-orange">{fmt(totalTTC)}</span>
            </div>
          </div>

          {erreurGlobale && <p className="text-sm text-orange-dark bg-orange-tint rounded-lg px-3 py-2 mt-4">{erreurGlobale}</p>}

          {!enPaiement && (
            <>
              <label className="flex items-start gap-2.5 mt-5 cursor-pointer">
                <input type="checkbox" checked={cgvAcceptees} onChange={(e) => { setCgvAcceptees(e.target.checked); setErreurGlobale(""); }} className="mt-0.5 w-4 h-4 accent-orange shrink-0" />
                <span className="text-[12.5px] text-ink-soft leading-snug">
                  J&apos;ai lu et j&apos;accepte les <a href="/cgv" target="_blank" className="text-orange hover:text-orange-dark font-medium underline">conditions générales de vente</a> et la <a href="/confidentialite" target="_blank" className="text-orange hover:text-orange-dark font-medium underline">politique de confidentialité</a>.
                </span>
              </label>
              <button onClick={handleContinuer} disabled={envoi || !cgvAcceptees} className="w-full rounded-full bg-orange text-white font-semibold px-6 py-3.5 mt-4 hover:bg-orange-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {envoi ? "Préparation du paiement…" : "Continuer vers le paiement →"}
              </button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}