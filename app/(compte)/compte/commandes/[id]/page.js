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
      {/* Fil d'ariane */}
      <div className="text-sm text-ink-soft mb-6">
        <Link href="/compte" className="hover:text-orange">Espace client</Link> / <Link href="/compte/commandes" className="hover:text-orange">Mes commandes</Link> / <span className="text-ink">{c.numero}</span>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-bold text-3xl">{c.numero}</h1>
            <StatutCommande statut={c.statut} />
          </div>
          <p className="text-ink-soft mt-1.5">Passée le {dateFR(c.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Suivi visuel (masqué si annulée) */}
      {!annulee && (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-7 mb-6">
          <h2 className="font-display font-bold text-lg mb-6">Suivi de commande</h2>
          <div className="flex items-center">
            {ETAPES.map((etape, i) => {
              const niveau = ORDRE[etape.cle];
              const atteint = niveauActuel >= niveau;
              const actuel = niveauActuel === niveau;
              return (
                <div key={etape.cle} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 transition ${atteint ? "bg-orange text-white" : "bg-surface-2 text-ink-soft/40"} ${actuel ? "ring-4 ring-orange/20" : ""}`}>
                      {atteint ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
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
            <p className="text-[13px] text-ink-soft mt-5 bg-orange-tint rounded-lg px-3 py-2.5">Votre paiement est en attente de confirmation.</p>
          )}
        </div>
      )}

      {annulee && (
        <div className="rounded-2xl border border-line bg-surface p-6 mb-6">
          <p className="text-ink-soft">Cette commande a été {c.statut === "annulee" ? "annulée" : "interrompue (paiement non abouti)"}.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Articles */}
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="p-6 pb-2">
            <h2 className="font-display font-bold text-lg">Articles</h2>
          </div>
          <div className="divide-y divide-line">
            {c.lignes.map((l) => (
              <div key={l.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-16 h-16 rounded-xl bg-surface-2 overflow-hidden shrink-0 grid place-items-center">
                  {l.imageUrl ? <img src={l.imageUrl} alt="" className="w-full h-full object-cover" /> : <svg width="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-ink-soft/30"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-[14.5px] leading-snug">{l.designation}</p>
                  {l.finition && <p className="text-[12.5px] text-ink-soft mt-0.5">{l.finition}</p>}
                  <p className="text-[12.5px] text-ink-soft mt-0.5">Quantité : {l.quantite}</p>
                </div>
                <span className="font-semibold text-ink whitespace-nowrap">{euro(l.prixHT * l.quantite)}</span>
              </div>
            ))}
          </div>
          {/* Totaux */}
          <div className="border-t border-line px-6 py-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span className="text-ink-soft">Sous-total HT</span><span className="font-semibold">{euro(c.totalHT)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-soft">TVA (20 %)</span><span className="font-semibold">{euro(c.totalTVA)}</span></div>
            <div className="flex justify-between items-center pt-2 border-t border-line mt-1">
              <span className="font-display font-bold">Total TTC</span>
              <span className="font-display font-bold text-lg text-orange">{euro(c.totalTTC)}</span>
            </div>
          </div>
        </div>

        {/* Infos livraison */}
        <div className="flex flex-col gap-4">
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