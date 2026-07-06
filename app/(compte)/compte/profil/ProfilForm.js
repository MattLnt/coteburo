"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfil, changerMotDePasse } from "./actions";

const champStyle = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition";
const labelStyle = "block text-[13px] font-semibold mb-1.5 text-ink";

const CRITERES = [
  { label: "9 caractères min.", test: (p) => p.length >= 9 },
  { label: "Une majuscule", test: (p) => /[A-Z]/.test(p) },
  { label: "Une minuscule", test: (p) => /[a-z]/.test(p) },
  { label: "Un chiffre", test: (p) => /[0-9]/.test(p) },
  { label: "Un symbole", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function CardHead({ icon, titre, sousTitre }) {
  return (
    <div className="flex items-start gap-3.5 mb-6">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-tint text-orange-dark shrink-0">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <div>
        <h2 className="font-display font-bold text-lg text-ink leading-tight">{titre}</h2>
        <p className="text-[13px] text-ink-soft mt-0.5">{sousTitre}</p>
      </div>
    </div>
  );
}

export default function ProfilForm({ prenom, nom, email }) {
  const router = useRouter();
  const [infos, setInfos] = useState({ prenom: prenom || "", nom: nom || "" });
  const [infosMsg, setInfosMsg] = useState(null);
  const [infosLoad, setInfosLoad] = useState(false);

  const [pwd, setPwd] = useState({ actuel: "", nouveau: "" });
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdLoad, setPwdLoad] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const pwdValide = CRITERES.every((c) => c.test(pwd.nouveau));
  const initiale = (prenom?.[0] || email?.[0] || "?").toUpperCase();

  const saveInfos = async () => {
    setInfosMsg(null); setInfosLoad(true);
    const res = await updateProfil(infos);
    setInfosLoad(false);
    if (res.error) setInfosMsg({ type: "err", txt: res.error });
    else { setInfosMsg({ type: "ok", txt: "Informations mises à jour." }); router.refresh(); }
  };

  const savePwd = async () => {
    setPwdMsg(null);
    if (!pwdValide) { setPwdMsg({ type: "err", txt: "Le nouveau mot de passe ne respecte pas les critères." }); return; }
    setPwdLoad(true);
    const res = await changerMotDePasse(pwd);
    setPwdLoad(false);
    if (res.error) setPwdMsg({ type: "err", txt: res.error });
    else { setPwdMsg({ type: "ok", txt: "Mot de passe modifié avec succès." }); setPwd({ actuel: "", nouveau: "" }); }
  };

  const Msg = ({ m }) => m ? (
    <p className={`text-sm rounded-lg px-3 py-2.5 mt-4 flex items-center gap-2 ${m.type === "ok" ? "bg-[#e8f6f0] text-[#1f7a52]" : "bg-orange-tint text-orange-dark"}`}>
      {m.type === "ok" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>}
      {m.txt}
    </p>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Carte identité */}
      <div className="rounded-[24px] p-7 sm:p-8 relative overflow-hidden" style={{ background: "linear-gradient(150deg, #23262a 0%, #2d2620 60%, #3a2820 100%)" }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />
        <div className="relative flex items-center gap-5">
          <span className="grid place-items-center w-16 h-16 rounded-full bg-orange text-white font-display font-bold text-2xl shrink-0">{initiale}</span>
          <div>
            <p className="font-display font-bold text-2xl text-white">{[prenom, nom].filter(Boolean).join(" ") || "Mon compte"}</p>
            <p className="text-white/60 text-sm mt-0.5">{email}</p>
          </div>
        </div>
      </div>

      {/* Deux cartes */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Infos personnelles */}
        <div className="rounded-[24px] border border-line bg-surface p-7">
          <CardHead
            icon={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>}
            titre="Informations personnelles"
            sousTitre="Votre nom tel qu'il apparaît sur vos commandes"
          />
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Prénom</label>
                <input className={champStyle} value={infos.prenom} onChange={(e) => setInfos((f) => ({ ...f, prenom: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>Nom</label>
                <input className={champStyle} value={infos.nom} onChange={(e) => setInfos((f) => ({ ...f, nom: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Email</label>
              <div className="relative">
                <input className={`${champStyle} pr-10 bg-surface-2 text-ink-soft cursor-not-allowed`} value={email} disabled />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                </span>
              </div>
              <p className="text-[12px] text-ink-soft mt-1.5">L&apos;email ne peut pas être modifié.</p>
            </div>
          </div>
          <Msg m={infosMsg} />
          <button onClick={saveInfos} disabled={infosLoad} className="rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition disabled:opacity-60">
            {infosLoad ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>

        {/* Mot de passe */}
        <div className="rounded-[24px] border border-line bg-surface p-7">
          <CardHead
            icon={<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>}
            titre="Sécurité"
            sousTitre="Modifiez votre mot de passe régulièrement"
          />
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelStyle}>Mot de passe actuel</label>
              <input type="password" className={champStyle} value={pwd.actuel} onChange={(e) => setPwd((f) => ({ ...f, actuel: e.target.value }))} placeholder="••••••••" />
            </div>
            <div>
              <label className={labelStyle}>Nouveau mot de passe</label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} className={`${champStyle} pr-11`} value={pwd.nouveau} onChange={(e) => setPwd((f) => ({ ...f, nouveau: e.target.value }))} placeholder="Nouveau mot de passe" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-orange transition">
                  {showPwd ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M1 1l22 22" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                </button>
              </div>
              {pwd.nouveau.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                  {CRITERES.map((c, i) => {
                    const ok = c.test(pwd.nouveau);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={ok ? "text-orange" : "text-ink-soft/35"}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" /></svg>
                        </span>
                        <span className={`text-[12.5px] ${ok ? "text-orange-dark font-medium" : "text-ink-soft"}`}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <Msg m={pwdMsg} />
          <button onClick={savePwd} disabled={pwdLoad || !pwdValide || !pwd.actuel} className="rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition disabled:opacity-50 disabled:cursor-not-allowed">
            {pwdLoad ? "Modification…" : "Changer le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}