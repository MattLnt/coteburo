"use client";
import { useState } from "react";
import { useDevis } from "@/components/devis/DevisContext";

const champStyle = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange focus:bg-white/10 transition";
const selectStyle = champStyle + " appearance-none cursor-pointer";
const labelStyle = "block text-[13px] font-semibold mb-1.5 text-white/80";

const TYPES = ["Aménagement complet de bureaux", "Poste(s) de travail", "Salle de réunion", "Espace d'accueil", "Rangements", "Cloisons / acoustique", "Autre"];
const DELAIS = ["Dès que possible", "Sous 1 mois", "Sous 3 mois", "Plus de 3 mois", "Non défini"];
const BUDGETS = ["Moins de 5 000 €", "5 000 – 15 000 €", "15 000 – 50 000 €", "Plus de 50 000 €", "À définir"];

const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-opacity='0.5' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
const selectBg = { backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" };

const ETAPES = ["Coordonnées", "Votre projet", "Envoi"];

export default function DevisForm() {
  const { items, clear } = useDevis();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    prenom: "", nom: "", societe: "", email: "", telephone: "",
    typeProjet: "", surface: "", delai: "", budget: "", message: "",
  });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState("");

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreurs((e) => ({ ...e, [k]: false })); setErreurGlobale(""); };

  const validerEtape1 = () => {
    const errs = {};
    if (!form.prenom.trim()) errs.prenom = true;
    if (!form.nom.trim()) errs.nom = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = true;
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  const suivant = () => {
    if (step === 0 && !validerEtape1()) { setErreurGlobale("Merci de remplir les champs obligatoires (prénom, nom, email)."); return; }
    setErreurGlobale("");
    setStep((s) => Math.min(s + 1, ETAPES.length - 1));
  };
  const precedent = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setErreurGlobale("");
    if (!validerEtape1()) { setStep(0); setErreurGlobale("Merci de remplir les champs obligatoires (prénom, nom, email)."); return; }
    setEnvoi(true);
    try {
      const articles = items.map((it) => ({
        designation: it.designation,
        gammeNom: it.gammeNom,
        config: it.config,
        image: it.image,
        quantite: it.quantite,
        finitions: it.finitions,
        prixIndicatif: it.prixIndicatif,
      }));
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, articles }),
      });
      const data = await res.json();
      if (data.ok) { setEnvoye(true); clear(); }
      else setErreurGlobale(data.error || "Une erreur est survenue.");
    } catch {
      setErreurGlobale("Impossible d'envoyer la demande. Réessayez.");
    }
    setEnvoi(false);
  };

  if (envoye) {
    return (
      <div className="rounded-[24px] bg-charcoal p-10 sm:p-14 text-center">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-[#1f7a52]/20 text-[#4ade80]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 className="font-display font-bold text-2xl text-white">Demande envoyée !</h3>
        <p className="text-white/60 mt-2 max-w-md mx-auto">Merci pour votre demande de devis. Notre équipe étudie votre projet et vous recontacte rapidement avec une proposition. Un email de confirmation vous a été envoyé.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-charcoal p-7 sm:p-9 relative overflow-hidden">
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.22), transparent 70%)" }} />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">Votre projet</p>
        <h2 className="font-display font-bold text-2xl text-white mt-1.5 mb-1">Demande de devis gratuit</h2>
        <p className="text-white/55 text-sm mb-6">Décrivez votre projet, nous revenons vers vous avec une proposition adaptée.</p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-7">
          {ETAPES.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span className={`grid place-items-center w-7 h-7 rounded-full text-[12.5px] font-bold shrink-0 transition ${
                  i < step ? "bg-orange/25 text-orange" : i === step ? "bg-orange text-white" : "bg-white/10 text-white/40"}`}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`text-[12.5px] font-semibold hidden sm:inline ${i === step ? "text-white" : "text-white/40"}`}>{label}</span>
              </div>
              {i < ETAPES.length - 1 && <div className={`flex-1 h-[2px] rounded ${i < step ? "bg-orange/40" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Étape 1 : Coordonnées */}
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Prénom *</label>
              <input className={`${champStyle} ${erreurs.prenom ? "border-orange" : ""}`} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} placeholder="Votre prénom" />
            </div>
            <div>
              <label className={labelStyle}>Nom *</label>
              <input className={`${champStyle} ${erreurs.nom ? "border-orange" : ""}`} value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Votre nom" />
            </div>
            <div>
              <label className={labelStyle}>Email *</label>
              <input className={`${champStyle} ${erreurs.email ? "border-orange" : ""}`} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vous@exemple.fr" type="email" />
            </div>
            <div>
              <label className={labelStyle}>Téléphone</label>
              <input className={champStyle} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="06 12 34 56 78" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelStyle}>Société</label>
              <input className={champStyle} value={form.societe} onChange={(e) => set("societe", e.target.value)} placeholder="Nom de votre société (optionnel)" />
            </div>
          </div>
        )}

        {/* Étape 2 : Projet */}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelStyle}>Type de projet</label>
              <select className={selectStyle} value={form.typeProjet} onChange={(e) => set("typeProjet", e.target.value)} style={selectBg}>
                <option value="" className="text-ink">Sélectionnez…</option>
                {TYPES.map((t) => <option key={t} value={t} className="text-ink">{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelStyle}>Surface / nb de postes</label>
              <input className={champStyle} value={form.surface} onChange={(e) => set("surface", e.target.value)} placeholder="ex : 120 m² ou 15 postes" />
            </div>
            <div>
              <label className={labelStyle}>Délai souhaité</label>
              <select className={selectStyle} value={form.delai} onChange={(e) => set("delai", e.target.value)} style={selectBg}>
                <option value="" className="text-ink">Sélectionnez…</option>
                {DELAIS.map((t) => <option key={t} value={t} className="text-ink">{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelStyle}>Budget estimé</label>
              <select className={selectStyle} value={form.budget} onChange={(e) => set("budget", e.target.value)} style={selectBg}>
                <option value="" className="text-ink">Sélectionnez…</option>
                {BUDGETS.map((t) => <option key={t} value={t} className="text-ink">{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelStyle}>Détails du projet</label>
              <textarea className={`${champStyle} min-h-[110px] resize-y leading-relaxed`} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Décrivez votre besoin, vos contraintes, vos préférences…" />
            </div>
          </div>
        )}

        {/* Étape 3 : Récap + envoi */}
        {step === 2 && (
          <div>
            <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10 mb-5">
              <div className="px-4 py-3 flex justify-between text-[13.5px]">
                <span className="text-white/55">Contact</span>
                <span className="text-white font-medium text-right">{form.prenom} {form.nom}{form.societe ? ` · ${form.societe}` : ""}</span>
              </div>
              <div className="px-4 py-3 flex justify-between text-[13.5px]">
                <span className="text-white/55">Email</span>
                <span className="text-white font-medium">{form.email}</span>
              </div>
              {form.typeProjet && (
                <div className="px-4 py-3 flex justify-between text-[13.5px]">
                  <span className="text-white/55">Projet</span>
                  <span className="text-white font-medium text-right">{form.typeProjet}</span>
                </div>
              )}
              {items.length > 0 && (
                <div className="px-4 py-3 flex justify-between text-[13.5px]">
                  <span className="text-white/55">Produits joints</span>
                  <span className="text-white font-medium">{items.length}</span>
                </div>
              )}
            </div>
            <p className="text-[12.5px] text-white/45 mb-5">Vérifiez vos informations puis envoyez votre demande — notre équipe revient vers vous sous 24 à 48h ouvrées.</p>
          </div>
        )}

        {erreurGlobale && <p className="text-sm text-white bg-orange/20 border border-orange/40 rounded-lg px-3 py-2 mt-4">{erreurGlobale}</p>}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          {step > 0 && (
            <button onClick={precedent} className="text-[14px] font-semibold text-white/60 hover:text-white transition px-2">← Retour</button>
          )}
          {step < ETAPES.length - 1 ? (
            <button onClick={suivant} className="flex-1 rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition">
              Continuer →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={envoi} className="flex-1 rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition disabled:opacity-60">
              {envoi ? "Envoi…" : "Envoyer ma demande de devis →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}