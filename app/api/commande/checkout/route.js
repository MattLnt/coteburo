import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calculerTousLesFrais } from "@/lib/frais";
import { prixVitrine } from "@/lib/prixCatalogue";
import { montantTVA, TVA_DEFAUT } from "@/lib/tva";
import { getCampagnesActives } from "@/lib/promotions";
import { attacherCampagnes } from "@/lib/catalogue";

// Quantité maximale par ligne de commande en ligne. Au-delà, c'est un projet
// d'aménagement : il se chiffre en devis, pas au panier.
const QUANTITE_MAX = 200;

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
    // Deux cas : la fiche (ProduitVitrine + déclinaisons OU prix fixe, par
    // vitrineId) et les options inline (optionsAdditionnelles). ──
    //
    // Toutes les fiches concernées : produits du panier ET parents des options.
    const vitrineIds = [...new Set(items.filter((it) => it.vitrineId).map((it) => it.vitrineId))];
    const vitrines = vitrineIds.length > 0
      ? await prisma.produitVitrine.findMany({
          where: { id: { in: vitrineIds }, publie: true },
          include: {
            gamme: { include: { marque: { select: { nom: true } } } },
            // Pour appliquer les campagnes qui visent une categorie entiere.
            categories: { select: { slug: true } },
          },
        })
      : [];
    attacherCampagnes(vitrines, await getCampagnesActives());
    const vitrinesMap = Object.fromEntries(vitrines.map((v) => [v.id, v]));

    // ── Les variantes, telles qu'elles sont AUJOURD'HUI ──
    //
    // Le prix facturé se lisait dans le champ JSON `declinaisons`, que la
    // migration a laissé en place sans le maintenir. Corriger un prix dans
    // l'administration écrit la combinaison, jamais ce JSON : la commande
    // facturait donc le montant figé au jour de la reprise.
    //
    // On indexe par les DEUX identifiants. Le panier d'un client qui l'a
    // rempli avant la bascule, et les accessoires liés, désignent encore la
    // variante par son ancien identifiant ; `ancienId` fait le pont, et il
    // est renseigné sur les sept mille trois cent quatre-vingt-dix.
    const combinaisons = vitrineIds.length > 0
      ? await prisma.combinaison.findMany({
          where: { vitrineId: { in: vitrineIds } },
          select: {
            id: true, ancienId: true, vitrineId: true, valeurs: true,
            prixTarifHT: true, ecoContribution: true, referenceBase: true,
          },
        })
      : [];
    const variantes = new Map();
    for (const k of combinaisons) {
      variantes.set(k.id, k);
      if (k.ancienId) variantes.set(k.ancienId, k);
    }
    const varianteDe = (it) => variantes.get(it.combinaisonId) || variantes.get(it.declinaisonId) || null;

    // Marge globale actuelle — pour recalculer le vrai prix de vente des déclinaisons
    // non verrouillées, exactement comme sur la fiche produit publique.
    const reglagesPrix = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true, tva: true } });
    const margeGlobale = reglagesPrix?.margeGlobale ?? 0.3;
    const tauxTva = reglagesPrix?.tva ?? TVA_DEFAUT;

    const lignes = [];
    for (const it of items) {
      // Le plancher était posé, pas le plafond : rien n'empêchait une commande
      // de 999 999 unités, créée en base avant même le paiement. Au-delà de
      // QUANTITE_MAX, c'est un projet d'aménagement — il passe par un devis.
      const quantite = Math.min(QUANTITE_MAX, Math.max(1, parseInt(it.quantite) || 1));

      // ── Option additionnelle inline : prix vérifié depuis optionsAdditionnelles de la fiche parente ──
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
          // Une option se rattache au produit qu'elle complète, au lieu de
          // flotter à côté de lui sur le bon de commande. Le panier connaît
          // ce lien depuis toujours ; il s'arrêtait à la commande.
          vitrineId: it.vitrineId || null,
          referenceComplete: refOpt,
          fournisseur: v.gamme?.marque?.nom || null,
          cleParente: it.parentId || null,
        });
        continue;
      }

      {
        const v = vitrinesMap[it.vitrineId];
        if (!v) return NextResponse.json({ error: `Produit indisponible : ${it.designation}` }, { status: 400 });

        // Un seul calcul, le même que la fiche et le devis : prixVitrine gère
        // le prix unique, la variante et la promo.
        const variante = varianteDe(it);
        if (!variante && (it.combinaisonId || it.declinaisonId) && !v.sansDeclinaisons) {
          return NextResponse.json({ error: `Cette configuration n'est plus disponible : ${it.designation}` }, { status: 400 });
        }
        const { prixHT, motif } = prixVitrine(v, {
          combinaison: variante,
          declinaisonId: it.declinaisonId,
          surDevis: false,
          marge: margeGlobale,
        });
        if (motif === "déclinaison disparue du catalogue") {
          return NextResponse.json({ error: `Cette configuration n'est plus disponible : ${it.designation}` }, { status: 400 });
        }
        if (!prixHT || prixHT <= 0) {
          return NextResponse.json({ error: `Prix indisponible pour : ${it.designation}` }, { status: 400 });
        }

        // La référence assemblée par la règle du modèle l'emporte : c'est
        // elle qui tient compte des finitions retenues. À défaut, celle de la
        // variante, puis celle de la fiche.
        const reference = it.referenceComplete
          || variante?.referenceBase
          || v.referenceUnitaire
          || null;

        lignes.push({
          codeRacine: null,
          referenceFournisseur: reference,
          designation: it.designation || v.nom,
          marque: v.gamme?.marque?.nom || null,
          finition: it.finition || null,
          prixHT,
          quantite,
          imageUrl: v.imageUrl || null,
          vitrineId: v.id || it.vitrineId || null,
          combinaisonId: variante?.id || null,
          referenceComplete: reference,
          fournisseur: v.gamme?.marque?.nom || null,
          // Les réponses du client, telles qu'il les a données. À défaut, celles
          // de la variante : il faut bien savoir quoi commander.
          choix: it.choix || variante?.valeurs || null,
          // Un accessoire vendu comme produit lié passe par ici, et non par la
          // branche des options : sans ce rattachement il flottait à côté du
          // bureau qu'il complète sur le bon de commande.
          cleParente: it.parentId || null,
          clePanier: it.id || null,
        });
      }
    }

    const totalHT = lignes.reduce((s, l) => s + l.prixHT * l.quantite, 0);
    const totalTVA = montantTVA(totalHT, tauxTva);
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
        // « cleParente » et « clePanier » sont des repères du panier, pas des
        // colonnes : on les retire avant d'écrire, puis on s'en sert pour
        // rattacher chaque option à son produit une fois les lignes créées.
        lignes: { create: lignes.map(({ cleParente, clePanier, ...l }) => l) },
      },
      include: { lignes: { select: { id: true, designation: true } } },
    });

    // Second temps : l'option désigne sa ligne parente, qui n'existait pas
    // encore au moment de l'écriture. Sur le bon de commande, une goulotte
    // cesse ainsi de flotter à côté du bureau qu'elle complète.
    const parId = new Map();
    lignes.forEach((l, i) => {
      if (l.clePanier) parId.set(l.clePanier, commande.lignes[i]?.id);
    });
    for (let i = 0; i < lignes.length; i += 1) {
      const parenteId = lignes[i].cleParente ? parId.get(lignes[i].cleParente) : null;
      if (!parenteId) continue;
      await prisma.ligneCommande.update({
        where: { id: commande.lignes[i].id },
        data: { ligneParenteId: parenteId },
      });
    }

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