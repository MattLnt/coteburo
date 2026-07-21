// Arborescence des catégories Côté BURO (modèle Burostock)
// Source unique de vérité : utilisée par le catalogue, le méga-menu, les filtres et l'admin.

export const CATEGORIES = [
  {
    slug: "accueil",
    label: "Mobilier d'accueil",
    sousCategories: [
      { slug: "banques-accueil", label: "Banques d'accueil" },
      { slug: "fauteuils-canapes", label: "Fauteuils & Canapés" },
      { slug: "chaises-salle-attente", label: "Chaises salle d'attente" },
      { slug: "tables-basses-accueil", label: "Tables basses" },
      { slug: "tables-hautes-accueil", label: "Tables hautes" },
    ],
  },
  {
    slug: "bureaux",
    label: "Bureaux",
    sousCategories: [
      { slug: "bureaux-direction", label: "Bureaux de direction" },
      { slug: "bureaux-individuels", label: "Bureaux individuels" },
      { slug: "bureaux-ergonomiques", label: "Bureaux ergonomiques" },
      { slug: "bureaux-bench", label: "Bureaux Bench" },
    ],
  },
  {
    slug: "tables",
    label: "Tables",
    sousCategories: [
      { slug: "tables-reunion", label: "Tables de réunion" },
      { slug: "tables-connectees", label: "Tables connectées" },
      { slug: "tables-basses", label: "Tables basses" },
      { slug: "tables-hautes", label: "Tables hautes" },
    ],
  },
  {
    slug: "sieges",
    label: "Sièges",
    sousCategories: [
      { slug: "fauteuils-direction", label: "Fauteuils de direction" },
      { slug: "chaises-bureau", label: "Chaises de bureau" },
      { slug: "chaises-reunion", label: "Chaises de réunion" },
      { slug: "sieges-ergonomiques", label: "Sièges ergonomiques" },
      { slug: "chaises-visiteur", label: "Chaises visiteur" },
      { slug: "chaises-hautes", label: "Chaises hautes" },
    ],
  },
  {
    slug: "rangements",
    label: "Rangements",
    sousCategories: [
      { slug: "armoires", label: "Armoires" },
      { slug: "bibliotheques", label: "Bibliothèques" },
      { slug: "caissons", label: "Caissons" },
      { slug: "casiers-vestiaires", label: "Casiers & Vestiaires" },
    ],
  },
  {
    slug: "acoustique",
    label: "Acoustique",
    sousCategories: [
      { slug: "cabine-acoustique", label: "Cabine acoustique" },
      { slug: "alcove-acoustique", label: "Alcôve acoustique" },
      { slug: "panneau-acoustique", label: "Panneau acoustique" },
      { slug: "mobilier-acoustique", label: "Mobilier acoustique" },
    ],
  },
];

// --- Helpers ---

export const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.label]));

export const SOUSCAT_LABEL = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.sousCategories.map((s) => [s.slug, s.label]))
);

export const SOUSCAT_PARENT = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.sousCategories.map((s) => [s.slug, c.slug]))
);

export function sousCategoriesDe(slugCategorie) {
  return CATEGORIES.find((c) => c.slug === slugCategorie)?.sousCategories || [];
}

export function labelCategorie(slug) {
  return CAT_LABEL[slug] || SOUSCAT_LABEL[slug] || slug;
}

export function optionsCategories() {
  return CATEGORIES.map((c) => ({ value: c.slug, label: c.label }));
}
export function optionsSousCategories() {
  return CATEGORIES.flatMap((c) =>
    c.sousCategories.map((s) => ({ value: s.slug, label: `${c.label} › ${s.label}` }))
  );
}