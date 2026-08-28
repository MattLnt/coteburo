export const ADMIN_NAV = [
  {
    section: "Pilotage",
    items: [
      { href: "/admin", label: "Vue d'ensemble", short: "Accueil", icon: "home" },
    ],
  },
  {
    section: "Ventes",
    items: [
      { href: "/admin/ventes", label: "Vue d'ensemble", short: "Ventes", icon: "home" },
      { href: "/admin/commandes", label: "Commandes", short: "Commandes", icon: "box" },
      { href: "/admin/devis", label: "Devis", short: "Devis", icon: "edit" },
      { href: "/admin/clients", label: "Clients", short: "Clients", icon: "eye" },
    ],
  },
  {
    section: "Catalogue",
    items: [
      { href: "/admin/produits", label: "Produits", short: "Produits", icon: "box" },
      { href: "/admin/architecture", label: "Architecture", short: "Architecture", icon: "layers" },
      { href: "/admin/marques", label: "Marques", short: "Marques", icon: "layers" },
      { href: "/admin/promotions", label: "Promotions", short: "Promos", icon: "tag" },
    ],
  },
  {
    section: "Contenu",
    items: [
      { href: "/admin/realisations", label: "Réalisations", short: "Réalisations", icon: "image" },
      { href: "/admin/articles", label: "Articles", short: "Articles", icon: "edit" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/admin/reglages", label: "Réglages", short: "Réglages", icon: "settings" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Navigation mobile (bottom bar contextuelle).
// Deux niveaux : la racine liste les sections, chaque section liste ses pages.
// Une sous-page (ex. l'édition d'un produit) hérite du menu de sa section
// grâce au préfixe d'URL — voir sectionDeChemin() plus bas.
// ─────────────────────────────────────────────────────────────

// Actions présentes dans tous les menus. type: "lien" | "logout" | "externe"
const DECONNEXION = { id: "logout", label: "Quitter", icon: "logout", type: "logout" };
const VOIR_SITE = { id: "site", label: "Le site", icon: "site", type: "externe", href: "/" };
const VUE_ENSEMBLE = { id: "accueil", label: "Vue d'ensemble", icon: "home", href: "/admin", exact: true };

export const BOTTOM_NAV = {
  racine: [
    VUE_ENSEMBLE,
    { id: "ventes", label: "Ventes", icon: "cart", href: "/admin/ventes" },
    { id: "catalogue", label: "Catalogue", icon: "box", href: "/admin/produits" },
    { id: "contenu", label: "Contenu", icon: "image", href: "/admin/realisations" },
    { id: "config", label: "Config", icon: "settings", href: "/admin/reglages" },
    VOIR_SITE,
    DECONNEXION,
  ],
  ventes: [
    VUE_ENSEMBLE,
    { id: "ventes", label: "Ventes", icon: "cart", href: "/admin/ventes" },
    { id: "commandes", label: "Commandes", icon: "box", href: "/admin/commandes" },
    { id: "devis", label: "Devis", icon: "edit", href: "/admin/devis" },
    { id: "clients", label: "Clients", icon: "eye", href: "/admin/clients" },
    DECONNEXION,
  ],
  catalogue: [
    VUE_ENSEMBLE,
    { id: "produits", label: "Produits", icon: "box", href: "/admin/produits" },
    { id: "architecture", label: "Architecture", icon: "layers", href: "/admin/architecture" },
    { id: "marques", label: "Marques", icon: "layers", href: "/admin/marques" },
    { id: "promotions", label: "Promos", icon: "tag", href: "/admin/promotions" },
    DECONNEXION,
  ],
  contenu: [
    VUE_ENSEMBLE,
    { id: "realisations", label: "Réalisations", icon: "image", href: "/admin/realisations" },
    { id: "articles", label: "Articles", icon: "edit", href: "/admin/articles" },
    DECONNEXION,
  ],
  config: [
    VUE_ENSEMBLE,
    { id: "reglages", label: "Réglages", icon: "settings", href: "/admin/reglages" },
    VOIR_SITE,
    DECONNEXION,
  ],
};

// Rattache une URL à sa section. L'ordre compte peu (les préfixes sont disjoints),
// mais toute nouvelle page admin doit être ajoutée ici pour hériter du bon menu.
const PREFIXES_SECTION = [
  ["/admin/ventes", "ventes"],
  ["/admin/commandes", "ventes"],
  ["/admin/devis", "ventes"],
  ["/admin/clients", "ventes"],
  ["/admin/produits", "catalogue"],
  ["/admin/architecture", "catalogue"],
  ["/admin/marques", "catalogue"],
  ["/admin/promotions", "catalogue"],
  ["/admin/realisations", "contenu"],
  ["/admin/articles", "contenu"],
  ["/admin/reglages", "config"],
];

export function sectionDeChemin(pathname) {
  if (!pathname) return "racine";
  for (const [prefixe, section] of PREFIXES_SECTION) {
    if (pathname === prefixe || pathname.startsWith(prefixe + "/")) return section;
  }
  return "racine";
}