// Correspondances du tarif OfficePro vers le catalogue Côté BURO.
//
// Écrit à la main, et fait pour être relu : le tarif emploie 46 libellés en
// colonne « nom du produit » pour les 24 gammes retenues, et sa découpe en
// espaces n'est pas celle du site.
//
// Ce fichier ne contient que des données. prisma/officepro-fiches.mjs s'en
// sert pour proposer les fiches, prisma/officepro-import.mjs les écrira.

// Espace → emplacement au catalogue.
//
// L'espace se rattache à la GAMME, pas à la ligne du tarif : une gamme se
// vend pour un usage, quelle que soit la page où le fournisseur l'a rangée.
// Verano est de l'outdoor et Loops de la cafétéria, même quand le tarif les
// liste sous « espace lounge ».
//
// Les sièges de magasin vont en Sièges › Accueil et non en Mobilier
// d'accueil : ce sont des sièges de caisse et de vente, pas du mobilier de
// hall.
export const ESPACES = {
  "ACCUEIL": { categorie: "sieges", sousCategorie: "accueil" },
  "DIRECTION ET ERGO": { categorie: "sieges", sousCategorie: "direction" },
  "PROJETS D'AMÉNAGEMENT": { categorie: "sieges", sousCategorie: "collaboratif" },
  "PAUSE CAFÉTÉRIA": { categorie: "sieges", sousCategorie: "cafeteria" },
  "ATELIERS ET MÉTIERS": { categorie: "sieges", sousCategorie: "ergo-technique" },
  "RÉUNION": { categorie: "sieges", sousCategorie: "reunion-formation" },
  "MAGASINS": { categorie: "sieges", sousCategorie: "accueil" },
  "OUTDOOR": { categorie: "sieges", sousCategorie: "outdoor" },
};

// Certains types ne sont pas des sièges, quel que soit l'espace du tarif : une
// table basse Square reste une table. L'emplacement par type l'emporte donc
// sur celui de l'espace.
// `parEspace` garde l'usage quand la catégorie change : une table de jardin
// Verano reste de l'outdoor, pas de la cafétéria.
export const EMPLACEMENTS_PAR_TYPE = {
  "TABLE BASSE": { categorie: "tables", sousCategorie: "tables-basses", parEspace: { OUTDOOR: { categorie: "tables", sousCategorie: "outdoor" } } },
  "TABLE": { categorie: "tables", sousCategorie: "tables-polyvalentes", parEspace: { OUTDOOR: { categorie: "tables", sousCategorie: "outdoor" } } },
  "MANGE DEBOUT": { categorie: "tables", sousCategorie: "cafeteria", parEspace: { OUTDOOR: { categorie: "tables", sousCategorie: "outdoor" } } },
  "COUSSIN": { categorie: "accessoires", sousCategorie: "coussins-d-assises" },
  "COUSSINS": { categorie: "accessoires", sousCategorie: "coussins-d-assises" },
};

// Gamme du catalogue → libellés du tarif qui la composent.
//
// `surDevis` : aménagements sur mesure, qui ne se vendent pas en ligne.
// `espace` force l'emplacement quand la section du tarif ne convient pas.
export const GAMMES = [
  // ── ACCUEIL ──
  { nom: "Arco", espace: "ACCUEIL", libelles: ["ARCO CHAUFFEUSE", "ARCO CHIC", "ARCO COUSSIN"] },
  { nom: "Arco Banquette", espace: "ACCUEIL", libelles: ["ARCO BANQUETTE"] },
  { nom: "Arco Lounge", espace: "ACCUEIL", libelles: ["ARCO LOUNGE", "ARCO POUF"] },
  { nom: "Square", espace: "ACCUEIL", libelles: ["SQUARE"] },
  { nom: "Giro", espace: "ACCUEIL", libelles: ["GIRO"] },
  { nom: "Galet", espace: "ACCUEIL", libelles: ["GALET"] },

  // ── DIRECTION ET ERGO ──
  { nom: "Ergostar Ultra", espace: "DIRECTION ET ERGO", libelles: ["ERGOSTAR ULTRA", "ERGOSTAR ULTRA VELVET"] },
  { nom: "Heavy", espace: "DIRECTION ET ERGO", libelles: ["HEAVY"] },

  // ── PROJETS D'AMÉNAGEMENT — sur mesure, donc sur devis ──
  { nom: "Tecsy Concept", espace: "PROJETS D'AMÉNAGEMENT", libelles: ["TECSY CONCEPT"], surDevis: true },
  { nom: "Proseat", espace: "PROJETS D'AMÉNAGEMENT", libelles: ["PROSEAT V2"], surDevis: true },
  { nom: "Lando", espace: "PROJETS D'AMÉNAGEMENT", libelles: ["LANDO"], surDevis: true },

  // ── PAUSE CAFÉTÉRIA ──
  { nom: "Loops", espace: "PAUSE CAFÉTÉRIA", libelles: ["LOOPS", "LOOPS TABOURET"] },

  // ── ATELIERS ET MÉTIERS ──
  { nom: "Budget", espace: "ATELIERS ET MÉTIERS", libelles: ["BUDGET"] },
  { nom: "Steno", espace: "ATELIERS ET MÉTIERS", libelles: ["STENO"] },

  // ── RÉUNION ──
  { nom: "Coigny", espace: "RÉUNION", libelles: ["COIGNY", "COIGNY ECO", "COIGNY MAX", "COIGNY-COLOR", "COIGNY-MILI"] },
  { nom: "Khong", espace: "RÉUNION", libelles: ["KHONG"] },
  // « Tecseat Learning » n'existe pas au tarif : ce sont les assises de
  // formation, réparties sur quatre libellés. La poutre à composer est rangée
  // en accueil par le tarif, ce qui est cohérent avec son usage.
  { nom: "Tecseat Learning", espace: "RÉUNION", libelles: ["TECSEAT", "TECSEAT / TECSUP", "TECSEAT ETUDIANT", "TECSEAT MEETING", "TECSEAT POUTRE A COMPOSER"] },

  // ── MAGASINS — sièges de caisse et de vente ──
  { nom: "Scott", espace: "MAGASINS", libelles: ["SCOTT", "SCOTTY"] },
  { nom: "Cheyenne", espace: "MAGASINS", libelles: ["CHEYENNE"] },
  { nom: "Bristol", espace: "MAGASINS", libelles: ["BRISTOL"] },
  { nom: "Tecsy", espace: "MAGASINS", libelles: ["TECSY ALTO", "TECSY CHIC", "TECSY PLATINIUM", "TECSY WHITE"] },
  { nom: "Amy", espace: "MAGASINS", libelles: ["AMY"] },
  { nom: "Liberty", espace: "MAGASINS", libelles: ["LIBERTY"] },

  // ── OUTDOOR ──
  { nom: "Beez", espace: "OUTDOOR", libelles: ["BEEZ"] },
  { nom: "Verano", espace: "OUTDOOR", libelles: ["VERANO - ESPACE LOUNGE", "VERANO - RESTAURATION CLASSIQUE", "VERANO - RESTAURATION HAUTE", "VERANO BANC", "VERANO COUSSIN", "VERANO POUF"] },
];

// Type de produit reconnu en tête de désignation. L'ordre compte : le premier
// qui correspond l'emporte, « CANAPÉ 2 PLACES » avant « CANAPÉ ».
export const TYPES = [
  "PAIRE D'ACCOUDOIRS", "LOT DE 4 ATTACHES", "KIT TABLETTE ÉCRITOIRE", "KIT TABLETTE",
  "CANAPÉ 2 PLACES", "CANAPÉ", "BANQUETTE", "CHAUFFEUSE", "FAUTEUIL LOUNGE", "FAUTEUIL",
  "CHAISE HAUTE", "CHAISE", "TABOURET HAUT", "TABOURET BAS", "TABOURET",
  "POUF", "COUSSINS", "COUSSIN", "TABLE BASSE", "TABLE", "POUTRE", "TABLETTE",
  // Forme accentuée seulement : la comparaison ignore les accents, mais c'est
  // cette écriture-là qui se retrouve dans le nom de la fiche.
  "SIÈGE VISITEUR", "SIÈGE", "BANC", "ASSISE", "COQUE",
  "MANGE DEBOUT", "PLACET", "SUPPORT DE POT", "OPTION REPOSE JAMBE",
  "REPOSE-PIEDS", "REPOSE PIEDS", "APPUI-TÊTE", "ACCOUDOIRS", "ACCOUDOIR",
  "HOUSSE", "CHARIOT", "VÉRIN", "ÉTOILE", "ROULETTES", "PATINS", "KIT",
];

// Qualificatifs qui distinguent des variantes d'un même produit, et non des
// produits différents : ils deviennent des axes de déclinaison.
//
// Sur la chauffeuse Arco, les cinq piétements sont cinq prix d'un même siège —
// en faire cinq fiches noierait le client. Le coloris, lui, vient déjà de la
// colonne « coloris dominant ».
export const AXES = [
  { id: "pietement", nom: "Piétement", motifs: [/PIEDS? ([A-ZÉÈÀÂÎÔÛ]+(?: [A-ZÉÈÀÂÎÔÛ]+)*)/i, /PIED ([A-ZÉÈÀÂÎÔÛ]+(?: [A-ZÉÈÀÂÎÔÛ]+)*)/i] },
  { id: "structure", nom: "Structure", motifs: [/STRUCTURE ([A-ZÉÈÀÂÎÔÛ]+(?: [A-ZÉÈÀÂÎÔÛ]+)*)/i] },
  { id: "assise", nom: "Assise", motifs: [/ASSISE ([A-ZÉÈÀÂÎÔÛ]+)/i] },
  { id: "revetement", nom: "Revêtement", motifs: [/\b(TISSU NON FEU|VELOURS COTELE|VELOURS CÔTELÉ|BOUCLETTE|CUIR VERITABLE|CUIR VÉRITABLE|POLYPRO|PU|M1)\b/i] },
];
