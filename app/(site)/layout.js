import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { CartProvider } from "@/components/cart/CartContext";
import { getReglagesPublic } from "@/lib/reglages";

export default async function SiteLayout({ children }) {
  const reglages = await getReglagesPublic();
  const reglagesSafe = JSON.parse(JSON.stringify(reglages));

  return (
    <CartProvider>
      <ScrollToTop />
      <Header reglages={reglagesSafe} />
      {children}
      <Footer reglages={reglagesSafe} />
    </CartProvider>
  );
}