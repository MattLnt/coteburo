import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FavorisGrille from "./FavorisGrille";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes favoris · Côté BURO" };

export default async function FavorisPage() {
  const session = await auth();
  const userId = session.user.id;

  // Récupère les favoris de l'utilisateur
  const favoris = await prisma.favori.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const codes = favoris.map((f) => f.codeRacine);

  // Charge les produits correspondants (publiés)
  const produits = codes.length
    ? await prisma.produit.findMany({ where: { codeRacine: { in: codes }, publie: true } })
    : [];

  // Ré-ordonne selon l'ordre des favoris (plus récent d'abord)
  const produitsOrdonnes = codes
    .map((code) => produits.find((p) => p.codeRacine === code))
    .filter(Boolean);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Espace client</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2">Mes favoris</h1>
        <p className="text-ink-soft mt-2">Retrouvez ici les produits que vous avez enregistrés.</p>
      </div>

      {produitsOrdonnes.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center">
          <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-surface-2 text-ink-soft/40">
            <svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
          </div>
          <p className="text-ink-soft">Vous n&apos;avez pas encore de favoris.</p>
          <p className="text-[13px] text-ink-soft/80 mt-1">Cliquez sur le cœur d&apos;un produit pour l&apos;enregistrer ici.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-orange text-white font-semibold px-6 py-3 mt-5 hover:bg-orange-dark transition">Découvrir le catalogue →</Link>
        </div>
      ) : (
        <FavorisGrille produits={JSON.parse(JSON.stringify(produitsOrdonnes))} />
      )}
    </div>
  );
}