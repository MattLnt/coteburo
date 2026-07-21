import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CRITERES = [
  (p) => p.length >= 9,
  (p) => /[A-Z]/.test(p),
  (p) => /[0-9]/.test(p),
  (p) => /[^A-Za-z0-9]/.test(p),
];
const motDePasseValide = (mdp) => !!mdp && CRITERES.every((test) => test(mdp));

export async function POST(req) {
  try {
    const { token, motDePasse } = await req.json();

    if (!token || !motDePasse) {
      return NextResponse.json({ error: "Requête incomplète." }, { status: 400 });
    }
    if (!motDePasseValide(motDePasse)) {
      return NextResponse.json({ error: "Le mot de passe ne respecte pas les critères requis." }, { status: 400 });
    }

    const enregistrement = await prisma.resetPasswordToken.findUnique({ where: { token } });
    if (!enregistrement) {
      return NextResponse.json({ error: "Ce lien n'est plus valide. Demandez-en un nouveau." }, { status: 400 });
    }
    if (enregistrement.expiresAt < new Date()) {
      await prisma.resetPasswordToken.delete({ where: { token } });
      return NextResponse.json({ error: "Ce lien a expiré. Demandez-en un nouveau." }, { status: 400 });
    }

    const hash = await bcrypt.hash(motDePasse, 10);
    await prisma.user.update({
      where: { id: enregistrement.userId },
      data: { password: hash },
    });

    // Jeton à usage unique — supprimé dès qu'il a servi (et tous les autres du même compte, par sécurité)
    await prisma.resetPasswordToken.deleteMany({ where: { userId: enregistrement.userId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur reinitialiser-mot-de-passe:", err);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}