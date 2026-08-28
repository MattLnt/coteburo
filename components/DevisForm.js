"use client";
import { useState, useRef, useEffect } from "react";
import { useDevis } from "@/components/devis/DevisContext";

const champStyle = "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 sm:px-4 py-3 text-[13.5px] sm:text-sm text-white placeholder:text-white/40 outline-none focus:border-orange focus:bg-white/10 transition";
const labelStyle = "block text-[12px] sm:text-[13px] font-semibold mb-1.5 text-white/80";

const TYPES = ["Aménagement complet de bureaux", "Poste(s) de travail", "Salle de réunion", "Espace d'accueil", "Rangements", "Cloisons / acoustique", "Autre"];
const DELAIS = ["Dès que possible", "Sous 1 mois", "Sous 3 mois", "Plus de 3 mois", "Non défini"];
const BUDGETS = ["Moins de 5 000 €", "5 000 – 15 000 €", "15 000 – 50 000 €", "Plus de 50 000 €", "À définir"];

const ETAPES = ["Coordonnées", "Votre projet", "Envoi"];

// Menu déroulant sur mesure — le <select> natif impose l'apparence de sa liste
// et rend très mal sur fond sombre, surtout sur mobile.
function Selecteur({ label, valeur, options, onChange, placeholder = "Sélectionnez…" }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <label className={labelStyle}>{label}</label>
      <button type="button" onClick={() => setOuvert((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border bg-white/5 px-3.5 sm:px-4 py-3 text-[13.5px] sm:text-sm text-left transition ${ouvert ? "border-white/35 bg-white/10" : "border-white/15"}`}>
        <span className={valeur ? "text-white" : "text-white/40"}>{valeur || placeholder}</span>
        <span className={`text-white/50 shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      {ouvert && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-xl bg-[#2b2f34] border border-white/15 p-1.5 max-h-[240px] overflow-y-auto"
          style={{ boxShadow: "0 16px 40px -12px rgba(0,0,0,0.5)" }}>
          {options.map((o) => {
            const actif = valeur === o;
            return (
              <button key={o} type="button" onClick={() => { onChange(o); setOuvert(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-[13px] text-left transition ${actif ? "bg-orange/20 text-orange font-semibold" : "text-white/80 hover:bg-white/8"}`}>
                <span>{o}</span>
                {actif && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" className="shrink-0"><path d="M20 6 9 17l-5-5" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      <div className="rounded-2xl lg:rounded-[24px] bg-charcoal p-7 sm:p-14 text-center">
        <div className="mx-auto mb-4 sm:mb-5 grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1f7a52]/20 text-[#4ade80]">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 className="font-display font-bold text-[21px] sm:text-2xl text-white">Demande envoyée !</h3>
        <p className="text-white/60 mt-2 max-w-md mx-auto text-[13px] sm:text-base leading-relaxed">Merci pour votre demande de devis. Notre équipe étudie votre projet et vous recontacte rapidement avec une proposition. Un email de confirmation vous a été envoyé.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl lg:rounded-[24px] bg-charcoal p-5 sm:p-9 relative overflow-hidden">
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.22), transparent 70%)" }} />

      <div className="relative">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-orange">Votre projet</p>
        <h2 className="font-display font-bold text-[21px] sm:text-2xl text-white mt-1.5 mb-1">Demande de devis gratuit</h2>
        <p className="text-white/55 text-[12.5px] sm:text-sm mb-5 sm:mb-6 leading-relaxed">Décrivez votre projet, nous revenons vers vous avec une proposition adaptée.</p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-5 sm:mb-7">
          {ETAPES.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none sm:last:flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <span className={`grid place-items-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11.5px] sm:text-[12.5px] font-bold shrink-0 transition ${
                  i < step ? "bg-orange/25 text-orange" : i === step ? "bg-orange text-white" : "bg-white/10 text-white/40"}`}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={`text-[12px] sm:text-[12.5px] font-semibold ${i === step ? "text-white" : "text-white/40 hidden sm:inline"}`}>{label}</span>
              </div>
              {i < ETAPES.length - 1 && <div className={`flex-1 h-[2px] rounded ${i < step ? "bg-orange/40" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Étape 1 : Coordonnées */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelStyle}>Prénom *</label>
              <input className={`${champStyle} ${erreurs.prenom ? "border-orange" : ""}`} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} placeholder="Prénom" />
            </div>
            <div>
              <label className={labelStyle}>Nom *</label>
              <input className={`${champStyle} ${erreurs.nom ? "border-orange" : ""}`} value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Nom" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelStyle}>Email *</label>
              <input className={`${champStyle} ${erreurs.email ? "border-orange" : ""}`} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vous@exemple.fr" type="email" inputMode="email" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelStyle}>Téléphone</label>
              <input className={champStyle} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="06 12 34 56 78" type="tel" inputMode="tel" />
            </div>
            <div className="col-span-2">
              <label className={labelStyle}>Société</label>
              <input className={champStyle} value={form.societe} onChange={(e) => set("societe", e.target.value)} placeholder="Nom de votre société (optionnel)" />
            </div>
          </div>
        )}

        {/* Étape 2 : Projet */}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <Selecteur label="Type de projet" valeur={form.typeProjet} options={TYPES} onChange={(v) => set("typeProjet", v)} />
            </div>
            <div>
              <label className={labelStyle}>Surface / nb de postes</label>
              <input className={champStyle} value={form.surface} onChange={(e) => set("surface", e.target.value)} placeholder="ex : 120 m² ou 15 postes" />
            </div>
            <div>
              <Selecteur label="Délai souhaité" valeur={form.delai} options={DELAIS} onChange={(v) => set("delai", v)} />
            </div>
            <div className="sm:col-span-2">
              <Selecteur label="Budget estimé" valeur={form.budget} options={BUDGETS} onChange={(v) => set("budget", v)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelStyle}>Détails du projet</label>
              <textarea className={`${champStyle} min-h-[100px] sm:min-h-[110px] resize-y leading-relaxed`} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Décrivez votre besoin, vos contraintes, vos préférences…" />
            </div>
          </div>
        )}

        {/* Étape 3 : Récap + envoi */}
        {step === 2 && (
          <div>
            <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10 mb-4 sm:mb-5">
              <div className="px-3.5 sm:px-4 py-3 flex justify-between gap-3 text-[12.5px] sm:text-[13.5px]">
                <span className="text-white/55 shrink-0">Contact</span>
                <span className="text-white font-medium text-right">{form.prenom} {form.nom}{form.societe ? ` · ${form.societe}` : ""}</span>
              </div>
              <div className="px-3.5 sm:px-4 py-3 flex justify-between gap-3 text-[12.5px] sm:text-[13.5px]">
                <span className="text-white/55 shrink-0">Email</span>
                <span className="text-white font-medium text-right truncate">{form.email}</span>
              </div>
              {form.typeProjet && (
                <div className="px-3.5 sm:px-4 py-3 flex justify-between gap-3 text-[12.5px] sm:text-[13.5px]">
                  <span className="text-white/55 shrink-0">Projet</span>
                  <span className="text-white font-medium text-right">{form.typeProjet}</span>
                </div>
              )}
              {items.length > 0 && (
                <div className="px-3.5 sm:px-4 py-3 flex justify-between gap-3 text-[12.5px] sm:text-[13.5px]">
                  <span className="text-white/55">Produits joints</span>
                  <span className="text-white font-medium">{items.length}</span>
                </div>
              )}
            </div>
            <p className="text-[11.5px] sm:text-[12.5px] text-white/45 mb-4 sm:mb-5 leading-relaxed">Vérifiez vos informations puis envoyez votre demande — notre équipe revient vers vous sous 24 à 48h ouvrées.</p>
          </div>
        )}

        {erreurGlobale && <p className="text-[12.5px] sm:text-sm text-white bg-orange/20 border border-orange/40 rounded-lg px-3 py-2.5 mt-4 leading-relaxed">{erreurGlobale}</p>}

        {/* Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 mt-5 sm:mt-6">
          {step > 0 && (
            <button onClick={precedent} className="text-[13px] sm:text-[14px] font-semibold text-white/60 hover:text-white transition px-2 shrink-0">← Retour</button>
          )}
          {step < ETAPES.length - 1 ? (
            <button onClick={suivant} className="flex-1 rounded-full bg-orange text-white font-semibold px-6 sm:px-8 py-3.5 text-[13.5px] sm:text-base hover:bg-orange-dark transition">
              Continuer →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={envoi} className="flex-1 rounded-full bg-orange text-white font-semibold px-6 sm:px-8 py-3.5 text-[13.5px] sm:text-base hover:bg-orange-dark transition disabled:opacity-60">
              {envoi ? "Envoi…" : "Envoyer ma demande →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}