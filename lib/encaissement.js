import { prisma } from "./prisma.js";
import { envoyerConfirmationClient, envoyerNotificationInterne } from "./emails.js";

// ─────────────────────────────────────────────────────────────────────────
// Le passage d'une commande à « payée », et les emails qui vont avec.
//
// POURQUOI UN SEUL ENDROIT : deux chemins encaissent la même commande — le
// webhook Stripe et la page de confirmation que le navigateur appelle au
// retour du paiement. Ils arrivaient en course, et le webhook gagnait
// presque toujours : il marquait la commande payée, puis la page de
// confirmation voyait `paye` déjà vrai et sautait les emails. Résultat, la
// première vraie commande (CB-2026-0007) n'a prévenu personne.
//
// LE VERROU : l'`updateMany` conditionnel sur `paye: false`. La base ne
// laisse qu'un seul appelant basculer le drapeau ; celui-là, et lui seul,
// envoie les emails. L'autre repart les mains vides. Pas de champ en plus,
// donc pas de migration : la transition false → true EST le verrou.
//
// Conséquence voulue : le webhook envoie désormais les emails lui aussi. Un
// client qui ferme l'onglet juste après avoir payé est prévenu quand même,
// et le magasin reçoit sa notification.
// ─────────────────────────────────────────────────────────────────────────

export async function marquerPayeeEtNotifier({ commandeId, stripePaymentId, origine }) {
  // Le verrou. `count` vaut 1 pour celui qui a fait basculer le drapeau,
  // 0 pour tous les autres — y compris une page de confirmation rechargée.
  const { count } = await prisma.commande.updateMany({
    where: { id: commandeId, paye: false },
    data: { paye: true, statut: "payee", stripePaymentId },
  });

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    include: { lignes: true },
  });
  if (!commande) return { commande: null, dejaPaye: false, emailsEnvoyes: false };

  const nousAvonsGagne = count === 1;

  if (nousAvonsGagne) {
    // Si la commande vient d'un devis, il passe en « accepté » maintenant —
    // pas au lancement du paiement, sinon un abandon laisserait un devis
    // accepté sans encaissement.
    await prisma.devis.updateMany({
      where: { commandeId: commande.id },
      data: { statut: "accepte", dateReponse: new Date() },
    });

    // Les deux emails sont indépendants : que la confirmation client échoue
    // ne doit pas priver le magasin de sa notification, et réciproquement.
    // `allSettled`, donc, et pas `all`.
    const resultats = await Promise.allSettled([
      envoyerConfirmationClient(commande),
      envoyerNotificationInterne(commande),
    ]);
    const noms = ["confirmation client", "notification interne"];
    resultats.forEach((r, i) => {
      if (r.status === "fulfilled") console.log(`📧 ${noms[i]} envoyée pour ${commande.numero} (${origine})`);
      // Un email raté ne doit pas faire échouer l'encaissement : le paiement
      // est encaissé, la commande est en base. Mais il doit CRIER dans les
      // logs, parce que personne ne le verra autrement.
      else console.error(`❌ ÉCHEC ${noms[i]} pour ${commande.numero} (${origine}) : ${r.reason?.message || r.reason}`);
    });
  } else {
    console.log(`↩ ${commande.numero} était déjà payée — emails non renvoyés (${origine})`);
  }

  return { commande, dejaPaye: !nousAvonsGagne, emailsEnvoyes: nousAvonsGagne };
}
