import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { PageHero } from "../components/sections/PageHero";
import { About as AboutSection } from "../components/sections/About";
import { LabCta } from "../components/sections/LabCta";

/** About page — reuses the homepage about and Security Lab sections. */
export function About() {
  return (
    <>
      <Seo {...ROUTE_SEO.about} />
      <PageHero
        eyebrow="About"
        title="An offensive-security mindset, applied to real exposure"
        description="Who CYVANTAS is, how we think about risk, and the person behind the work."
      />
      <AboutSection />
      <LabCta />
    </>
  );
}
