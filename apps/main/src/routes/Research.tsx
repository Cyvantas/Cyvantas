import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { PageHero } from "../components/sections/PageHero";
import { Research as ResearchSection } from "../components/sections/Research";
import { Frameworks } from "../components/sections/Frameworks";

/** Research page — reuses the homepage research and frameworks sections. */
export function Research() {
  return (
    <>
      <Seo {...ROUTE_SEO.research} />
      <PageHero
        eyebrow="Research"
        title="Security research & intelligence"
        description="Vulnerability research, advisories and technical writing, grounded in established industry frameworks."
      />
      <ResearchSection />
      <Frameworks />
    </>
  );
}
