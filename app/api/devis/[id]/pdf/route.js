import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { DevisDocument } from "@/lib/DevisDocument";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const devis = await prisma.devis.findUnique({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Trois façons d'accéder au PDF : le jeton du lien envoyé au client
  // (sans compte), un admin connecté, ou le client propriétaire connecté.
  let autorise = token && token === devis.token;
  if (!autorise) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    autorise = session.user.role === "ADMIN" || session.user.email.toLowerCase() === devis.email.toLowerCase();
  }
  if (!autorise) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const reglages = await prisma.reglages.findUnique({ where: { id: 1 } });

  const buffer = await renderToBuffer(<DevisDocument d={devis} reglages={reglages || {}} />);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Devis-${devis.numero}.pdf"`,
    },
  });
}