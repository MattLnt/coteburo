import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MesCommandesListe from "./MesCommandesListe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes commandes · Côté BURO" };

export default async function MesCommandesPage() {
  const session = await auth();
  const email = session.user.email.toLowerCase();

  const commandes = await prisma.commande.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    include: { lignes: true },
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Espace client</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">Mes commandes</h1>
        <p className="text-ink-soft mt-2">Retrouvez l&apos;historique et le suivi de toutes vos commandes.</p>
      </div>

      {commandes.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center">
          <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
            <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 2H2" /><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /></svg>
          </div>
          <p className="text-ink-soft">Vous n&apos;avez pas encore passé de commande.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
        </div>
      ) : (
        <MesCommandesListe commandes={JSON.parse(JSON.stringify(commandes))} />
      )}
    </div>
  );
}