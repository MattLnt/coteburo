import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://coteburo.fr"),
  title: {
    default: "Côté BURO — Aménagement & mobilier de bureau à Aix-en-Provence",
    template: "%s · Côté BURO",
  },
  description:
    "Côté BURO aménage vos espaces de travail à Aix-en-Provence : conseil, mobilier de bureau professionnel, livraison et montage. Demandez votre devis.",
  keywords: [
    "mobilier de bureau",
    "aménagement de bureau",
    "Aix-en-Provence",
    "sièges ergonomiques",
    "bureaux professionnels",
  ],
  authors: [{ name: "Côté BURO" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://coteburo.fr",
    siteName: "Côté BURO",
    title: "Côté BURO — Aménagement & mobilier de bureau",
    description:
      "Conseil, mobilier et installation sur-mesure pour vos espaces de travail à Aix-en-Provence.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Côté BURO — Aménagement de bureaux à Aix-en-Provence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Côté BURO — Aménagement & mobilier de bureau",
    description: "Conseil, mobilier et installation sur-mesure à Aix-en-Provence.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F0661B",
};

// Données structurées — c'est ce que Google lit pour associer un logo, une
// adresse et des horaires à l'entreprise (fiche établissement, panneau de
// connaissance). Le type LocalBusiness convient à un commerce avec showroom.
const donneesStructurees = {
  "@context": "https://schema.org",
  "@type": "FurnitureStore",
  "@id": "https://coteburo.fr/#entreprise",
  name: "Côté BURO",
  description:
    "Spécialiste de l'aménagement et du mobilier de bureau à Aix-en-Provence : conseil, plans 3D, livraison et montage en région PACA.",
  url: "https://coteburo.fr",
  logo: "https://coteburo.fr/logo-coteburo-bicolore.svg",
  image: "https://coteburo.fr/og-image.jpg",
  telephone: "+33781020631",
  email: "contact@coteburo.fr",
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: "TECH'INDUS Bât D Porte 8, 645 rue Mayor de Montricher",
    addressLocality: "Aix-en-Provence",
    postalCode: "13290",
    addressCountry: "FR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 43.4986,
    longitude: 5.3479,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Provence-Alpes-Côte d'Azur",
  },
  sameAs: [],
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}