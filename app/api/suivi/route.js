import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { numero, email } = await req.json();

    if (!numero?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Merci de renseigner le numéro de commande et l'email." }, { status: 400 });
    }

    const commande = await prisma.commande.findFirst({
      where: {
        numero: numero.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      },
      include: { lignes: true },
    });

    if (!commande) {
      return NextResponse.json({ error: "Aucune commande ne correspond à ces informations. Vérifiez le numéro et l'email." }, { status: 404 });
    }

    // On ne renvoie que les infos nécessaires (pas de données sensibles superflues)
    return NextResponse.json({
      commande: {
        numero: commande.numero,
        statut: commande.statut,
        createdAt: commande.createdAt,
        prenom: commande.prenom,
        totalTTC: commande.totalTTC,
        ville: commande.ville,
        codePostal: commande.codePostal,
        lignes: commande.lignes.map((l) => ({
          designation: l.designation,
          finition: l.finition,
          quantite: l.quantite,
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
  }
}