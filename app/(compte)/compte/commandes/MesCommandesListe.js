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
  const [filtresOuverts, setFiltresOuverts] = useState(false);

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

  const filtresVisibles = FILTRES.filter((f) => f.cle === "toutes" || (counts[f.cle] || 0) > 0);
  const filtreActif = FILTRES.find((f) => f.cle === filtre);

  const pastilleFiltre = (f) => {
    const actif = filtre === f.cle;
    const n = counts[f.cle] || 0;
    return (
      <button key={f.cle} onClick={() => setFiltre(f.cle)}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition whitespace-nowrap ${actif ? "bg-orange text-white" : "bg-surface border border-line text-ink hover:border-orange"}`}>
        {f.label}
        <span className={`text-[10.5px] px-1.5 rounded-full ${actif ? "bg-white/25" : "bg-surface-2 text-ink-soft"}`}>{n}</span>
      </button>
    );
  };

  return (
    <div>
      <style>{`
        /* Sous 1024px : bloc de filtres repliable (six pastilles en flex-wrap
           occupaient trois lignes). Au-delà : les pastilles restent visibles. */
        .mc-filtres-bouton { display: flex; }
        .mc-filtres-corps { display: none; }
        .mc-filtres-corps.ouvert { display: block; }
        @media (min-width: 1024px) {
          .mc-filtres-bouton { display: none; }
          .mc-filtres-corps { display: block; }
        }
      `}</style>

      {/* Barre de recherche */}
      <div className="relative mb-2">
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
      <div className={`rounded-xl bg-surface mb-5 overflow-hidden border ${filtresOuverts ? "border-orange/40" : "border-line"} lg:border-none lg:bg-transparent lg:rounded-none lg:mb-6`}>
        <button
          type="button"
          onClick={() => setFiltresOuverts((v) => !v)}
          className="mc-filtres-bouton w-full items-center justify-between px-3.5 py-3"
        >
          <span className="flex items-center gap-2">
            <span className={filtresOuverts ? "text-orange-dark" : "text-ink-soft"}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            </span>
            <span className="text-[13px] font-semibold text-ink">Filtres</span>
            {filtre !== "toutes" && (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-orange-tint text-orange-dark">{filtreActif?.label}</span>
            )}
          </span>
          <span className={`${filtresOuverts ? "text-orange-dark rotate-180" : "text-ink-soft"} transition-transform`}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </button>

        <div className={`mc-filtres-corps${filtresOuverts ? " ouvert" : ""} px-3.5 pb-3.5 pt-0 border-t border-line lg:p-0 lg:border-none`}>
          <div className="flex flex-wrap gap-2 pt-3 lg:pt-0">
            {filtresVisibles.map(pastilleFiltre)}
          </div>
        </div>
      </div>

      {/* Liste */}
      {filtrees.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="text-ink-soft text-[14px]">Aucune commande ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {filtrees.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-6 hover:border-orange hover:shadow-[0_20px_50px_-30px_rgba(240,102,27,0.4)] transition">
              {/* Numéro et montant sur la même ligne : le bloc de droite en
                  text-right décrochait sous le contenu à cause du flex-wrap. */}
              <div className="flex items-start justify-between gap-3">
                <p className="font-display font-bold text-[17px] sm:text-lg text-ink">{c.numero}</p>
                <p className="font-display font-bold text-[18px] sm:text-xl text-ink whitespace-nowrap">{euro(c.totalTTC)}</p>
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatutCommande statut={c.statut} />
                <span className="text-[11.5px] sm:text-[13px] text-ink-soft">
                  {dateFR(c.createdAt)} · {c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Une désignation par ligne : en flex-wrap, elles s'enchaînaient
                  sans séparateur et devenaient illisibles. */}
              <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-line flex flex-col gap-0.5">
                {c.lignes.slice(0, 3).map((l) => (
                  <span key={l.id} className="text-[12.5px] sm:text-[13px] text-ink-soft truncate">
                    {l.designation}{l.quantite > 1 ? ` ×${l.quantite}` : ""}
                  </span>
                ))}
                {c.lignes.length > 3 && (
                  <span className="text-[12.5px] sm:text-[13px] text-ink-soft/70">
                    + {c.lignes.length - 3} autre{c.lignes.length - 3 > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <Link href={`/compte/commandes/${c.id}`}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 py-2.5 text-[12.5px] font-semibold text-ink hover:border-orange hover:text-orange-dark transition">
                Voir le détail
                <span className="text-orange-dark">→</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}