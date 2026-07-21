"use server";
import { prisma } from "@/lib/prisma";

// Liste des clients — regroupés par email de commande (avec ou sans compte créé).
// Le prénom/nom/société affichés viennent de la commande la plus récente pour cet email.
export async function getClients() {
  const commandes = await prisma.commande.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      email: true, nom: true, prenom: true, societe: true, telephone: true,
      totalTTC: true, fraisLivraison: true, fraisInstallation: true,
      statut: true, paye: true, createdAt: true,
    },
  });

  const comptes = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { email: true, createdAt: true },
  });
  const comptesParEmail = new Map(comptes.map((u) => [u.email.toLowerCase(), u]));

  // Regroupement par email (insensible à la casse)
  const groupes = new Map();
  for (const c of commandes) {
    const cle = c.email.toLowerCase();
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(c);
  }

  const clients = [...groupes.entries()].map(([cle, liste]) => {
    // liste est déjà triée du plus récent au plus ancien (ordre de la requête)
    const plusRecente = liste[0];
    const totalDepense = liste
      .filter((c) => c.paye)
      .reduce((s, c) => s + c.totalTTC + (c.fraisLivraison || 0) + (c.fraisInstallation || 0), 0);
    const compte = comptesParEmail.get(cle);

    return {
      email: plusRecente.email,
      prenom: plusRecente.prenom,
      nom: plusRecente.nom,
      societe: plusRecente.societe,
      telephone: plusRecente.telephone,
      nbCommandes: liste.length,
      totalDepense,
      dateDerniereCommande: plusRecente.createdAt,
      possedeCompte: !!compte,
      dateInscription: compte?.createdAt || null,
    };
  });

  clients.sort((a, b) => new Date(b.dateDerniereCommande) - new Date(a.dateDerniereCommande));
  return clients;
}

// Fiche complète d'un client — toutes ses commandes + stats, à partir de son email.
export async function getClientDetail(email) {
  const emailLower = email.toLowerCase();

  const commandes = await prisma.commande.findMany({
    where: { email: { equals: emailLower, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    include: { lignes: true },
  });
  if (commandes.length === 0) return null;

  const compte = await prisma.user.findFirst({
    where: { email: { equals: emailLower, mode: "insensitive" } },
    select: { nom: true, createdAt: true },
  });

  const commandesPayees = commandes.filter((c) => c.paye);
  const totalDepense = commandesPayees.reduce(
    (s, c) => s + c.totalTTC + (c.fraisLivraison || 0) + (c.fraisInstallation || 0), 0
  );
  const panierMoyen = commandesPayees.length ? totalDepense / commandesPayees.length : 0;
  const plusRecente = commandes[0];

  return {
    email: plusRecente.email,
    prenom: plusRecente.prenom,
    nom: plusRecente.nom,
    societe: plusRecente.societe,
    telephone: plusRecente.telephone,
    adresse: plusRecente.adresse,
    complement: plusRecente.complement,
    codePostal: plusRecente.codePostal,
    ville: plusRecente.ville,
    possedeCompte: !!compte,
    dateInscription: compte?.createdAt || null,
    nbCommandes: commandes.length,
    totalDepense,
    panierMoyen,
    commandes: commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      paye: c.paye,
      createdAt: c.createdAt,
      totalHT: c.totalHT,
      totalTVA: c.totalTVA,
      totalTTC: c.totalTTC,
      fraisLivraison: c.fraisLivraison,
      fraisInstallation: c.fraisInstallation,
      avecInstallation: c.avecInstallation,
      nbArticles: c.lignes.length,
    })),
  };
}