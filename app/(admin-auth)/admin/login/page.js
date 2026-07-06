"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession, signOut } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });

    if (res?.error) {
      setLoading(false);
      setError("Email ou mot de passe incorrect.");
      return;
    }

    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      await signOut({ redirect: false });
      setLoading(false);
      setError("Cet espace est réservé aux administrateurs. Utilisez votre espace client pour vous connecter.");
      return;
    }

    setLoading(false);
    router.push("/admin");
    router.refresh();
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* ═══════ Colonne image ═══════ */}
      <div className="hidden lg:block relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"
          alt="Bureau Côté BURO"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Voile charcoal + dégradé */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(150deg, rgba(35,38,42,0.92) 0%, rgba(35,38,42,0.75) 45%, rgba(58,40,32,0.7) 100%)" }} />
        <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.35), transparent 70%)" }} />

        {/* Contenu */}
        <div className="relative h-full flex flex-col justify-between p-14">
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>

          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-white mb-6">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f0661b" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Espace sécurisé
            </span>
            <h2 className="font-display font-bold text-white text-[36px] leading-tight max-w-[400px]">
              Pilotez votre boutique en toute simplicité
            </h2>
            <p className="text-white/60 text-[15px] mt-4 max-w-[380px] leading-relaxed">
              Gérez vos produits, commandes, promotions et contenus depuis un espace d&apos;administration unifié.
            </p>

            <div className="flex flex-col gap-3 mt-8">
              {["Catalogue & stock en temps réel", "Suivi des commandes et factures", "Gestion des promotions et du blog"].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="grid place-items-center h-5 w-5 rounded-full bg-orange/25 text-orange shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  <span className="text-white/75 text-[14px]">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-[13px]">© {new Date().getFullYear()} Côté BURO · Espace d&apos;administration</p>
        </div>
      </div>

      {/* ═══════ Colonne formulaire ═══════ */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative">
        {/* Logo mobile */}
        <div className="lg:hidden text-center mb-8">
          <span style={{ fontSize: 24, fontWeight: 800, color: "#23262a" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
        </div>

        <div className="max-w-[400px] w-full mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">Administration</p>
          <h1 className="font-display font-bold text-[32px] text-ink mt-2 mb-1.5">Connexion</h1>
          <p className="text-ink-soft text-[15px] mb-7">Accédez à votre espace de gestion.</p>

          {error && (
            <div className="mb-5 rounded-xl bg-orange-tint border border-orange/30 px-4 py-3 text-orange-dark text-sm">
              {error}
              {error.includes("administrateurs") && (
                <a href="/connexion" className="block mt-2 font-semibold text-orange hover:text-orange-dark underline">Aller à l&apos;espace client →</a>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                </span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  className="w-full rounded-xl border border-line bg-surface pl-11 pr-4 py-3.5 text-sm text-ink outline-none focus:border-orange transition" placeholder="admin@coteburo.fr" />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2">Mot de passe</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                </span>
                <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                  className="w-full rounded-xl border border-line bg-surface pl-11 pr-11 py-3.5 text-sm text-ink outline-none focus:border-orange transition" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-orange transition">
                  {showPwd ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M1 1l22 22" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-charcoal text-white font-semibold py-4 mt-2 hover:bg-[#2d3035] transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {loading ? "Connexion…" : (<>Se connecter <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>)}
            </button>
          </form>

          <a href="/" className="block text-center text-[13px] text-ink-soft hover:text-orange transition mt-6">← Retour au site</a>
        </div>
      </div>
    </main>
  );
}