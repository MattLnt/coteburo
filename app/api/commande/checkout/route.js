import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPromotionsActives, appliquerPromotions } from "@/lib/promotions";
import { calculerTousLesFrais } from "@/lib/frais";
import { prixVenteEffectif } from "@/lib/prixDeclinaison";

// Génère un numéro de commande lisible : CB-2026-0001
async function genererNumero() {
  const annee = new Date().getFullYear();
  const count = await prisma.commande.count();
  const seq = String(count + 1).padStart(4, "0");
  return `CB-${annee}-${seq}`;
}

// Critères de mot de passe — identiques à ceux affichés côté client (CompteAuth.js, commande/page.js)
function motDePasseValide(mdp) {
  if (!mdp || mdp.length < 9) return false;
  if (!/[A-Z]/.test(mdp)) return false;
  if (!/[0-9]/.test(mdp)) return false;
  if (!/[^A-Za-z0-9]/.test(mdp)) return false;
  return true;
}

// Même logique de promo que celle affichée dans l'admin (PrixProduit.js) — un pourcentage
// n'est actif que si la date du jour est dans la période choisie (ou si aucune date n'est fixée).
function prixApresPromoVitrine(vitrine, prixBase) {
  if (!vitrine.promoPct) return prixBase;
  const now = new Date();
  if (vitrine.promoDebut && new Date(vitrine.promoDebut) > now) return prixBase;
  if (vitrine.promoFin && new Date(vitrine.promoFin) < now) return prixBase;
  return prixBase * (1 - vitrine.promoPct / 100);
}

export async function POST(req) {
  try {
    const { client, items, avecInstallation, creerCompte, motDePasse } = await req.json();

    if (!items?.length) {
      return NextResponse.json({ error: "Panier vide." }, { status: 400 });
    }
    const requis = ["email", "prenom", "nom", "adresse", "codePostal", "ville"];
    for (const k of requis) {
      if (!client?.[k]?.trim()) return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
    }
    const email = client.email.trim().toLowerCase();

    // ── Détermine l'utilisateur à rattacher — TOUJOURS décidé côté serveur ──
    const session = await auth();
    let userId = session?.user?.id || null;
    let compteNouvellementCree = false;

    if (!userId && creerCompte) {
      if (!motDePasseValide(motDePasse)) {
        return NextResponse.json({ error: "Le mot de passe ne respecte pas les critères requis." }, { status: 400 });
      }
      const existant = await prisma.user.findUnique({ where: { email } });
      if (!existant) {
        const hash = await bcrypt.hash(motDePasse, 10);
        const nouveauCompte = await prisma.user.create({
          data: {
            email,
            password: hash,
            nom: `${client.prenom.trim()} ${client.nom.trim()}`.trim(),
            role: "CLIENT",
          },
        });
        userId = nouveauCompte.id;
        compteNouvellementCree = true;
      }
    }

    // ── Recharge les vrais prix depuis la base — jamais confiance au client.
    // Trois cas : l'ancien système (Produit, par codeRacine), le nouveau (ProduitVitrine
    // + déclinaisons, par vitrineId + declinaisonId), et les options (optionsAdditionnelles). ──
    const itemsAnciens = items.filter((it) => it.type !== "nouveau" && !it.optionId);
    const itemsNouveaux = items.filter((it) => it.type === "nouveau");

    const codes = [...new Set(itemsAnciens.map((it) => it.codeRacine))];
    const produitsAnciens = codes.length > 0
      ? await prisma.produit.findMany({ where: { codeRacine: { in: codes }, publie: true }, include: { marque: { select: { nom: true } } } })
      : [];
    const produitsAnciensMap = Object.fromEntries(produitsAnciens.map((p) => [p.codeRacine, p]));

    // Toutes les fiches concernées : produits "nouveau" ET produits parents des options.
    const vitrineIds = [...new Set(items.filter((it) => it.vitrineId).map((it) => it.vitrineId))];
    const vitrines = vitrineIds.length > 0
      ? await prisma.produitVitrine.findMany({
          where: { id: { in: vitrineIds }, publie: true },
          include: { gamme: { include: { marque: { select: { nom: true } } } } },
        })
      : [];
    const vitrinesMap = Object.fromEntries(vitrines.map((v) => [v.id, v]));

    // Marge globale actuelle — pour recalculer le vrai prix de vente des déclinaisons
    // non verrouillées, exactement comme sur la fiche produit publique.
    const reglagesPrix = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } });
    const margeGlobale = reglagesPrix?.margeGlobale ?? 0.3;

    const promosActives = await getPromotionsActives();

    const lignes = [];
    for (const it of items) {
      const quantite = Math.max(1, parseInt(it.quantite) || 1);

      // ── Option additionnelle : prix vérifié depuis optionsAdditionnelles de la fiche parente ──
      if (it.optionId) {
        const v = vitrinesMap[it.vitrineId];
        if (!v) return NextResponse.json({ error: `Option indisponible : ${it.designation}` }, { status: 400 });
        const options = Array.isArray(v.optionsAdditionnelles) ? v.optionsAdditionnelles : [];
        const opt = options.find((o) => o && o.id === it.optionId);
        if (!opt) return NextResponse.json({ error: `Cette option n'est plus disponible : ${it.designation}` }, { status: 400 });

        // Deux cas : option à déclinaisons (prix par combinaison) ou prix unique.
        const estDecl = !(opt.sansDeclinaisons ?? true) && Array.isArray(opt.axes) && opt.axes.length > 0;
        let prixOpt = null;
        let refOpt = opt.reference || null;

        if (estDecl || it.optionDeclinaisonId) {
          const decls = Array.isArray(opt.declinaisons) ? opt.declinaisons : [];
          const d = decls.find((x) => x.id === it.optionDeclinaisonId);
          if (!d) return NextResponse.json({ error: `Cette configuration d'option n'est plus disponible : ${it.designation}` }, { status: 400 });
          prixOpt = Number(d.prixVenteHT);
          refOpt = d.referenceFournisseur || opt.reference || null;
        } else {
          prixOpt = Number(opt.prixVenteHT ?? opt.prixHT);
        }

        if (!prixOpt || prixOpt <= 0) return NextResponse.json({ error: `Prix indisponible pour l'option : ${it.designation}` }, { status: 400 });

        lignes.push({
          codeRacine: null,
          referenceFournisseur: refOpt,
          designation: `${opt.nom} (option)`,
          marque: v.gamme?.marque?.nom || null,
          finition: it.finition || null,
          prixHT: prixOpt,
          quantite,
          imageUrl: (opt.images && opt.images[0]) || null,
        });
        continue;
      }

      if (it.type === "nouveau") {
        const v = vitrinesMap[it.vitrineId];
        if (!v) return NextResponse.json({ error: `Produit indisponible : ${it.designation}` }, { status: 400 });

        const declinaisons = Array.isArray(v.declinaisons) ? v.declinaisons : [];
        const decl = declinaisons.find((d) => d.id === it.declinaisonId);
        if (!decl) return NextResponse.json({ error: `Cette configuration n'est plus disponible : ${it.designation}` }, { status: 400 });

        const prixBase = prixVenteEffectif(decl, margeGlobale);
        if (!prixBase || prixBase <= 0) return NextResponse.json({ error: `Prix indisponible pour : ${it.designation}` }, { status: 400 });

        lignes.push({
          codeRacine: null,
          referenceFournisseur: decl.referenceFournisseur || null,
          designation: v.nom,
          marque: v.gamme?.marque?.nom || null,
          finition: it.finition || null,
          prixHT: prixApresPromoVitrine(v, prixBase),
          quantite,
          imageUrl: v.imageUrl || null,
        });
      } else {
        const p = produitsAnciensMap[it.codeRacine];
        if (!p) return NextResponse.json({ error: `Produit indisponible : ${it.designation}` }, { status: 400 });
        const { prixFinal } = appliquerPromotions(p, promosActives);
        lignes.push({
          codeRacine: p.codeRacine,
          referenceFournisseur: p.codeRacine,
          designation: p.designation,
          marque: p.marque?.nom || null,
          finition: it.finition || null,
          prixHT: prixFinal,
          quantite,
          imageUrl: p.images?.[0] || null,
        });
      }
    }

    const totalHT = lignes.reduce((s, l) => s + l.prixHT * l.quantite, 0);
    const totalTVA = totalHT * 0.2;
    const totalTTC = totalHT + totalTVA;

    // Frais recalculés côté serveur uniquement
    const frais = await calculerTousLesFrais(totalTTC);
    const installationValidee = !!avecInstallation && frais.installationDisponible;
    const fraisLivraison = frais.fraisLivraison;
    const fraisInstallation = installationValidee ? frais.fraisInstallation : 0;

    const montantFinalTTC = totalTTC + fraisLivraison + fraisInstallation;
    const montantCentimes = Math.round(montantFinalTTC * 100);

    // Création de la commande "en attente"
    const numero = await genererNumero();
    const commande = await prisma.commande.create({
      data: {
        numero,
        statut: "en_attente",
        email: client.email.trim(),
        telephone: client.telephone?.trim() || null,
        prenom: client.prenom.trim(),
        nom: client.nom.trim(),
        societe: client.societe?.trim() || null,
        adresse: client.adresse.trim(),
        complement: client.complement?.trim() || null,
        codePostal: client.codePostal.trim(),
        ville: client.ville.trim(),
        pays: "France",
        totalHT, totalTVA, totalTTC,
        fraisLivraison,
        fraisInstallation,
        avecInstallation: installationValidee,
        userId,
        paye: false,
        lignes: { create: lignes },
      },
    });

    // Création du PaymentIntent (le paiement reste sur ton site)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: montantCentimes,
      currency: "eur",
      receipt_email: client.email.trim(),
      metadata: { commandeId: commande.id, numero },
      payment_method_types: ["card"],
    });

    await prisma.commande.update({
      where: { id: commande.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      numero,
      commandeId: commande.id,
      compteCree: compteNouvellementCree,
    });
  } catch (err) {
    console.error("Erreur checkout:", err);
    return NextResponse.json({ error: "Erreur lors de la création du paiement." }, { status: 500 });
  }
}