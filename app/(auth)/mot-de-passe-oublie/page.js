"use client";
import { useState } from "react";
import Link from "next/link";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");

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

  return (
    <main className="min-h-screen grid place-items-center bg-bg px-6 py-16">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="block text-center mb-8">
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", color: "#23262a" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-8">
          {envoye ? (
            <>
              <div className="grid place-items-center w-14 h-14 rounded-full bg-orange-tint text-orange-dark mx-auto mb-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </div>
              <h1 className="font-display font-bold text-2xl text-center">Email envoyé</h1>
              <p className="text-ink-soft text-[14.5px] text-center mt-3 leading-relaxed">
                Si un compte existe avec l'adresse <span className="font-medium text-ink">{email}</span>, vous recevrez un lien pour choisir un nouveau mot de passe d'ici quelques minutes.
              </p>
              <Link href="/connexion" className="block text-center rounded-full bg-charcoal text-white font-semibold text-sm px-6 py-3.5 mt-7 hover:bg-[#2d3035] transition">Retour à la connexion</Link>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-center">Mot de passe oublié</h1>
              <p className="text-ink-soft text-[14.5px] text-center mt-2 mb-6 leading-relaxed">
                Indiquez votre email, nous vous enverrons un lien pour en choisir un nouveau.
              </p>

              <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErreur(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="vous@exemple.fr"
                className="w-full rounded-xl border border-line bg-bg px-4 py-3.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition"
              />
              {erreur && <p className="text-[13px] text-orange-dark mt-2.5">{erreur}</p>}

              <button onClick={handleSubmit} disabled={envoi} className="w-full rounded-xl bg-charcoal text-white font-semibold px-8 py-4 mt-6 hover:bg-[#2d3035] transition disabled:opacity-50">
                {envoi ? "Envoi…" : "Envoyer le lien"}
              </button>

              <p className="text-ink-soft text-[14px] text-center mt-6">
                <Link href="/connexion" className="text-orange hover:text-orange-dark font-semibold">← Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}