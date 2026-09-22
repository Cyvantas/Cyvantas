import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Icon } from "../ui/Icon";
import { ArrowUpRightIcon } from "../ui/icons";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import {
  FRAMEWORKS,
  FRAMEWORKS_INTRO,
  FRAMEWORKS_NOTE,
  OWASP_TOP_TEN,
} from "../../content/home";

export function Frameworks() {
  return (
    <Section id="frameworks" className="border-t border-border-subtle">
      <Reveal>
        <SectionTitle
          eyebrow="Frameworks & references"
          title="The standards we test against"
          description={FRAMEWORKS_INTRO}
        />
      </Reveal>

      {/* In-page anchor target for footer "Resources" link. */}
      <span id="resources" className="sr-only" />

      <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FRAMEWORKS.map((fw) => (
          <StaggerItem
            as="span"
            key={fw.name}
            className="group flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent-line"
          >
            <a
              href={fw.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent">
                {fw.name}
              </h3>
              <p className="text-body mt-2 text-sm text-muted">{fw.description}</p>
              <span className="text-technical mt-4 inline-flex items-center gap-1.5 text-dim group-hover:text-accent">
                <Icon size="sm">
                  <ArrowUpRightIcon />
                </Icon>
                {fw.display}
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
            </a>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-6">
        <details className="rounded-lg border border-border bg-surface p-5">
          <summary className="cursor-pointer text-sm font-medium text-foreground marker:text-accent">
            OWASP Top 10:2025 categories
          </summary>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {OWASP_TOP_TEN.map((item) => (
              <li key={item.id} className="flex items-baseline gap-3 text-sm text-muted">
                <span className="text-technical text-accent">{item.id}</span>
                {item.name}
              </li>
            ))}
          </ul>
        </details>
      </Reveal>

      <p className="text-caption mt-6">{FRAMEWORKS_NOTE}</p>
    </Section>
  );
}
