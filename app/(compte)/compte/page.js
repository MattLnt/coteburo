import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatutCommande } from "@/components/dashboard/StatutCommande";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte · Côté BURO" };

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const dateCourte = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export default async function ComptePage() {
  const session = await auth();
  const email = session.user.email;
  const prenom = (session.user.name || "").split(" ")[0] || "";

  const commandes = await prisma.commande.findMany({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { lignes: true },
  });

  const payees = commandes.filter((c) => c.paye);
  const totalDepense = payees.reduce((s, c) => s + c.totalTTC, 0);
  const enCours = commandes.filter((c) => ["payee", "en_preparation", "expediee"].includes(c.statut)).length;

  return (
    <div>
      {/* Hero */}
      <div className="rounded-[20px] sm:rounded-[24px] p-6 sm:p-10 mb-4 sm:mb-6 relative overflow-hidden" style={{ background: "linear-gradient(150deg, #23262a 0%, #2d2620 60%, #3a2820 100%)" }}>
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />
        <div className="relative">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Espace client</p>
          <h1 className="font-display font-bold text-[26px] sm:text-4xl text-white mt-2">Bonjour {prenom}</h1>
          <p className="text-white/60 mt-2 max-w-md text-[13px] sm:text-base leading-relaxed">
            Retrouvez ici vos commandes, vos factures et vos favoris.
          </p>
          {/* Boutons en demi-largeur sur mobile : côte à côte, ils débordaient. */}
          <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
            <Link href="/catalogue" className="flex-1 sm:flex-none text-center rounded-full bg-orange text-white font-semibold px-4 sm:px-5 py-2.5 text-[12.5px] sm:text-sm hover:bg-orange-dark transition">
              Catalogue
            </Link>
            <Link href="/compte/commandes" className="flex-1 sm:flex-none text-center rounded-full border border-white/20 text-white font-semibold px-4 sm:px-5 py-2.5 text-[12.5px] sm:text-sm hover:bg-white/10 transition">
              Mes commandes
            </Link>
          </div>
        </div>
      </div>

      {/* Stats — le total en pleine largeur sur mobile : en trois colonnes,
          un montant à décimales déborde de sa carte. */}
      <div className="rounded-2xl border border-line bg-surface p-4 sm:hidden mb-2">
        <p className="text-[11.5px] text-ink-soft">Total dépensé</p>
        <p className="font-display font-bold text-[26px] text-orange mt-1.5 leading-none">{euro(totalDepense)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="font-display font-bold text-xl sm:text-3xl text-ink leading-none">{commandes.length}</p>
          <p className="text-[11.5px] sm:text-[13px] text-ink-soft mt-1.5">Commande{commandes.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="font-display font-bold text-xl sm:text-3xl text-ink leading-none">{enCours}</p>
          <p className="text-[11.5px] sm:text-[13px] text-ink-soft mt-1.5">En cours</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 hidden sm:block">
          <p className="font-display font-bold text-3xl text-orange leading-none">{euro(totalDepense)}</p>
          <p className="text-[13px] text-ink-soft mt-1.5">Total dépensé</p>
        </div>
      </div>

      {/* Dernières commandes */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <h2 className="font-display font-bold text-lg sm:text-xl">Dernières commandes</h2>
          {commandes.length > 0 && <Link href="/compte/commandes" className="text-orange font-semibold text-[12.5px] sm:text-sm hover:text-orange-dark transition">Tout voir →</Link>}
        </div>

        {commandes.length === 0 ? (
          <div className="px-6 pb-10 pt-4 text-center">
            <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
              <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>
            </div>
            <p className="text-ink-soft text-[14px]">Vous n&apos;avez pas encore passé de commande.</p>
            <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 text-sm hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {commandes.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/compte/commandes/${c.id}`} className="block px-4 sm:px-6 py-3 sm:py-4 hover:bg-surface-2 transition">
                {/* Le montant était masqué sous sm — or c'est l'information
                    que le client cherche en premier. Il passe donc sur la
                    ligne du numéro, statut et date en dessous. */}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink text-[14px] sm:text-[15px]">{c.numero}</p>
                  <span className="font-display font-bold text-ink text-[14px] sm:text-base whitespace-nowrap">{euro(c.totalTTC)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatutCommande statut={c.statut} />
                  <span className="text-[11px] sm:text-[13px] text-ink-soft truncate">
                    <span className="sm:hidden">{dateCourte(c.createdAt)}</span>
                    <span className="hidden sm:inline">{dateFR(c.createdAt)}</span>
                    {" · "}{c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}