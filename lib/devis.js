import { prisma } from "@/lib/prisma";

// Délai après lequel un paiement lancé mais jamais abouti est considéré
// comme abandonné. Une heure laisse largement le temps de payer.
const DELAI_ABANDON_MS = 60 * 60 * 1000;

// Fait le ménage des devis : ceux dont la validité est dépassée passent en
// « expiré », et ceux dont le paiement traîne repassent en « envoyé ».
//
// Appelé au chargement des pages qui affichent des devis plutôt que par une
// tâche planifiée : pas d'infrastructure à configurer, et le résultat est
// toujours à jour au moment où quelqu'un regarde.
export async function rafraichirStatutsDevis() {
  const maintenant = new Date();

  // 1. Expiration — seuls les devis envoyés peuvent expirer. Un devis accepté
  // ou refusé garde son statut, la date de validité n'a plus de sens.
  const expiration = prisma.devis.updateMany({
    where: {
      statut: "envoye",
      dateValidite: { not: null, lt: maintenant },
    },
    data: { statut: "expire" },
  });

  // 2. Paiements abandonnés — on relève les devis concernés avant de les
  // remettre en « envoyé », pour pouvoir supprimer leur commande impayée.
  const seuil = new Date(maintenant.getTime() - DELAI_ABANDON_MS);
  const abandonnes = await prisma.devis.findMany({
    where: {
      statut: "paiement_en_cours",
      updatedAt: { lt: seuil },
    },
    select: { id: true, commandeId: true },
  });

  await expiration;

  if (abandonnes.length > 0) {
    const commandeIds = abandonnes.map((d) => d.commandeId).filter(Boolean);

    await prisma.devis.updateMany({
      where: { id: { in: abandonnes.map((d) => d.id) } },
      data: { statut: "envoye", commandeId: null, dateReponse: null },
    });

    // La commande n'est supprimée que si elle n'a pas été payée entre-temps —
    // un paiement confirmé tardivement ne doit jamais faire perdre la vente.
    if (commandeIds.length > 0) {
      await prisma.commande.deleteMany({
        where: { id: { in: commandeIds }, paye: false },
      });
    }
  }
}