// Correspondances du tarif OfficePro vers le catalogue Côté BURO.
//
// Écrit à la main, et fait pour être relu : le tarif emploie 46 libellés en
// colonne « nom du produit » pour les 24 gammes retenues, et sa découpe en
// espaces n'est pas celle du site.
//
// Ce fichier ne contient que des données. prisma/officepro-fiches.mjs s'en
// sert pour proposer les fiches, prisma/officepro-import.mjs les écrira.

// Espace du tarif → emplacement au catalogue.
//
// Les sièges de magasin vont en Sièges › Accueil et non en Mobilier
// d'accueil : ce sont des sièges de caisse et de vente, pas du mobilier de
// hall.
export const ESPACES = {
  "ESPACE ACCUEIL": { categorie: "sieges", sousCategorie: "accueil" },
  "FAUTEUILS DE DIRECTION & ERGO+": { categorie: "sieges", sousCategorie: "direction" },
  "FAUTEUILS - PROJETS D'AMENAGEMENT": { categorie: "sieges", sousCategorie: "collaboratif" },
  "ESPACE RÉUNION": { categorie: "sieges", sousCategorie: "reunion-formation" },
  "ESPACE PAUSE & CAFÉTÉRIA": { categorie: "sieges", sousCategorie: "cafeteria" },
  "ESPACE LOUNGE": { categorie: "sieges", sousCategorie: "convivialite" },
  "ESPACE OUTDOOR": { categorie: "sieges", sousCategorie: "outdoor" },
  "ESPACE ATELIERS & METIERS": { categorie: "sieges", sousCategorie: "ergo-technique" },
};

// Certains types ne sont pas des sièges, quel que soit l'espace du tarif : une
// table basse Square reste une table. L'emplacement par type l'emporte donc
// sur celui de l'espace.
export const EMPLACEMENTS_PAR_TYPE = {
  "TABLE BASSE": { categorie: "tables", sousCategorie: "tables-basses" },
  "MANGE DEBOUT": { categorie: "tables", sousCategorie: "cafeteria" },
  "COUSSIN": { categorie: "accessoires", sousCategorie: "coussins-d-assises" },
  "COUSSINS": { categorie: "accessoires", sousCategorie: "coussins-d-assises" },
};

// Gamme du catalogue → libellés du tarif qui la composent.
//
// `surDevis` : aménagements sur mesure, qui ne se vendent pas en ligne.
// `espace` force l'emplacement quand la section du tarif ne convient pas.
export const GAMMES = [
  // ── ACCUEIL ──
  { nom: "Arco", libelles: ["ARCO CHAUFFEUSE", "ARCO CHIC", "ARCO COUSSIN"] },
  { nom: "Arco Banquette", libelles: ["ARCO BANQUETTE"] },
  { nom: "Arco Lounge", libelles: ["ARCO LOUNGE", "ARCO POUF"] },
  { nom: "Square", libelles: ["SQUARE"] },
  { nom: "Giro", libelles: ["GIRO"] },
  { nom: "Galet", libelles: ["GALET"] },

  // ── DIRECTION ET ERGO ──
  { nom: "Ergostar Ultra", libelles: ["ERGOSTAR ULTRA", "ERGOSTAR ULTRA VELVET"] },
  { nom: "Heavy", libelles: ["HEAVY"] },

  // ── PROJETS D'AMÉNAGEMENT — sur mesure, donc sur devis ──
  { nom: "Tecsy Concept", libelles: ["TECSY CONCEPT"], surDevis: true },
  { nom: "Proseat", libelles: ["PROSEAT V2"], surDevis: true },
  { nom: "Lando", libelles: ["LANDO"], surDevis: true },

  // ── PAUSE CAFÉTÉRIA ──
  { nom: "Loops", libelles: ["LOOPS", "LOOPS TABOURET"] },

  // ── ATELIERS ET MÉTIERS ──
  { nom: "Budget", libelles: ["BUDGET"] },
  { nom: "Steno", libelles: ["STENO"] },

  // ── RÉUNION ──
  { nom: "Coigny", libelles: ["COIGNY", "COIGNY ECO", "COIGNY MAX", "COIGNY-COLOR", "COIGNY-MILI"] },
  { nom: "Khong", libelles: ["KHONG"] },
  // « Tecseat Learning » n'existe pas au tarif : ce sont les assises de
  // formation, réparties sur quatre libellés. La poutre à composer est rangée
  // en accueil par le tarif, ce qui est cohérent avec son usage.
  { nom: "Tecseat Learning", libelles: ["TECSEAT", "TECSEAT / TECSUP", "TECSEAT ETUDIANT", "TECSEAT MEETING", "TECSEAT POUTRE A COMPOSER"] },

  // ── MAGASINS — sièges de caisse et de vente ──
  { nom: "Scott", libelles: ["SCOTT", "SCOTTY"] },
  { nom: "Cheyenne", libelles: ["CHEYENNE"] },
  { nom: "Bristol", libelles: ["BRISTOL"] },
  { nom: "Tecsy", libelles: ["TECSY ALTO", "TECSY CHIC", "TECSY PLATINIUM", "TECSY WHITE"] },
  { nom: "Amy", libelles: ["AMY"] },
  { nom: "Liberty", libelles: ["LIBERTY"] },

  // ── OUTDOOR ──
  { nom: "Beez", libelles: ["BEEZ"] },
  { nom: "Verano", libelles: ["VERANO - ESPACE LOUNGE", "VERANO - RESTAURATION CLASSIQUE", "VERANO - RESTAURATION HAUTE", "VERANO BANC", "VERANO COUSSIN", "VERANO POUF"] },
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
