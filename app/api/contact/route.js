import { NextResponse } from "next/server";
import { envoyerContact } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req) {
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