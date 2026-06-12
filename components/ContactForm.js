"use client";
import { useState } from "react";

const INPUT = "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", tel: "", entreprise: "", projet: "", message: "" });

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    // TODO: brancher l'envoi (route API + Resend) — pour l'instant on simule
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex min-h-[440px] flex-col items-center justify-center rounded-[24px] border border-line bg-surface p-8 text-center">
        <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-orange-tint text-orange-dark">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5" /></svg>
        </span>
        <h3 className="font-display font-bold text-2xl">Demande envoyée !</h3>
        <p className="text-ink-soft mt-2 max-w-sm">Merci{form.nom ? ` ${form.nom}` : ""}, nous revenons vers vous très vite. Pour une urgence, appelez le 06 20 39 13 90.</p>
        <button onClick={() => { setSent(false); setForm({ nom: "", email: "", tel: "", entreprise: "", projet: "", message: "" }); }} className="mt-6 rounded-full border border-line px-6 py-3 text-sm font-semibold transition hover:bg-ink hover:text-white">
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-line bg-surface p-6 sm:p-8">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold">Nom *</label>
          <input name="nom" value={form.nom} onChange={update} required placeholder="Votre nom" className={INPUT} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold">Email *</label>
          <input name="email" type="email" value={form.email} onChange={update} required placeholder="vous@entreprise.fr" className={INPUT} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold">Téléphone</label>
          <input name="tel" type="tel" value={form.tel} onChange={update} placeholder="06 12 34 56 78" className={INPUT} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold">Entreprise</label>
          <input name="entreprise" value={form.entreprise} onChange={update} placeholder="Nom de votre société" className={INPUT} />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[13px] font-semibold">Type de projet</label>
        <select name="projet" value={form.projet} onChange={update} className={INPUT}>
          <option value="">Sélectionnez…</option>
          <option>Poste de travail</option>
          <option>Open space</option>
          <option>Salle de réunion</option>
          <option>Espace d&apos;accueil</option>
          <option>Aménagement complet</option>
          <option>Autre</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[13px] font-semibold">Votre message *</label>
        <textarea name="message" value={form.message} onChange={update} required rows={5} placeholder="Décrivez votre projet, surface, nombre de postes, délais…" className={`${INPUT} resize-none`} />
      </div>

      <button type="submit" className="mt-6 w-full sm:w-auto rounded-full bg-orange px-7 py-3.5 font-semibold text-white transition hover:bg-orange-dark hover:-translate-y-0.5">
        Envoyer la demande →
      </button>
      <p className="mt-3 text-xs text-ink-soft">En envoyant ce formulaire, vous acceptez d&apos;être recontacté par Côté BURO.</p>
    </form>
  );
}