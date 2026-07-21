import { NextResponse } from "next/server";
import { envoyerDevis, envoyerDevisClient } from "@/lib/emails";

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

    const articles = Array.isArray(d.articles)
      ? d.articles.map((a) => ({
          designation: a.designation || "",
          gammeNom: a.gammeNom || null,
          config: a.config || null,
          image: a.image || null,
          quantite: a.quantite || 1,
          finitions: Array.isArray(a.finitions)
            ? a.finitions
                .filter((f) => f && f.nom && Array.isArray(f.valeurs) && f.valeurs.length > 0)
                .map((f) => ({ nom: String(f.nom), valeurs: f.valeurs.map(String) }))
            : [],
          prixIndicatif: a.prixIndicatif ?? null,
        }))
      : [];

    const payload = {
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
      articles,
    };

    // Envoi au commercial (obligatoire) et au client (accusé de réception, best-effort)
    await envoyerDevis(payload);
    try {
      await envoyerDevisClient(payload);
    } catch (e) {
      console.error("Erreur envoi confirmation client devis:", e.message);
      // on ne bloque pas la réponse si seul l'email client échoue
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur devis:", err.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
  }
}