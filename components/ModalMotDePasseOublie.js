"use client";
import { useState } from "react";

export default function ModalMotDePasseOublie({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    setErreur("");
    if (!email.trim()) { setErreur("Renseignez votre adresse email."); return; }
    setEnvoi(true);
    try {
      await fetch("/api/auth/mot-de-passe-oublie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {}
    // Toujours le même message, que le compte existe ou non — évite de révéler quels emails ont un compte.
    setEnvoye(true);
    setEnvoi(false);
  };

  const fermer = () => {
    onClose();
    // Réinitialise après la fermeture, pour ne pas voir le contenu changer pendant l'animation
    setTimeout(() => { setEmail(""); setEnvoye(false); setErreur(""); }, 250);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div onClick={fermer} className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[420px] rounded-2xl bg-surface border border-line p-7 shadow-2xl">
        <button onClick={fermer} aria-label="Fermer" className="absolute top-4 right-4 text-ink-soft hover:text-ink transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {envoye ? (
          <>
            <div className="grid place-items-center w-12 h-12 rounded-full bg-orange-tint text-orange-dark mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            </div>
            <h2 className="font-display font-bold text-xl">Email envoyé</h2>
            <p className="text-ink-soft text-[14px] mt-2.5 leading-relaxed">
              Si un compte existe avec l&apos;adresse <span className="font-medium text-ink">{email}</span>, vous recevrez un lien pour choisir un nouveau mot de passe d&apos;ici quelques minutes.
            </p>
            <button onClick={fermer} className="w-full rounded-full bg-charcoal text-white font-semibold text-sm px-6 py-3 mt-6 hover:bg-[#2d3035] transition">Fermer</button>
          </>
        ) : (
          <>
            <h2 className="font-display font-bold text-xl">Mot de passe oublié</h2>
            <p className="text-ink-soft text-[14px] mt-2 mb-5 leading-relaxed">Indiquez votre email, nous vous enverrons un lien pour en choisir un nouveau.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErreur(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="vous@exemple.fr"
              autoFocus
              className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition"
            />
            {erreur && <p className="text-[13px] text-orange-dark mt-2.5">{erreur}</p>}
            <button onClick={handleSubmit} disabled={envoi} className="w-full rounded-full bg-charcoal text-white font-semibold text-sm px-6 py-3.5 mt-5 hover:bg-[#2d3035] transition disabled:opacity-50">
              {envoi ? "Envoi…" : "Envoyer le lien"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}