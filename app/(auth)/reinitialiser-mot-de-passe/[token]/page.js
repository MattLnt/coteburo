"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const CRITERES = [
  { cle: "longueur", label: "9 caractères min.", test: (p) => p.length >= 9 },
  { cle: "majuscule", label: "Une majuscule", test: (p) => /[A-Z]/.test(p) },
  { cle: "chiffre", label: "Un chiffre", test: (p) => /[0-9]/.test(p) },
  { cle: "symbole", label: "Un symbole (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function ReinitialiserMotDePassePage() {
  const { token } = useParams();
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [reussi, setReussi] = useState(false);

  const mdpValide = CRITERES.every((c) => c.test(motDePasse));

  const handleSubmit = async () => {
    setErreur("");
    if (!mdpValide) { setErreur("Votre mot de passe ne respecte pas tous les critères."); return; }
    if (motDePasse !== confirmation) { setErreur("Les deux mots de passe ne correspondent pas."); return; }
    setEnvoi(true);
    try {
      const res = await fetch("/api/auth/reinitialiser-mot-de-passe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, motDePasse }),
      });
      const data = await res.json();
      if (!res.ok) { setErreur(data.error || "Ce lien n'est plus valide."); setEnvoi(false); return; }
      setReussi(true);
      setTimeout(() => router.push("/connexion"), 2500);
    } catch {
      setErreur("Impossible de contacter le serveur.");
      setEnvoi(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-bg px-6 py-16">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="block text-center mb-8">
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", color: "#23262a" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
        </Link>

        <div className="rounded-2xl border border-line bg-surface p-8">
          {reussi ? (
            <>
              <div className="grid place-items-center w-14 h-14 rounded-full bg-[#e8f6f0] text-[#1f7a52] mx-auto mb-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h1 className="font-display font-bold text-2xl text-center">Mot de passe mis à jour</h1>
              <p className="text-ink-soft text-[14.5px] text-center mt-3 leading-relaxed">Vous allez être redirigé vers la connexion…</p>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-center">Nouveau mot de passe</h1>
              <p className="text-ink-soft text-[14.5px] text-center mt-2 mb-6 leading-relaxed">Choisissez un mot de passe pour votre compte.</p>

              <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => { setMotDePasse(e.target.value); setErreur(""); }}
                  placeholder="Créez un mot de passe"
                  className="w-full rounded-xl border border-line bg-bg pl-4 pr-11 py-3.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-orange transition text-[13px] font-semibold">
                  {showPwd ? "Masquer" : "Voir"}
                </button>
              </div>

              {motDePasse.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                  {CRITERES.map((c) => {
                    const ok = c.test(motDePasse);
                    return (
                      <div key={c.cle} className="flex items-center gap-2">
                        <span className={ok ? "text-orange" : "text-ink-soft/35"}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" /></svg>
                        </span>
                        <span className={`text-[12px] ${ok ? "text-orange-dark font-medium" : "text-ink-soft"}`}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2 mt-5">Confirmer le mot de passe</label>
              <input
                type={showPwd ? "text" : "password"}
                value={confirmation}
                onChange={(e) => { setConfirmation(e.target.value); setErreur(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Retapez le mot de passe"
                className="w-full rounded-xl border border-line bg-bg px-4 py-3.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition"
              />

              {erreur && <p className="text-[13px] text-orange-dark mt-3">{erreur}</p>}

              <button onClick={handleSubmit} disabled={envoi} className="w-full rounded-xl bg-charcoal text-white font-semibold px-8 py-4 mt-6 hover:bg-[#2d3035] transition disabled:opacity-50">
                {envoi ? "Un instant…" : "Mettre à jour mon mot de passe"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}