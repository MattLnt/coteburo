"use client";
import { useState } from "react";
import Link from "next/link";

const euro = (v) => `${Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const ETAPES = [
  { cle: "payee", label: "Payée" },
  { cle: "en_preparation", label: "En préparation" },
  { cle: "expediee", label: "Expédiée" },
  { cle: "livree", label: "Livrée" },
];
const ORDRE = { en_attente: 0, payee: 1, en_preparation: 2, expediee: 3, livree: 4 };

const STATUT_LABEL = {
  en_attente: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
  echec_paiement: "Paiement échoué",
};

export default function SuiviPage() {
  const [numero, setNumero] = useState("");
  const [email, setEmail] = useState("");
  const [commande, setCommande] = useState(null);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const rechercher = async (e) => {
    e.preventDefault();
    setErreur(""); setCommande(null); setLoading(true);
    try {
      const res = await fetch("/api/suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, email }),
      });
      const data = await res.json();
      if (data.commande) setCommande(data.commande);
      else setErreur(data.error || "Commande introuvable.");
    } catch {
      setErreur("Une erreur est survenue. Réessayez.");
    }
    setLoading(false);
  };

  const annulee = commande && (commande.statut === "annulee" || commande.statut === "echec_paiement");
  const niveauActuel = commande ? (ORDRE[commande.statut] ?? 0) : 0;

  return (
    <main className="mx-auto max-w-[760px] px-5 sm:px-7 py-12 sm:py-16">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Suivi de commande</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-3">Suivez votre commande</h1>
        <p className="text-ink-soft mt-3 max-w-md mx-auto">Renseignez votre numéro de commande et votre email pour connaître l&apos;état de votre commande.</p>
      </div>

      {/* Formulaire */}
      <form onSubmit={rechercher} className="rounded-[24px] bg-charcoal p-7 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.25), transparent 70%)" }} />
        <div className="relative grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5 text-white/80">Numéro de commande</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="CB-2026-0001"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange focus:bg-white/10 transition" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold mb-1.5 text-white/80">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" type="email"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange focus:bg-white/10 transition" />
          </div>
        </div>
        {erreur && <p className="relative text-sm text-white bg-orange/20 border border-orange/40 rounded-lg px-3 py-2.5 mt-4">{erreur}</p>}
        <button type="submit" disabled={loading} className="relative w-full rounded-full bg-orange text-white font-semibold px-8 py-3.5 mt-5 hover:bg-orange-dark transition disabled:opacity-60">
          {loading ? "Recherche…" : "Suivre ma commande"}
        </button>
      </form>

      {/* Résultat */}
      {commande && (
        <div className="mt-6 rounded-[24px] border border-line bg-surface p-7 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <p className="font-display font-bold text-2xl">{commande.numero}</p>
              <p className="text-ink-soft text-sm mt-1">Commandé le {dateFR(commande.createdAt)}</p>
            </div>
            <span className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${annulee ? "bg-surface-2 text-ink-soft" : "bg-orange-tint text-orange-dark"}`}>
              {STATUT_LABEL[commande.statut] || commande.statut}
            </span>
          </div>

          {/* Suivi visuel */}
          {!annulee ? (
            <div className="flex items-center mb-6">
              {ETAPES.map((etape, i) => {
                const niveau = ORDRE[etape.cle];
                const atteint = niveauActuel >= niveau;
                const actuel = niveauActuel === niveau;
                return (
                  <div key={etape.cle} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 transition ${atteint ? "bg-orange text-white" : "bg-surface-2 text-ink-soft/40"} ${actuel ? "ring-4 ring-orange/20" : ""}`}>
                        {atteint ? <svg width="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg> : <span className="w-2 h-2 rounded-full bg-current" />}
                      </span>
                      <span className={`text-[11.5px] text-center font-medium ${atteint ? "text-ink" : "text-ink-soft"}`}>{etape.label}</span>
                    </div>
                    {i < ETAPES.length - 1 && <div className={`flex-1 h-0.5 mx-1 -mt-6 rounded transition ${niveauActuel > niveau ? "bg-orange" : "bg-line"}`} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-ink-soft bg-surface-2 rounded-xl px-4 py-3 mb-6 text-sm">Cette commande a été {commande.statut === "annulee" ? "annulée" : "interrompue (paiement non abouti)"}.</p>
          )}

          {commande.statut === "en_attente" && (
            <p className="text-[13px] text-orange-dark bg-orange-tint rounded-lg px-3 py-2.5 mb-6">Votre paiement est en attente de confirmation.</p>
          )}

          {/* Articles */}
          <div className="border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-3">Articles</p>
            <div className="flex flex-col gap-2">
              {commande.lignes.map((l, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink">{l.designation}{l.finition ? ` · ${l.finition}` : ""}</span>
                  <span className="text-ink-soft whitespace-nowrap ml-3">×{l.quantite}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-line">
              <span className="font-display font-bold">Total TTC</span>
              <span className="font-display font-bold text-lg text-orange">{euro(commande.totalTTC)}</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-orange-tint px-4 py-3.5 flex items-center gap-3">
            <svg width="20" viewBox="0 0 24 24" fill="none" stroke="#d9551a" strokeWidth="1.8" className="shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            <p className="text-[13px] text-orange-dark">Une question sur votre commande ? <Link href="/contact" className="font-semibold underline">Contactez-nous</Link>.</p>
          </div>
        </div>
      )}

      {/* Lien vers compte */}
      <p className="text-center text-sm text-ink-soft mt-8">
        Vous avez un compte ? <Link href="/connexion" className="text-orange hover:text-orange-dark font-semibold">Connectez-vous</Link> pour retrouver toutes vos commandes.
      </p>
    </main>
  );
}