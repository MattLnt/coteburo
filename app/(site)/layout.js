import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { CartProvider } from "@/components/cart/CartContext";
import { TauxTvaProvider } from "@/components/TauxTvaContext";
import { DevisProvider } from "@/components/devis/DevisContext";
import { getReglagesPublic } from "@/lib/reglages";
import { getCategoriesMenu } from "@/lib/catalogue";
import { getBandeauPromo } from "@/lib/bandeau";

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
      <DevisProvider>
        <TauxTvaProvider taux={reglagesSafe.tva}>
        <CartProvider>
          <ScrollToTop />
          <Header reglages={reglagesSafe} categories={categoriesSafe} bandeauPromo={bandeauPromo} />
          {children}
          <Footer reglages={reglagesSafe} />
          </CartProvider>
        </TauxTvaProvider>
      </DevisProvider>
    </AuthSessionProvider>
  );
}