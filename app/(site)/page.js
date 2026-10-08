import Hero from "@/components/Hero";
import CategoryBar from "@/components/CategoryBar";
import BestSellers from "@/components/BestSellers";
import AmbianceBand from "@/components/AmbianceBand";
import ProductSelection from "@/components/ProductSelection";
import PromoBand from "@/components/PromoBand";
import TrustStrip from "@/components/TrustStrip";
import Steps from "@/components/Steps";
import Brands from "@/components/Brands";
import Realisations from "@/components/Realisations";
import Reviews from "@/components/Reviews";
import CtaBand from "@/components/CtaBand";

// L'accueil lisait les favoris du visiteur à travers trois de ses blocs, ce
// qui la rendait dynamique : meilleures ventes, sélection et bandeau promo
// interrogeaient la base à chaque visite. Les favoris sont passés côté
// navigateur, la page est donc rendue une fois puis servie depuis le cache,
// et l'admin l'invalide à chaque changement (voir lib/invalidation.js).
export const revalidate = 3600;

export default function Home() {
  return (
    <main className="flex flex-col gap-20 sm:gap-28">
      <Hero />
      <CategoryBar />
      <BestSellers />
      <AmbianceBand />
      <ProductSelection />
      <PromoBand />
      <TrustStrip />
      <Steps />
      <Brands />
      <Realisations />
      <Reviews />
      <CtaBand />
    </main>
  );
}