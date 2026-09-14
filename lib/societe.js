// Identité légale et coordonnées de l'entreprise.
// Source unique : utilisée par les PDF, les emails et le pied de page.
//
// Les valeurs proviennent du pack juridique daté du 1er septembre 2026.
// Toute correction se fait ici, jamais dans les documents qui s'en
// servent — une mention légale fausse sur une facture engage la société.

export const SOCIETE = {
  nom: "Côté BURO",
  formeJuridique: "Société par actions simplifiée",
  formeCourte: "SAS",

  batiment: "Techn'Indus — Pôle d'Activité d'Aix-en-Provence",
  rue: "645 rue Mayor de Montricher",
  codePostal: "13290",
  ville: "Aix-en-Provence",
  pays: "France",

  siteWeb: "www.coteburo.fr",
  email: "contact@coteburo.fr",
  // Numéro principal, celui qui figure sur les documents juridiques.
  telephone: "06 35 58 43 78",

  // Deux commerciaux joignables — figurent sur les documents d'origine
  contacts: [
    { nom: "Christian", tel: "06 20 39 13 90" },
    { nom: "Maxime", tel: "06 35 58 43 78" },
  ],

  // Le président est le directeur de la publication du site.
  dirigeant: "Christian Pages",

  rcs: "Aix-en-Provence 450 178 397",
  siret: "450 178 397 00011",
  ape: "518H",
  capital: "15 000 €",
  tvaIntracom: "FR32 450178397",

  garantie: "Garantie 7 ans sur le mobilier",
};

// Adresse sur une ligne — pour les emails et les métadonnées.
export const adresseUneLigne = () =>
  `${SOCIETE.batiment}, ${SOCIETE.rue}, ${SOCIETE.codePostal} ${SOCIETE.ville}`;

// Mention légale de pied de document, obligatoire sur une facture.
// Le RCS et la forme juridique en font partie : leur absence est une
// irrégularité formelle.
export const mentionLegale = () =>
  `${SOCIETE.nom} — ${SOCIETE.formeJuridique} au capital de ${SOCIETE.capital} · RCS ${SOCIETE.rcs} · SIRET ${SOCIETE.siret} · APE ${SOCIETE.ape} · TVA intracom. ${SOCIETE.tvaIntracom}`;

// Pénalités de retard — mention obligatoire entre professionnels
// (art. L441-10 du code de commerce).
export const MENTION_RETARD =
  "En cas de retard de paiement, une pénalité égale à 3 fois le taux d'intérêt légal sera exigible (décret 2009-138 du 9 février 2009), ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €.";

// Éco-participation — mention obligatoire sur les documents de vente de
// mobilier professionnel (art. L541-10 du code de l'environnement).
export const MENTION_ECO =
  "L'éco-participation est une contribution obligatoire au recyclage du mobilier professionnel. Elle est reversée intégralement à l'éco-organisme agréé et ne fait l'objet d'aucune marge.";