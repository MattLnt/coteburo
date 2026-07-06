import { NextResponse } from "next/server";
import { envoyerDevis } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const d = await req.json();

    if (!d.nom?.trim() || !d.prenom?.trim() || !d.email?.trim()) {
      return NextResponse.json({ error: "Merci de remplir les champs obligatoires." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    await envoyerDevis({
      prenom: d.prenom.trim(),
      nom: d.nom.trim(),
      societe: d.societe?.trim() || null,
      email: d.email.trim(),
      telephone: d.telephone?.trim() || null,
      typeProjet: d.typeProjet?.trim() || null,
      surface: d.surface?.trim() || null,
      delai: d.delai?.trim() || null,
      budget: d.budget?.trim() || null,
      message: d.message?.trim() || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur devis:", err.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
  }
}