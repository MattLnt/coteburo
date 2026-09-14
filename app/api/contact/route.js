import { NextResponse } from "next/server";
import { limiter, adresseDe, reponseTropDeRequetes } from "@/lib/limiteDebit";
import { envoyerContact } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req) {
  // Un visiteur n'ecrit pas cinq fois en dix minutes ; un robot, si.
  const debit = limiter(`contact:${adresseDe(req)}`, 5, 10 * 60_000);
  if (!debit.ok) return reponseTropDeRequetes(debit.retenteDans);

  try {
    const { nom, email, telephone, sujet, message } = await req.json();

    // Validation minimale
    if (!nom?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Merci de remplir les champs obligatoires." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    await envoyerContact({
      nom: nom.trim(),
      email: email.trim(),
      telephone: telephone?.trim() || null,
      sujet: sujet?.trim() || null,
      message: message.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur contact:", err.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
  }
}