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
      { href: "/admin/commandes", label: "Commandes", short: "Commandes", icon: "box" },
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