import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { getReglagesPublic } from "@/lib/reglages";

export default async function SiteLayout({ children }) {
  const reglages = await getReglagesPublic();

  return (
    <>
      <ScrollToTop />
      <Header reglages={JSON.parse(JSON.stringify(reglages))} />
      {children}
      <Footer reglages={JSON.parse(JSON.stringify(reglages))} />
    </>
  );
}