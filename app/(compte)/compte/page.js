import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatutCommande } from "@/components/dashboard/StatutCommande";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte · Côté BURO" };

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

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

  const STATS = [
    { valeur: commandes.length, label: `Commande${commandes.length > 1 ? "s" : ""}`, accent: false },
    { valeur: enCours, label: "En cours", accent: false },
    { valeur: euro(totalDepense), label: "Total dépensé", accent: true },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="rounded-[24px] p-8 sm:p-10 mb-6 relative overflow-hidden" style={{ background: "linear-gradient(150deg, #23262a 0%, #2d2620 60%, #3a2820 100%)" }}>
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Espace client</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white mt-2">Bonjour {prenom}</h1>
          <p className="text-white/60 mt-2 max-w-md">Retrouvez ici l&apos;historique de vos commandes, vos factures et vos favoris.</p>
          <div className="flex gap-3 mt-6">
            <Link href="/catalogue" className="rounded-full bg-orange text-white font-semibold px-5 py-2.5 text-sm hover:bg-orange-dark transition">Parcourir le catalogue</Link>
            <Link href="/compte/commandes" className="rounded-full border border-white/20 text-white font-semibold px-5 py-2.5 text-sm hover:bg-white/10 transition">Mes commandes</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-5">
            <p className={`font-display font-bold text-2xl sm:text-3xl ${s.accent ? "text-orange" : "text-ink"}`}>{s.valeur}</p>
            <p className="text-[13px] text-ink-soft mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Dernières commandes */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-display font-bold text-xl">Dernières commandes</h2>
          {commandes.length > 0 && <Link href="/compte/commandes" className="text-orange font-semibold text-sm hover:text-orange-dark transition">Tout voir →</Link>}
        </div>

        {commandes.length === 0 ? (
          <div className="px-6 pb-10 pt-4 text-center">
            <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
              <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>
            </div>
            <p className="text-ink-soft">Vous n&apos;avez pas encore passé de commande.</p>
            <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {commandes.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/compte/commandes/${c.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-2 transition">
                <div>
                  <p className="font-semibold text-ink">{c.numero}</p>
                  <p className="text-[13px] text-ink-soft">{dateFR(c.createdAt)} · {c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-ink hidden sm:block">{euro(c.totalTTC)}</span>
                  <StatutCommande statut={c.statut} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}