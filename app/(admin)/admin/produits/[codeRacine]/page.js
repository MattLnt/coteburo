import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { EditForm } from "./EditForm";

export const dynamic = "force-dynamic";

export default async function ProduitEditPage({ params }) {
  const { codeRacine } = await params;
  const code = decodeURIComponent(codeRacine);

  const produit = await prisma.produit.findUnique({
    where: { codeRacine: code },
    include: {
      marque: { select: { nom: true } },
      _count: { select: { variantes: true } },
    },
  });

  if (!produit) notFound();

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <Link href="/admin/produits" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#5c616a", textDecoration: "none", marginBottom: 14, fontWeight: 500 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          Retour aux produits
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="box" size={22} />
          </span>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "#23262a", margin: 0, lineHeight: 1.1 }}>{produit.designation}</h1>
            <p style={{ fontSize: 13, color: "#9aa0a8", margin: "3px 0 0" }}>{produit.marque?.nom} · {produit.gamme} · {produit.codeRacine}</p>
          </div>
        </div>
      </div>

      <EditForm produit={JSON.parse(JSON.stringify(produit))} />
    </>
  );
}