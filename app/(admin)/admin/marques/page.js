import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/dashboard/Icon";
import { MarquesManager } from "./MarquesManager";

export const dynamic = "force-dynamic";

export default async function MarquesPage() {
  const marques = await prisma.marque.findMany({
    include: { _count: { select: { produits: true } } },
    orderBy: { nom: "asc" },
  });

  return (
    <>
      <style>{`
        /* L'icône d'en-tête prend de la place sans rien apporter en mobile. */
        .mq-icone { display: none; }
        @media (min-width: 1024px) {
          .mq-icone { display: grid; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span className="mq-icone" style={{ width: 44, height: 44, borderRadius: 12, background: "#fce6d6", color: "#d9551a", placeItems: "center", flexShrink: 0 }}>
          <Icon name="layers" size={22} />
        </span>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0, lineHeight: 1.1 }}>Marques</h1>
          <p style={{ fontSize: 13.5, color: "#5c616a", margin: "4px 0 0" }}>Remise et visibilité de vos partenaires.</p>
        </div>
      </div>

      <MarquesManager marques={JSON.parse(JSON.stringify(marques))} />
    </>
  );
}