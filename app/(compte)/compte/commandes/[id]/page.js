import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatutCommande } from "@/components/dashboard/StatutCommande";

export const dynamic = "force-dynamic";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const ETAPES = [
  { cle: "payee", label: "Payée" },
  { cle: "en_preparation", label: "En préparation" },
  { cle: "expediee", label: "Expédiée" },
  { cle: "livree", label: "Livrée" },
];
const ORDRE = { en_attente: 0, payee: 1, en_preparation: 2, expediee: 3, livree: 4 };

const ICONE_CHECK = <path d="M20 6 9 17l-5-5" />;

export default async function DetailCommandePage({ params }) {
  const { id } = await params;
  const session = await auth();
  const email = session.user.email.toLowerCase();

  const c = await prisma.commande.findUnique({ where: { id }, include: { lignes: true } });
  if (!c || c.email.toLowerCase() !== email) notFound();

  const annulee = c.statut === "annulee" || c.statut === "echec_paiement";
  const niveauActuel = ORDRE[c.statut] ?? 0;

  return (
    <div>
      {/* Fil d'ariane — réduit à un retour simple sur mobile */}
      <div className="mb-4 sm:mb-6">
        <Link href="/compte/commandes" className="sm:hidden inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-orange">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg>
          Mes commandes
        </Link>
        <div className="hidden sm:block text-sm text-ink-soft">
          <Link href="/compte" className="hover:text-orange">Espace client</Link> / <Link href="/compte/commandes" className="hover:text-orange">Mes commandes</Link> / <span className="text-ink">{c.numero}</span>
        </div>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4 sm:mb-8">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="font-display font-bold text-[24px] sm:text-3xl">{c.numero}</h1>
            <StatutCommande statut={c.statut} />
          </div>
          <p className="text-ink-soft mt-1 sm:mt-1.5 text-[12.5px] sm:text-base">Passée le {dateFR(c.createdAt)}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <a href={`/api/facture/${c.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-charcoal text-white font-semibold text-sm px-5 py-2.5 hover:bg-[#2d3035] transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            Télécharger la facture
          </a>
          <Link href="/compte/commandes" className="text-orange font-semibold text-sm hover:text-orange-dark transition inline-flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
            Retour
          </Link>
        </div>
      </div>

      {/* Bouton facture en pleine largeur sur mobile */}
      <a href={`/api/facture/${c.id}`} target="_blank" rel="noopener noreferrer" className="sm:hidden flex items-center justify-center gap-2 rounded-xl bg-charcoal text-white font-semibold text-[13px] py-3 mb-3.5 hover:bg-[#2d3035] transition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
        Télécharger la facture
      </a>

      {/* Suivi visuel (masqué si annulée) */}
      {!annulee && (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-7 mb-3 sm:mb-6">
          <h2 className="font-display font-bold text-[15.5px] sm:text-lg mb-4 sm:mb-6">Suivi de commande</h2>

          {/* ── Mobile : timeline verticale ──
              En ligne sur 340px, « En préparation » se casse en deux et
              désaligne le trait de liaison. */}
          <div className="sm:hidden">
            {ETAPES.map((etape, i) => {
              const niveau = ORDRE[etape.cle];
              const atteint = niveauActuel >= niveau;
              const actuel = niveauActuel === niveau;
              const dernier = i === ETAPES.length - 1;
              return (
                <div key={etape.cle} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span className={`grid place-items-center w-[26px] h-[26px] rounded-full shrink-0 ${atteint ? "bg-orange text-white" : "bg-surface-2"} ${actuel ? "ring-4 ring-orange/20" : ""}`}>
                      {atteint
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">{ICONE_CHECK}</svg>
                        : <span className="w-[7px] h-[7px] rounded-full bg-ink-soft/30" />}
                    </span>
                    {!dernier && <span className={`w-0.5 flex-1 min-h-[26px] ${niveauActuel > niveau ? "bg-orange" : "bg-line"}`} />}
                  </div>
                  <div className={dernier ? "" : "pb-3.5"}>
                    <p className={`text-[13.5px] mt-0.5 ${atteint ? "font-semibold text-ink" : "text-ink-soft"}`}>{etape.label}</p>
                    {actuel && <p className="text-[11.5px] text-ink-soft mt-0.5">Étape en cours</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Desktop : timeline horizontale ── */}
          <div className="hidden sm:flex items-center">
            {ETAPES.map((etape, i) => {
              const niveau = ORDRE[etape.cle];
              const atteint = niveauActuel >= niveau;
              const actuel = niveauActuel === niveau;
              return (
                <div key={etape.cle} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 transition ${atteint ? "bg-orange text-white" : "bg-surface-2 text-ink-soft/40"} ${actuel ? "ring-4 ring-orange/20" : ""}`}>
                      {atteint ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">{ICONE_CHECK}</svg>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </span>
                    <span className={`text-[12px] text-center font-medium ${atteint ? "text-ink" : "text-ink-soft"}`}>{etape.label}</span>
                  </div>
                  {i < ETAPES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-6 rounded transition ${niveauActuel > niveau ? "bg-orange" : "bg-line"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {c.statut === "en_attente" && (
            <p className="text-[12.5px] sm:text-[13px] text-ink-soft mt-4 sm:mt-5 bg-orange-tint rounded-lg px-3 py-2.5">Votre paiement est en attente de confirmation.</p>
          )}
        </div>
      )}

      {annulee && (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 mb-3 sm:mb-6">
          <p className="text-ink-soft text-[13.5px]">Cette commande a été {c.statut === "annulee" ? "annulée" : "interrompue (paiement non abouti)"}.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-3 sm:gap-6 items-start">
        {/* Articles */}
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h2 className="font-display font-bold text-[15.5px] sm:text-lg">Articles</h2>
          </div>
          <div className="divide-y divide-line">
            {c.lignes.map((l) => (
              <div key={l.id} className="flex gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface-2 overflow-hidden shrink-0 grid place-items-center">
                  {l.imageUrl ? <img src={l.imageUrl} alt="" className="w-full h-full object-cover" /> : <svg width="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-ink-soft/30"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-[13.5px] sm:text-[14.5px] leading-snug">{l.designation}</p>
                  {l.finition && <p className="text-[11.5px] sm:text-[12.5px] text-ink-soft mt-0.5">{l.finition}</p>}
                  {/* Quantité et prix sur une ligne : à droite du texte, le prix
                      était écrasé sur un écran étroit. */}
                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    <span className="text-[11.5px] sm:text-[12.5px] text-ink-soft">Qté {l.quantite}</span>
                    <span className="font-semibold text-ink text-[14px] whitespace-nowrap">{euro(l.prixHT * l.quantite)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Totaux */}
          <div className="border-t border-line px-4 sm:px-6 py-4 flex flex-col gap-1.5 sm:gap-2">
            <div className="flex justify-between text-[12.5px] sm:text-sm"><span className="text-ink-soft">Sous-total HT</span><span className="font-semibold">{euro(c.totalHT)}</span></div>
            <div className="flex justify-between text-[12.5px] sm:text-sm"><span className="text-ink-soft">TVA (20 %)</span><span className="font-semibold">{euro(c.totalTVA)}</span></div>
            <div className="flex justify-between items-center pt-2.5 border-t border-line mt-1">
              <span className="font-display font-bold text-[14px] sm:text-base">Total TTC</span>
              <span className="font-display font-bold text-[18px] sm:text-lg text-orange">{euro(c.totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* Livraison et contact — fusionnés en une carte sur mobile,
            deux cartes de 24px de padding pour trois lignes, c'était creux. */}
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 lg:hidden">
          <h3 className="font-display font-bold text-[15.5px] mb-3">Livraison &amp; contact</h3>
          <div className="flex gap-2.5 pb-3">
            <span className="text-ink-soft/60 shrink-0 mt-0.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </span>
            <p className="text-[12.5px] text-ink leading-relaxed">
              <span className="font-semibold">{c.prenom} {c.nom}</span>{c.societe ? <><br />{c.societe}</> : null}<br />
              {c.adresse}{c.complement ? <>, {c.complement}</> : null}<br />
              {c.codePostal} {c.ville}
            </p>
          </div>
          <div className="flex gap-2.5 pt-3 border-t border-line">
            <span className="text-ink-soft/60 shrink-0 mt-0.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
            </span>
            <p className="text-[12.5px] text-ink-soft leading-relaxed">{c.email}{c.telephone ? <><br />{c.telephone}</> : null}</p>
          </div>
        </div>

        {/* Deux cartes distinctes en desktop */}
        <div className="hidden lg:flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-display font-bold text-base mb-3">Livraison</h3>
            <p className="text-[13.5px] text-ink leading-relaxed">
              <span className="font-semibold">{c.prenom} {c.nom}</span>{c.societe ? <><br />{c.societe}</> : null}<br />
              {c.adresse}{c.complement ? <>, {c.complement}</> : null}<br />
              {c.codePostal} {c.ville}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-display font-bold text-base mb-3">Contact</h3>
            <p className="text-[13.5px] text-ink-soft leading-relaxed">{c.email}{c.telephone ? <><br />{c.telephone}</> : null}</p>
          </div>
        </div>
      </div>
    </div>
  );
}