import { NextResponse } from "next/server";
import { limiter, adresseDe, reponseTropDeRequetes } from "@/lib/limiteDebit";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { envoyerDevis, envoyerDevisClient } from "@/lib/emails";
import { prixDepuisBase, clePrixLigne } from "@/lib/catalogue";

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
  // Chaque demande declenche deux emails, l'un a la societe, l'autre au client.
  const debit = limiter(`devis:${adresseDe(req)}`, 5, 10 * 60_000);
  if (!debit.ok) return reponseTropDeRequetes(debit.retenteDans);

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
          vitrineId: a.vitrineId || null,
          declinaisonId: a.declinaisonId || null,
          // Le bloc d'identité passe la liste blanche, sans quoi il serait
          // écarté avant d'atteindre la base : la demande de devis ne retient
          // que les champs qu'elle nomme.
          combinaisonId: a.combinaisonId || null,
          referenceComplete: a.referenceComplete || null,
          fournisseur: a.fournisseur || a.marque || null,
          choix: a.choix && typeof a.choix === "object" ? a.choix : null,
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

    // Le prix affiché sur la fiche est calculé dans le navigateur : il n'engage
    // rien. On le recalcule depuis la base avant de l'écrire dans le devis,
    // comme le fait déjà le paiement — sinon un panier vieux de plusieurs mois
    // (ou modifié à la main) fixerait le montant d'un document commercial.
    const prixBase = await prixDepuisBase(articles);
    for (const a of articles) {
      const resolu = a.vitrineId ? prixBase.get(clePrixLigne(a.vitrineId, a.declinaisonId)) : null;
      if (resolu && resolu.motif == null) {
        a.prixHT = resolu.prixHT ?? 0;
      } else {
        // Pas de référence exploitable (ligne d'un ancien panier, produit
        // dépublié, déclinaison supprimée) : on laisse la ligne, à 0. Le
        // commercial la chiffre au lieu de reprendre un montant invérifiable.
        a.prixHT = 0;
        a.motifPrix = resolu?.motif || "ligne sans référence catalogue";
      }
      // Les emails affichent prixIndicatif : on l'aligne sur le prix vérifié
      // pour que le client, le commercial et la base voient le même montant.
      // Une ligne non résolue repasse en « Sur devis » plutôt qu'en 0 €.
      a.prixIndicatif = a.motifPrix ? null : (resolu?.prixHT ?? null);
    }

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
              // Trace de l'article d'origine : permet de rechiffrer la ligne
              // depuis le catalogue au lieu de la retaper.
              vitrineId: a.vitrineId,
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
              prixHT: a.prixHT,
              ordre: i,
              // Le bloc d'identité : ce qu'il faudra commander, et chez qui.
              // Sans lui, l'information était à retrouver au moment de
              // l'acceptation du devis — et c'est là qu'elle se perdait.
              combinaisonId: a.combinaisonId || null,
              referenceComplete: a.referenceComplete || null,
              fournisseur: a.fournisseur || null,
              choix: a.choix || null,
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