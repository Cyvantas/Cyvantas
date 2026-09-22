import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/Icon";
import { ArrowUpRightIcon, ArrowRightIcon } from "../ui/icons";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import { RESEARCH } from "../../content/home";

export function Research() {
  return (
    <Section id="research" className="border-t border-border-subtle">
      <Reveal>
        <SectionTitle
          eyebrow="Research"
          title="Research & writing"
          description={RESEARCH.intro}
        />
      </Reveal>

      <Reveal className="mt-8">
        <span className="text-technical text-muted">Topics</span>
        <Stagger className="mt-4 flex flex-wrap gap-2">
          {RESEARCH.categories.map((category) => (
            <StaggerItem as="span" key={category}>
              <Badge tone="neutral">{category}</Badge>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>

      <Reveal className="mt-10">
        <span className="text-technical text-muted">Explore</span>
        <ul className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {RESEARCH.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex items-center justify-between gap-3 bg-surface px-5 py-4 text-sm text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <span className="group-hover:text-accent">{link.label}</span>
                <Icon size="sm">
                  {link.external ? <ArrowUpRightIcon /> : <ArrowRightIcon />}
                </Icon>
                {link.external ? (
                  <span className="sr-only"> (opens in a new tab)</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
