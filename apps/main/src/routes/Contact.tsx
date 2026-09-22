import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { PageHero } from "../components/sections/PageHero";
import { ContactCta } from "../components/sections/ContactCta";

/** Contact page — reuses the homepage contact section and form. */
export function Contact() {
  return (
    <>
      <Seo {...ROUTE_SEO.contact} />
      <PageHero
        eyebrow="Contact"
        title="Scope a security assessment"
        description="Tell us about your environment and what you need assessed. We'll follow up to scope the engagement."
      />
      <ContactCta />
    </>
  );
}
