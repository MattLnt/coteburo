// ─────────────────────────────────────────────────────────────────────────
// Nettoyage des commandes de test et des comptes client de test.
//
// POURQUOI : six commandes d'essai (CB-2026-0001 → 0006) traînent devant la
// première vraie commande, CB-2026-0007 (Grégory Petit, 858,60 € TTC). Elles
// faussent le chiffre d'affaires de l'admin et noient la seule commande qui
// compte.
//
// Ce que le script N'OSE PAS faire :
//   · il ne devine rien : les cibles sont écrites en dur ci-dessous, une par
//     une, et il refuse d'écrire si l'une d'elles ne correspond pas EXACTEMENT
//     à ce qu'on attend (email, total, statut) ;
//   · il ne touche jamais à CB-2026-0007, ni au compte de Grégory Petit, ni au
//     compte ADMIN (celui qui sert à se connecter à l'admin) ;
//   · il ne supprime rien sans --appliquer.
//
// ⚠ Les clés étrangères manquent sur Favori, ResetPasswordToken et
// Commande.userId : supprimer un compte n'emporte rien automatiquement. Le
// script nettoie donc ces restes lui-même.
//
// Simulation : node prisma/nettoyer-commandes-tests.mjs
// Application : node prisma/nettoyer-commandes-tests.mjs --appliquer
// ─────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

// ── Les cibles, avec leur empreinte attendue ───────────────────────────
// Le filet : si une commande ne ressemble plus à ça, on ne supprime pas.
const COMMANDES_TESTS = [
  { numero: "CB-2026-0001", email: "admin@coteburo.fr", statut: "annulee", totalTTC: 0.77 },
  { numero: "CB-2026-0002", email: "admin@coteburo.fr", statut: "annulee", totalTTC: 0.77 },
  { numero: "CB-2026-0003", email: "admin@coteburo.fr", statut: "annulee", totalTTC: 0.77 },
  { numero: "CB-2026-0004", email: "admin@coteburo.fr", statut: "annulee", totalTTC: 562.5 },
  { numero: "CB-2026-0005", email: "admin@coteburo.fr", statut: "annulee", totalTTC: 1125 },
  { numero: "CB-2026-0006", email: "admin@coteburo.fr", statut: "annulee", totalTTC: 463.5 },
];

// Comptes CLIENT à supprimer. Vide par défaut : à Matiaz de décider si son
// propre compte client de test (lenivet.matiaz@gmail.com, 0 commande) part.
const COMPTES_TESTS = [
  // { email: "lenivet.matiaz@gmail.com", attenduCommandes: 0 },
];

// Ce qui ne doit JAMAIS disparaître, quoi qu'il arrive.
const INTOUCHABLES = {
  commandes: ["CB-2026-0007"],
  emails: ["gregory-petit@hotmail.com"],
};

const euro = (v) => `${Number(v || 0).toFixed(2)} €`;

async function main() {
  console.log(APPLIQUER ? "\n▶ MODE APPLICATION — les suppressions seront écrites.\n" : "\n▶ SIMULATION — rien ne sera supprimé. Ajouter --appliquer pour écrire.\n");

  // ── Vérification du filet, AVANT toute écriture ────────────────────
  const refus = [];
  const aSupprimer = [];

  for (const cible of COMMANDES_TESTS) {
    if (INTOUCHABLES.commandes.includes(cible.numero)) {
      refus.push(`${cible.numero} est dans la liste des intouchables`);
      continue;
    }
    const c = await prisma.commande.findUnique({
      where: { numero: cible.numero },
      include: { lignes: { select: { id: true } }, devis: { select: { numero: true } } },
    });
    if (!c) { console.log(`· ${cible.numero} : déjà absente, rien à faire.`); continue; }
    if (c.email !== cible.email) refus.push(`${cible.numero} : email « ${c.email} » au lieu de « ${cible.email} »`);
    if (c.statut !== cible.statut) refus.push(`${cible.numero} : statut « ${c.statut} » au lieu de « ${cible.statut} »`);
    if (Math.abs(c.totalTTC - cible.totalTTC) > 0.01) refus.push(`${cible.numero} : total ${euro(c.totalTTC)} au lieu de ${euro(cible.totalTTC)}`);
    if (c.devis) refus.push(`${cible.numero} : rattachée au devis ${c.devis.numero} — à traiter à la main`);
    if (INTOUCHABLES.emails.includes(c.email.toLowerCase())) refus.push(`${cible.numero} : email d'un client réel`);
    aSupprimer.push(c);
  }

  const comptes = [];
  for (const cible of COMPTES_TESTS) {
    if (INTOUCHABLES.emails.includes(cible.email.toLowerCase())) { refus.push(`${cible.email} est intouchable`); continue; }
    const u = await prisma.user.findUnique({ where: { email: cible.email } });
    if (!u) { console.log(`· ${cible.email} : déjà absent, rien à faire.`); continue; }
    if (u.role !== "CLIENT") refus.push(`${cible.email} : rôle « ${u.role} » — ce n'est pas un compte client, on ne touche pas`);
    const nb = await prisma.commande.count({ where: { OR: [{ userId: u.id }, { email: u.email }] } });
    if (nb !== cible.attenduCommandes) refus.push(`${cible.email} : ${nb} commande(s) rattachée(s), ${cible.attenduCommandes} attendue(s)`);
    comptes.push(u);
  }

  if (refus.length > 0) {
    console.error("\n❌ REFUS — la base ne correspond pas à ce qui était prévu :\n");
    for (const r of refus) console.error(`   · ${r}`);
    console.error("\nRien n'a été supprimé. Mettre les attentes à jour, ou trancher à la main.\n");
    process.exit(1);
  }

  // ── Ce qui va partir ───────────────────────────────────────────────
  console.log(`Commandes à supprimer (${aSupprimer.length}) :`);
  for (const c of aSupprimer) {
    console.log(`   · ${c.numero}  ${c.prenom} ${c.nom} · ${c.email}  ${euro(c.totalTTC)}  statut=${c.statut}  ${c.lignes.length} ligne(s) (cascade)`);
  }
  console.log(`\nComptes client à supprimer (${comptes.length}) :`);
  for (const u of comptes) {
    const fav = await prisma.favori.count({ where: { userId: u.id } });
    const tok = await prisma.resetPasswordToken.count({ where: { userId: u.id } });
    console.log(`   · ${u.email}${u.nom ? ` · ${u.nom}` : ""}  + ${fav} favori(s) + ${tok} jeton(s) de reset`);
  }

  const restantes = await prisma.commande.count();
  console.log(`\nCommandes en base aujourd'hui : ${restantes} → après nettoyage : ${restantes - aSupprimer.length}`);
  console.log(`Conservées : ${INTOUCHABLES.commandes.join(", ")}`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Rien n'a été modifié.\n");
    return;
  }

  // ── Écriture, en une transaction ───────────────────────────────────
  await prisma.$transaction(async (tx) => {
    for (const c of aSupprimer) {
      // Les lignes partent en cascade (onDelete: Cascade), mais les options
      // se rattachent entre elles : on vide les lignes d'abord, sans ordre
      // imposé, Prisma gère le SetNull.
      await tx.ligneCommande.deleteMany({ where: { commandeId: c.id } });
      await tx.commande.delete({ where: { id: c.id } });
      console.log(`   ✔ ${c.numero} supprimée`);
    }
    for (const u of comptes) {
      await tx.favori.deleteMany({ where: { userId: u.id } });
      await tx.resetPasswordToken.deleteMany({ where: { userId: u.id } });
      await tx.user.delete({ where: { id: u.id } });
      console.log(`   ✔ ${u.email} supprimé`);
    }
  });

  // genererNumero() repart désormais du plus grand numéro attribué, et non
  // du nombre de commandes : supprimer ne rejoue plus les numéros libérés.
  // L'avertissement qui vivait ici n'a donc plus lieu d'être.
  console.log("\n✅ Nettoyage appliqué.\n");
}

main()
  .catch((e) => {
    console.error("Erreur :", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
