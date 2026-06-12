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

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}