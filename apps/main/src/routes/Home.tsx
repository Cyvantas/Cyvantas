import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { Hero } from "../components/sections/Hero";
import { ServicesOverview } from "../components/sections/ServicesOverview";
import { Methodology } from "../components/sections/Methodology";
import { AttackSurface } from "../components/sections/AttackSurface";
import { Research } from "../components/sections/Research";
import { Frameworks } from "../components/sections/Frameworks";
import { Projects } from "../components/sections/Projects";
import { LabCta } from "../components/sections/LabCta";
import { About } from "../components/sections/About";
import { ContactCta } from "../components/sections/ContactCta";

/** CYVANTAS homepage — composed from data-driven section components. */
export function Home() {
  return (
    <>
      <Seo {...ROUTE_SEO.home} />
      <Hero />
      <ServicesOverview />
      <Methodology />
      <AttackSurface />
      <Research />
      <Frameworks />
      <Projects />
      <LabCta />
      <About />
      <ContactCta />
    </>
  );
}
