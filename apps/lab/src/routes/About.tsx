import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { PageHero } from "../components/sections/PageHero";
import { Section } from "../components/ui/Section";
import { Card } from "../components/ui/Card";
import { Reveal } from "../components/motion/Reveal";
import { SITE } from "../config/site";

/** About route — background on the Lab and its authorized, educational purpose. */
export function About() {
  return (
    <>
      <Seo {...ROUTE_SEO.about} />
      <PageHero
        eyebrow="About"
        title="About the Security Lab"
        description="The CYVANTAS Security Lab is a hands-on platform for learning offensive and defensive security."
      />
      <Section pad={false} className="pb-[var(--section-pad)]">
        <Reveal>
          <Card className="flex flex-col gap-4">
            <p className="text-body text-muted">
              The Lab exists to make practical security skills approachable: guided
              challenges, structured learning paths, CTF missions, and browser-based
              tools. Everything here is designed for authorized, educational use.
            </p>
            <p className="text-body text-muted">
              It is part of {SITE.name.replace(" Security Lab", "")}, a cybersecurity
              company and security research effort. Never test systems you do not own or
              have explicit permission to assess.
            </p>
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            >
              {SITE.contactEmail}
            </a>
          </Card>
        </Reveal>
      </Section>
    </>
  );
}
