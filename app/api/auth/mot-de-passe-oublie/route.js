import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { envoyerReinitialisationMotDePasse } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email requis." }, { status: 400 });
    }
    const emailPropre = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: emailPropre } });

    // On répond toujours "ok" que le compte existe ou non — jamais révéler
    // quels emails ont un compte via le comportement de cette route.
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Nettoie les anciens jetons de ce compte avant d'en émettre un nouveau
    await prisma.resetPasswordToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await prisma.resetPasswordToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    await envoyerReinitialisationMotDePasse({
      email: user.email,
      prenom: user.nom?.split(" ")[0] || null,
      token,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur mot-de-passe-oublie:", err);
    // Même en cas d'erreur interne, on ne révèle rien de précis au client
    return NextResponse.json({ ok: true });
  }
}