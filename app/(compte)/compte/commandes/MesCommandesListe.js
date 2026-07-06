"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { StatutCommande } from "@/components/dashboard/StatutCommande";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const FILTRES = [
  { cle: "toutes", label: "Toutes" },
  { cle: "en_attente", label: "En attente" },
  { cle: "payee", label: "Payées" },
  { cle: "en_preparation", label: "En préparation" },
  { cle: "expediee", label: "Expédiées" },
  { cle: "livree", label: "Livrées" },
];

export default function MesCommandesListe({ commandes }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes");

  // Compte par statut pour afficher les badges de nombre
  const counts = useMemo(() => {
    const c = { toutes: commandes.length };
    for (const cmd of commandes) c[cmd.statut] = (c[cmd.statut] || 0) + 1;
    return c;
  }, [commandes]);

  const filtrees = useMemo(() => {
    return commandes.filter((c) => {
      if (filtre !== "toutes" && c.statut !== filtre) return false;
      if (recherche.trim()) {
        const q = recherche.toLowerCase();
        const matchNum = c.numero.toLowerCase().includes(q);
        const matchArticle = c.lignes.some((l) => l.designation.toLowerCase().includes(q));
        if (!matchNum && !matchArticle) return false;
      }
      return true;
    });
  }, [commandes, filtre, recherche]);

  return (
    <div>
      {/* Barre de recherche */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par numéro ou produit…"
          className="w-full rounded-xl border border-line bg-surface pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-orange transition"
        />
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTRES.map((f) => {
          const actif = filtre === f.cle;
          const n = counts[f.cle] || 0;
          if (f.cle !== "toutes" && n === 0) return null; // masque les filtres vides
          return (
            <button key={f.cle} onClick={() => setFiltre(f.cle)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${actif ? "bg-orange text-white" : "bg-surface border border-line text-ink hover:border-orange"}`}>
              {f.label}
              <span className={`text-[11px] px-1.5 rounded-full ${actif ? "bg-white/25" : "bg-surface-2 text-ink-soft"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {filtrees.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="text-ink-soft">Aucune commande ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtrees.map((c) => (
            <Link key={c.id} href={`/compte/commandes/${c.id}`} className="group rounded-2xl border border-line bg-surface p-5 sm:p-6 hover:border-orange hover:shadow-[0_20px_50px_-30px_rgba(240,102,27,0.4)] transition">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-display font-bold text-lg text-ink group-hover:text-orange transition">{c.numero}</p>
                    <StatutCommande statut={c.statut} />
                  </div>
                  <p className="text-[13px] text-ink-soft mt-1">{dateFR(c.createdAt)} · {c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-xl text-ink">{euro(c.totalTTC)}</p>
                  <span className="text-[13px] text-orange font-semibold inline-flex items-center gap-1 mt-0.5 group-hover:gap-2 transition-all">Détails →</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-x-4 gap-y-1">
                {c.lignes.slice(0, 3).map((l) => (
                  <span key={l.id} className="text-[13px] text-ink-soft">{l.designation}{l.quantite > 1 ? ` ×${l.quantite}` : ""}</span>
                ))}
                {c.lignes.length > 3 && <span className="text-[13px] text-ink-soft">+ {c.lignes.length - 3} autre{c.lignes.length - 3 > 1 ? "s" : ""}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}