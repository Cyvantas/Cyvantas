import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Reveal } from "../motion/Reveal";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** Standalone-route header: renders the page's single <h1> above content. */
export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <Section className="border-b border-border-subtle">
      <Reveal>
        <SectionTitle as="h1" eyebrow={eyebrow} title={title} description={description} />
      </Reveal>
    </Section>
  );
}
