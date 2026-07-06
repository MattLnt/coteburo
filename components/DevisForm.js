"use client";
import { useState } from "react";

const champStyle = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange focus:bg-white/10 transition";
const selectStyle = champStyle + " appearance-none cursor-pointer";
const labelStyle = "block text-[13px] font-semibold mb-1.5 text-white/80";

const TYPES = ["Aménagement complet de bureaux", "Poste(s) de travail", "Salle de réunion", "Espace d'accueil", "Rangements", "Cloisons / acoustique", "Autre"];
const DELAIS = ["Dès que possible", "Sous 1 mois", "Sous 3 mois", "Plus de 3 mois", "Non défini"];
const BUDGETS = ["Moins de 5 000 €", "5 000 – 15 000 €", "15 000 – 50 000 €", "Plus de 50 000 €", "À définir"];

const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-opacity='0.5' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export default function DevisForm() {
  const [form, setForm] = useState({
    prenom: "", nom: "", societe: "", email: "", telephone: "",
    typeProjet: "", surface: "", delai: "", budget: "", message: "",
  });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState("");

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreurs((e) => ({ ...e, [k]: false })); setErreurGlobale(""); };

  const valider = () => {
    const errs = {};
    if (!form.prenom.trim()) errs.prenom = true;
    if (!form.nom.trim()) errs.nom = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = true;
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setErreurGlobale("");
    if (!valider()) { setErreurGlobale("Merci de remplir les champs obligatoires (prénom, nom, email)."); return; }
    setEnvoi(true);
    try {
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) setEnvoye(true);
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
        <p className="text-white/60 mt-2 max-w-md mx-auto">Merci pour votre demande de devis. Notre équipe étudie votre projet et vous recontacte rapidement avec une proposition.</p>
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

        {/* Coordonnées */}
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

        {/* Détails projet */}
        <div className="border-t border-white/10 mt-6 pt-6 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelStyle}>Type de projet</label>
            <select className={selectStyle} value={form.typeProjet} onChange={(e) => set("typeProjet", e.target.value)} style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}>
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
            <select className={selectStyle} value={form.delai} onChange={(e) => set("delai", e.target.value)} style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}>
              <option value="" className="text-ink">Sélectionnez…</option>
              {DELAIS.map((t) => <option key={t} value={t} className="text-ink">{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelStyle}>Budget estimé</label>
            <select className={selectStyle} value={form.budget} onChange={(e) => set("budget", e.target.value)} style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}>
              <option value="" className="text-ink">Sélectionnez…</option>
              {BUDGETS.map((t) => <option key={t} value={t} className="text-ink">{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelStyle}>Détails du projet</label>
            <textarea className={`${champStyle} min-h-[110px] resize-y leading-relaxed`} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Décrivez votre besoin, vos contraintes, vos préférences…" />
          </div>
        </div>

        {erreurGlobale && <p className="text-sm text-white bg-orange/20 border border-orange/40 rounded-lg px-3 py-2 mt-4">{erreurGlobale}</p>}

        <button onClick={handleSubmit} disabled={envoi} className="w-full rounded-full bg-orange text-white font-semibold px-8 py-3.5 mt-5 hover:bg-orange-dark transition disabled:opacity-60">
          {envoi ? "Envoi…" : "Envoyer ma demande de devis →"}
        </button>
      </div>
    </div>
  );
}