import Hero from "@/components/Hero";
import ProjectTypes from "@/components/ProjectTypes";
import Categories from "@/components/Categories";
import TrustStrip from "@/components/TrustStrip";
import Steps from "@/components/Steps";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProjectTypes />
      <Categories />
      <TrustStrip />
      <Steps />
    </main>
  );
}