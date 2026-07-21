import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { CartProvider } from "@/components/cart/CartContext";
import { DevisProvider } from "@/components/devis/DevisContext";
import { getReglagesPublic } from "@/lib/reglages";
import { getCategoriesMenu } from "@/lib/catalogue";

export default async function SiteLayout({ children }) {
  const [reglages, categoriesMenu] = await Promise.all([
    getReglagesPublic(),
    getCategoriesMenu(),
  ]);
  const reglagesSafe = JSON.parse(JSON.stringify(reglages));
  const categoriesSafe = JSON.parse(JSON.stringify(categoriesMenu));

  return (
    <AuthSessionProvider>
      <DevisProvider>
        <CartProvider>
          <ScrollToTop />
          <Header reglages={reglagesSafe} categories={categoriesSafe} />
          {children}
          <Footer reglages={reglagesSafe} />
        </CartProvider>
      </DevisProvider>
    </AuthSessionProvider>
  );
}