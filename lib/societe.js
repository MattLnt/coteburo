// Identité légale et coordonnées de l'entreprise.
// Source unique : utilisée par les PDF, les emails et le pied de page.
// Les valeurs proviennent des documents officiels fournis par Côté BURO.

export const SOCIETE = {
  nom: "Côté BURO",
  batiment: "Techindus D",
  rue: "645 rue Mayor de Montricher",
  codePostal: "13290",
  ville: "Aix-en-Provence",
  pays: "France",

  siteWeb: "www.coteburo.fr",
  email: "contact@coteburo.fr",

  // Deux commerciaux joignables — figurent sur les documents d'origine
  contacts: [
    { nom: "Christian", tel: "06 20 391 390" },
    { nom: "Maxime", tel: "06 35 584 378" },
  ],

  siret: "45017839700011",
  ape: "518H",
  capital: "15 000 €",
  tvaIntracom: "FR32450178397",

  garantie: "Garantie 7 ans sur le mobilier",
};

// Adresse sur une ligne — pour les emails et les métadonnées.
export const adresseUneLigne = () =>
  `${SOCIETE.batiment}, ${SOCIETE.rue}, ${SOCIETE.codePostal} ${SOCIETE.ville}`;

// Mention légale de pied de document, obligatoire sur une facture.
export const mentionLegale = () =>
  `${SOCIETE.nom} — SARL au capital de ${SOCIETE.capital} · SIRET ${SOCIETE.siret} · APE ${SOCIETE.ape} · TVA intracom. ${SOCIETE.tvaIntracom}`;

// Pénalités de retard — mention obligatoire entre professionnels
// (art. L441-10 du code de commerce).
export const MENTION_RETARD =
  "En cas de retard de paiement, une pénalité égale à 3 fois le taux d'intérêt légal sera exigible (décret 2009-138 du 9 février 2009), ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €.";