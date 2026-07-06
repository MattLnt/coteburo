"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { inscrireClient } from "@/app/(compte)/compte/actions";

const CRITERES = [
  { cle: "longueur", label: "9 caractères min.", test: (p) => p.length >= 9 },
  { cle: "majuscule", label: "Une majuscule", test: (p) => /[A-Z]/.test(p) },
  { cle: "chiffre", label: "Un chiffre", test: (p) => /[0-9]/.test(p) },
  { cle: "symbole", label: "Un symbole (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const AVANTAGES = [
  "Suivi de vos commandes en temps réel",
  "Vos factures téléchargeables à tout moment",
  "Enregistrez vos produits favoris",
  "Un conseil personnalisé pour vos projets",
];

export default function CompteAuth({ mode }) {
  const router = useRouter();
  const inscription = mode === "inscription";
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreur(""); };
  const pwdValide = CRITERES.every((c) => c.test(form.password));

  const handleSubmit = async () => {
    setErreur("");
    if (inscription && !pwdValide) { setErreur("Votre mot de passe ne respecte pas tous les critères."); return; }
    setEnvoi(true);
    if (inscription) {
      const res = await inscrireClient(form);
      if (res.error) { setErreur(res.error); setEnvoi(false); return; }
      const login = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (login?.error) { setErreur("Compte créé, mais connexion impossible."); setEnvoi(false); return; }
      router.push("/compte"); router.refresh();
    } else {
      const login = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (login?.error) { setErreur("Email ou mot de passe incorrect."); setEnvoi(false); return; }
      router.push("/compte"); router.refresh();
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ═══════ Colonne gauche : vitrine immersive ═══════ */}
      <div className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden" style={{ background: "linear-gradient(160deg, #1a1c1f 0%, #23262a 45%, #3a2820 100%)" }}>
        {/* Cercles décoratifs */}
        <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.16), transparent 68%)", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.08), transparent 70%)", transform: "translateY(35%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.03), transparent 40%)" }} />

        {/* Logo */}
        <div className="relative">
          <Link href="/">
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
          </Link>
        </div>

        {/* Carte flottante haut */}
        <div className="absolute top-28 right-14 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur px-5 py-4 max-w-[240px]" style={{ boxShadow: "0 20px 50px -20px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-orange" />
            <span className="text-white font-bold text-[13.5px]">Best-seller</span>
          </div>
          <p className="text-white/60 text-[12.5px] leading-relaxed">Fauteuil ergonomique · Direction<br />À partir de 349 € HT</p>
        </div>

        {/* Titre + accroche */}
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange/15 border border-orange/25 px-3.5 py-1.5 text-[12.5px] font-semibold text-orange mb-6">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Espace client gratuit
          </span>
          <h2 className="font-display font-bold text-white text-[42px] leading-[1.05]">
            Aménagez vos<br />espaces <span className="text-orange">avec style.</span>
          </h2>
          <p className="text-white/55 text-[15px] mt-5 max-w-[360px] leading-relaxed">
            Rejoignez Côté BURO et gérez tous vos projets d&apos;aménagement de bureau depuis un seul espace.
          </p>

          <div className="flex flex-col gap-3 mt-8">
            {AVANTAGES.map((a) => (
              <div key={a} className="flex items-center gap-3">
                <span className="grid place-items-center h-5 w-5 rounded-full bg-orange/20 text-orange shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span className="text-white/75 text-[14px]">{a}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Carte flottante bas + réassurance */}
        <div className="relative flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#f0661b", "#23262a", "#d9551a"].map((c, i) => (
                <span key={i} className="w-8 h-8 rounded-full border-2 border-charcoal" style={{ background: c }} />
              ))}
            </div>
            <p className="text-white/60 text-[13px]"><span className="text-white font-semibold">Garantie 7 ans</span><br />Showroom à Aix-en-Provence</p>
          </div>
        </div>
      </div>

      {/* ═══════ Colonne droite : formulaire ═══════ */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative bg-bg">
        {/* Retour (mobile : logo) */}
        <div className="absolute top-8 left-6 sm:left-12 lg:left-20 right-6 flex items-center justify-between">
          <Link href="/" className="lg:hidden">
            <span style={{ fontSize: 22, fontWeight: 800, color: "#23262a" }}>CÔTÉ <span style={{ color: "#f0661b" }}>BURO</span></span>
          </Link>
          <Link href="/" className="text-[13px] text-ink-soft hover:text-orange transition inline-flex items-center gap-1.5 ml-auto">
            Retour au site
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </div>

        <div className="max-w-[400px] w-full mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-tint px-3 py-1.5 text-[12.5px] font-semibold text-orange-dark mb-5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            {inscription ? "Inscription gratuite" : "Espace client"}
          </span>

          <h1 className="font-display font-bold text-[34px] text-ink leading-tight">{inscription ? "Créer un compte" : "Bon retour"}</h1>
          <p className="text-ink-soft text-[15px] mt-1.5 mb-7">
            {inscription ? "Rejoignez Côté BURO dès aujourd'hui" : "Connectez-vous à votre espace client"}
          </p>

          <div className="flex flex-col gap-4" onKeyDown={(e) => e.key === "Enter" && handleSubmit()}>
            {inscription && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Champ label="Prénom" icon="user" value={form.prenom} onChange={(v) => set("prenom", v)} placeholder="Prénom" />
                <Champ label="Nom" icon="user" value={form.nom} onChange={(v) => set("nom", v)} placeholder="Nom" />
              </div>
            )}

            <Champ label="Email" icon="mail" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="vous@exemple.fr" />

            {/* Mot de passe avec œil */}
            <div>
              <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2">Mot de passe</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"><LockIcon /></span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={inscription ? "Créez un mot de passe" : "Votre mot de passe"}
                  className="w-full rounded-xl border border-line bg-surface pl-11 pr-11 py-3.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-orange transition">
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {inscription && form.password.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                  {CRITERES.map((c) => {
                    const ok = c.test(form.password);
                    return (
                      <div key={c.cle} className="flex items-center gap-2">
                        <span className={ok ? "text-orange" : "text-ink-soft/35"}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" /></svg>
                        </span>
                        <span className={`text-[12.5px] transition ${ok ? "text-orange-dark font-medium" : "text-ink-soft"}`}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {erreur && <p className="text-sm text-orange-dark bg-orange-tint rounded-lg px-3 py-2.5 mt-4">{erreur}</p>}

          <button onClick={handleSubmit} disabled={envoi || (inscription && !pwdValide)} className="w-full rounded-xl bg-charcoal text-white font-semibold px-8 py-4 mt-6 hover:bg-[#2d3035] transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
            {envoi ? "Un instant…" : (<>{inscription ? "Créer mon compte" : "Se connecter"} <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>)}
          </button>

          {inscription && (
            <p className="text-[12.5px] text-ink-soft text-center mt-4 leading-relaxed">
              En créant un compte, vous acceptez nos <Link href="/cgv" className="text-ink font-medium hover:text-orange">CGV</Link> et notre <Link href="/confidentialite" className="text-ink font-medium hover:text-orange">politique de confidentialité</Link>
            </p>
          )}

          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-line flex-1" /><span className="text-[12px] text-ink-soft">ou</span><div className="h-px bg-line flex-1" />
          </div>

          <p className="text-ink-soft text-[14.5px] text-center">
            {inscription ? (
              <>Déjà un compte ? <Link href="/connexion" className="text-orange hover:text-orange-dark font-semibold">Se connecter →</Link></>
            ) : (
              <>Pas encore de compte ? <Link href="/inscription" className="text-orange hover:text-orange-dark font-semibold">Créer un compte →</Link></>
            )}
          </p>

          <p className="text-[12px] text-ink-soft/70 text-center mt-6">
            Pas besoin de compte pour commander — c&apos;est 100 % optionnel.
          </p>
        </div>
      </div>
    </div>
  );
}

function Champ({ label, icon, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold uppercase tracking-wide text-ink-soft mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">{icon === "mail" ? <MailIcon /> : <UserIcon />}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-line bg-surface pl-11 pr-4 py-3.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition" />
      </div>
    </div>
  );
}

function MailIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>; }
function UserIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>; }
function LockIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>; }
function EyeIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }
function EyeOffIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M1 1l22 22" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>; }