import Hero from "@/components/Hero";
import ProjectTypes from "@/components/ProjectTypes";
import Categories from "@/components/Categories";
import TrustStrip from "@/components/TrustStrip";
import Steps from "@/components/Steps";
import Featured from "@/components/Featured";
import Brands from "@/components/Brands";
import Realisations from "@/components/Realisations";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProjectTypes />
      <Categories />
      <TrustStrip />
      <Steps />
      <Featured />
      <Brands />
      <Realisations />
    </main>
  );
}