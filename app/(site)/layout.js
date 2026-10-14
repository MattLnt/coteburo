import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { FavorisProvider } from "@/components/FavorisContext";
import { CartProvider } from "@/components/cart/CartContext";
import { TauxTvaProvider } from "@/components/TauxTvaContext";
import { DevisProvider } from "@/components/devis/DevisContext";
import { getReglagesPublic } from "@/lib/reglages";
import { getCategoriesMenu } from "@/lib/catalogue";
import { getBandeauPromo } from "@/lib/bandeau";
import { ConsentementProvider } from "@/components/ConsentementContext";
import MetaPixel from "@/components/MetaPixel";
import BandeauCookies from "@/components/BandeauCookies";

export default async function SiteLayout({ children }) {
  const [reglages, categoriesMenu, bandeauPromo] = await Promise.all([
    getReglagesPublic(),
    getCategoriesMenu(),
    getBandeauPromo(),
  ]);
  const reglagesSafe = JSON.parse(JSON.stringify(reglages));
  const categoriesSafe = JSON.parse(JSON.stringify(categoriesMenu));

  return (
    <AuthSessionProvider>
      <ConsentementProvider>
      <FavorisProvider>
      <DevisProvider>
        <TauxTvaProvider taux={reglagesSafe.tva}>
        <CartProvider>
          <ScrollToTop />
          <Header reglages={reglagesSafe} categories={categoriesSafe} bandeauPromo={bandeauPromo} />
          {children}
          <Footer reglages={reglagesSafe} />
          {/* La mesure d'audience vit ici, dans le groupe (site) : la
              boutique et les pages publiques l'ont, l'administration non. */}
          <MetaPixel />
          <BandeauCookies />
          </CartProvider>
        </TauxTvaProvider>
      </DevisProvider>
      </FavorisProvider>
      </ConsentementProvider>
    </AuthSessionProvider>
  );
}