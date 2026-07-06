"use client";
import { useState } from "react";

const champStyle = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange focus:bg-white/10 transition";
const labelStyle = "block text-[13px] font-semibold mb-1.5 text-white/80";

export default function ContactForm() {
  const [form, setForm] = useState({ nom: "", email: "", telephone: "", sujet: "", message: "" });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState("");

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreurs((e) => ({ ...e, [k]: false })); setErreurGlobale(""); };

  const valider = () => {
    const errs = {};
    if (!form.nom.trim()) errs.nom = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = true;
    if (!form.message.trim()) errs.message = true;
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setErreurGlobale("");
    if (!valider()) { setErreurGlobale("Merci de remplir les champs obligatoires."); return; }
    setEnvoi(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) setEnvoye(true);
      else setErreurGlobale(data.error || "Une erreur est survenue.");
    } catch {
      setErreurGlobale("Impossible d'envoyer le message. Réessayez.");
    }
    setEnvoi(false);
  };

  if (envoye) {
    return (
      <div className="rounded-[24px] bg-charcoal p-10 sm:p-12 text-center h-full flex flex-col items-center justify-center min-h-[440px]">
        <div className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-[#1f7a52]/20 text-[#4ade80]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 className="font-display font-bold text-2xl text-white">Message envoyé !</h3>
        <p className="text-white/60 mt-2 max-w-sm">Merci de nous avoir contactés. Notre équipe vous répondra dans les meilleurs délais.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-charcoal p-7 sm:p-9 relative overflow-hidden">
      {/* Halo décoratif */}
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.22), transparent 70%)" }} />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">Écrivez-nous</p>
        <h2 className="font-display font-bold text-2xl text-white mt-1.5 mb-1">Envoyer un message</h2>
        <p className="text-white/55 text-sm mb-6">Réponse sous 24h ouvrées. Les champs marqués d&apos;un * sont obligatoires.</p>

        <div className="grid sm:grid-cols-2 gap-4">
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
          <div>
            <label className={labelStyle}>Sujet</label>
            <input className={champStyle} value={form.sujet} onChange={(e) => set("sujet", e.target.value)} placeholder="Objet de votre message" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelStyle}>Message *</label>
            <textarea className={`${champStyle} min-h-[130px] resize-y leading-relaxed ${erreurs.message ? "border-orange" : ""}`} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Décrivez votre besoin…" />
          </div>
        </div>

        {erreurGlobale && <p className="text-sm text-white bg-orange/20 border border-orange/40 rounded-lg px-3 py-2 mt-4">{erreurGlobale}</p>}

        <button onClick={handleSubmit} disabled={envoi} className="w-full rounded-full bg-orange text-white font-semibold px-8 py-3.5 mt-5 hover:bg-orange-dark transition disabled:opacity-60">
          {envoi ? "Envoi…" : "Envoyer le message →"}
        </button>
      </div>
    </div>
  );
}