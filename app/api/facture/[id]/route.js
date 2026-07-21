import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { FactureDocument } from "@/lib/FactureDocument";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const c = await prisma.commande.findUnique({ where: { id }, include: { lignes: true } });
  if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Un admin peut télécharger la facture de n'importe quel client.
  // Un client normal ne peut télécharger que ses propres factures (email de la commande = email de son compte).
  const estProprietaire = c.email.toLowerCase() === session.user.email.toLowerCase();
  const estAdmin = session.user.role === "ADMIN";
  if (!estProprietaire && !estAdmin) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<FactureDocument c={c} />);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Facture-${c.numero}.pdf"`,
    },
  });
}