// ─────────────────────────────────────────────────────────────────────────
// Renvoie la notification interne d'une commande déjà encaissée.
//
// POURQUOI : la course entre le webhook Stripe et la page de confirmation a
// avalé les emails de CB-2026-0007. Le magasin n'a donc jamais reçu la
// référence fournisseur à commander. La cause est corrigée dans
// lib/encaissement.js, mais cette commande-là reste à rattraper.
//
// Ce script N'ENVOIE QUE L'EMAIL INTERNE, vers EMAIL_NOTIFICATION. Jamais
// vers le client : le prévenir deux fois, ou le prévenir douze jours après,
// est plus inquiétant qu'utile. S'il faut écrire à Grégory Petit, cela se
// fait à la main.
//
// Simulation : node prisma/renvoyer-notification.mjs CB-2026-0007
// Envoi      : node prisma/renvoyer-notification.mjs CB-2026-0007 --appliquer
// ─────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { envoyerNotificationInterne } from "../lib/emails.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const numero = process.argv.find((a) => /^CB-\d{4}-\d{4}$/.test(a));

async function main() {
  if (!numero) {
    console.error("Usage : node prisma/renvoyer-notification.mjs CB-2026-0007 [--appliquer]");
    process.exit(1);
  }
  if (!process.env.EMAIL_NOTIFICATION) {
    console.error("❌ EMAIL_NOTIFICATION n'est pas définie : rien à faire.");
    process.exit(1);
  }

  const commande = await prisma.commande.findUnique({
    where: { numero },
    include: { lignes: true },
  });
  if (!commande) {
    console.error(`❌ ${numero} introuvable.`);
    process.exit(1);
  }

  // Le filet : on ne notifie que ce qui a vraiment été encaissé.
  if (!commande.paye) {
    console.error(`❌ ${numero} n'est pas payée (statut ${commande.statut}) — on ne notifie pas.`);
    process.exit(1);
  }

  console.log(`\n${commande.numero} · ${commande.prenom} ${commande.nom} · ${commande.email}`);
  console.log(`${commande.totalTTC.toFixed(2)} € TTC · ${commande.lignes.length} ligne(s) · statut ${commande.statut}`);
  for (const l of commande.lignes) {
    console.log(`   · ${l.quantite} × ${l.designation}${l.referenceFournisseur ? `  [réf. ${l.referenceFournisseur}]` : "  [AUCUNE réf. fournisseur]"}`);
  }
  console.log(`\nDestinataire : ${process.env.EMAIL_NOTIFICATION}`);

  if (!APPLIQUER) {
    console.log("\nSimulation — aucun email envoyé. Ajouter --appliquer pour envoyer.\n");
    return;
  }

  await envoyerNotificationInterne(commande);
  console.log("\n✅ Notification interne renvoyée.\n");
}

main()
  .catch((e) => {
    console.error("Erreur :", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
