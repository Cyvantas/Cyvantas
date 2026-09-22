import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { PageHero } from "../components/sections/PageHero";
import { ServicesOverview } from "../components/sections/ServicesOverview";
import { Methodology } from "../components/sections/Methodology";
import { ContactCta } from "../components/sections/ContactCta";

/** Services page — reuses the homepage service, methodology and contact sections. */
export function Services() {
  return (
    <>
      <Seo {...ROUTE_SEO.services} />
      <PageHero
        eyebrow="Services"
        title="Offensive security & VAPT services"
        description="Objective-driven security testing performed only within an agreed, authorized scope — from initial discovery through verified remediation."
      />
      <ServicesOverview />
      <Methodology />
      <ContactCta />
    </>
  );
}
