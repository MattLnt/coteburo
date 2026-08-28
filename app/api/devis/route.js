import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { envoyerDevis, envoyerDevisClient } from "@/lib/emails";

export const runtime = "nodejs";

// Numéro lisible : DV-2026-0043, remis à zéro chaque année.
async function genererNumero() {
  const annee = new Date().getFullYear();
  const prefixe = `DV-${annee}-`;
  const dernier = await prisma.devis.findFirst({
    where: { numero: { startsWith: prefixe } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const suivant = dernier ? parseInt(dernier.numero.slice(prefixe.length), 10) + 1 : 1;
  return `${prefixe}${String(suivant).padStart(4, "0")}`;
}

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
          // La référence catalogue distingue une ligne produit d'une ligne
          // libre : sans elle, l'admin traite tout comme une ligne libre.
          codeRacine: a.codeRacine || null,
          carteSlug: a.carteSlug || null,
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

    // Enregistrement en base — priorité sur l'email : une demande perdue en
    // base est irrécupérable, alors qu'un email peut être renvoyé.
    let devis = null;
    try {
      const numero = await genererNumero();
      devis = await prisma.devis.create({
        data: {
          numero,
          token: randomBytes(24).toString("hex"),
          prenom: payload.prenom,
          nom: payload.nom,
          societe: payload.societe,
          email: payload.email.toLowerCase(),
          telephone: payload.telephone,
          typeProjet: payload.typeProjet,
          surface: payload.surface,
          delai: payload.delai,
          budget: payload.budget,
          message: payload.message,
          lignes: {
            create: articles.map((a, i) => ({
              codeRacine: a.codeRacine,
              designation: a.designation,
              gammeNom: a.gammeNom,
              // Les finitions choisies sont recopiées dans la config : le
              // client doit retrouver exactement ce qu'il a configuré.
              config: [
                a.config,
                ...a.finitions.map((f) => `${f.nom} : ${f.valeurs.join(", ")}`),
              ].filter(Boolean).join(" · ") || null,
              imageUrl: a.image,
              quantite: a.quantite,
              prixHT: a.prixIndicatif ?? 0,
              ordre: i,
            })),
          },
        },
      });
    } catch (e) {
      console.error("Erreur enregistrement devis:", e.message);
      // On continue : mieux vaut un email sans trace en base que rien du tout.
    }

    // Envoi au commercial (obligatoire) et au client (accusé de réception, best-effort)
    await envoyerDevis({ ...payload, numero: devis?.numero || null });
    try {
      await envoyerDevisClient({ ...payload, numero: devis?.numero || null });
    } catch (e) {
      console.error("Erreur envoi confirmation client devis:", e.message);
      // on ne bloque pas la réponse si seul l'email client échoue
    }

    return NextResponse.json({ ok: true, numero: devis?.numero || null });
  } catch (err) {
    console.error("Erreur devis:", err.message);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
  }
}