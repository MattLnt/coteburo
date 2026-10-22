// ─────────────────────────────────────────────────────────────────────────
// Inventaire des commandes, devis et comptes client — LECTURE SEULE.
//
// POURQUOI : avant de nettoyer les tests, il faut voir ce qu'il y a, et
// surtout distinguer la vraie commande (celle de Maxime) des essais. Ce
// script ne supprime RIEN et ne modifie RIEN : il ne fait que lister.
//
// Ce qu'il n'ose pas faire : décider ce qui est un test. Il propose un
// classement (voir la colonne « avis ») à partir de signaux objectifs —
// commande non payée, email jetable ou interne, total nul, adresse
// bidon — mais c'est Matiaz qui tranche fiche par fiche.
//
// Usage : node prisma/inventaire-commandes-tests.mjs
// ─────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const euro = (v) =>
  `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const date = (d) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

// Signaux qui trahissent un essai. Aucun n'est une preuve à lui seul.
const MOTS_TEST = /test|essai|toto|tata|azerty|qwerty|aaa|bbb|xxx|zzz|demo|fake|truc|machin|coucou|asdf|jean dupont|john doe/i;
const MAILS_INTERNES = /@coteburo\.(fr|com)$/i;

function avis(c) {
  const raisons = [];
  const champs = [c.email, c.prenom, c.nom, c.societe, c.adresse, c.ville].filter(Boolean).join(" ");
  if (MOTS_TEST.test(champs)) raisons.push("libellé de test");
  if (MAILS_INTERNES.test(c.email)) raisons.push("email interne");
  if (!c.paye) raisons.push("non payée");
  if (!c.stripePaymentId) raisons.push("aucun paiement Stripe");
  if (c.totalTTC === 0) raisons.push("total nul");
  if ((c.lignes?.length ?? 0) === 0) raisons.push("sans ligne");
  return raisons;
}

async function main() {
  const commandes = await prisma.commande.findMany({
    orderBy: { createdAt: "asc" },
    include: { lignes: { select: { designation: true, quantite: true } }, devis: { select: { numero: true } } },
  });

  console.log(`\n══ COMMANDES (${commandes.length}) ══\n`);
  for (const c of commandes) {
    const r = avis(c);
    const etiquette = r.length === 0 ? "✅ À GARDER a priori" : `⚠ suspect : ${r.join(", ")}`;
    console.log(`${c.numero}  ${date(c.createdAt)}`);
    console.log(`   ${c.prenom} ${c.nom}${c.societe ? ` · ${c.societe}` : ""} · ${c.email}${c.telephone ? ` · ${c.telephone}` : ""}`);
    console.log(`   ${c.adresse}${c.complement ? `, ${c.complement}` : ""}, ${c.codePostal} ${c.ville}`);
    console.log(`   statut=${c.statut}  payé=${c.paye ? "oui" : "NON"}  ${euro(c.totalTTC)} TTC  ${c.lignes.length} ligne(s)`);
    console.log(`   stripePaymentId=${c.stripePaymentId || "—"}  userId=${c.userId || "—"}  devis=${c.devis?.numero || "—"}`);
    for (const l of c.lignes) console.log(`      · ${l.quantite} × ${l.designation}`);
    console.log(`   ${etiquette}\n`);
  }

  const comptes = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, nom: true, createdAt: true },
  });

  console.log(`\n══ COMPTES CLIENT (${comptes.length}) ══\n`);
  for (const u of comptes) {
    const nb = commandes.filter((c) => c.userId === u.id).length;
    const nbMail = commandes.filter((c) => c.email.toLowerCase() === u.email.toLowerCase()).length;
    const suspect = MOTS_TEST.test(`${u.email} ${u.nom || ""}`) || MAILS_INTERNES.test(u.email);
    console.log(`${u.email}${u.nom ? ` · ${u.nom}` : ""}  créé le ${date(u.createdAt)}`);
    console.log(`   id=${u.id}  commandes liées=${nb}  (même email=${nbMail})  ${suspect ? "⚠ libellé de test" : ""}`);
  }

  const admins = await prisma.user.count({ where: { role: { not: "CLIENT" } } });
  console.log(`\n(+ ${admins} compte(s) non-CLIENT, hors périmètre du nettoyage)`);

  const devis = await prisma.devis.findMany({
    orderBy: { createdAt: "asc" },
    select: { numero: true, statut: true, email: true, prenom: true, nom: true, totalTTC: true, createdAt: true, commandeId: true },
  });

  console.log(`\n══ DEVIS (${devis.length}) ══\n`);
  for (const d of devis) {
    const suspect = MOTS_TEST.test(`${d.email} ${d.prenom} ${d.nom}`) || MAILS_INTERNES.test(d.email);
    console.log(`${d.numero}  ${date(d.createdAt)}  statut=${d.statut}  ${d.prenom} ${d.nom} · ${d.email}  ${euro(d.totalTTC)}  commande=${d.commandeId || "—"}  ${suspect ? "⚠ libellé de test" : ""}`);
  }

  console.log("\nRien n'a été modifié : ce script est en lecture seule.\n");
}

main()
  .catch((e) => {
    console.error("Erreur :", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
