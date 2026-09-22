import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Icon } from "../ui/Icon";
import { Badge } from "../ui/Badge";
import { ArrowRightIcon, SERVICE_ICONS } from "../ui/icons";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import { SERVICES } from "../../content/home";

export function ServicesOverview() {
  return (
    <Section id="services" className="border-t border-border-subtle">
      <Reveal>
        <SectionTitle
          eyebrow="Services"
          title="Security testing across your full attack surface"
          description="Every engagement starts from an objective — from initial discovery to verified remediation — and is performed only within an agreed, authorized scope."
        />
      </Reveal>

      <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => {
          const Glyph = SERVICE_ICONS[service.icon];
          return (
            <StaggerItem
              as="article"
              key={service.id}
              className="group flex flex-col rounded-lg border border-border bg-surface p-6 transition-[border-color,background-color] duration-200 hover:border-accent-line hover:bg-surface-elevated"
            >
              <div className="flex items-center justify-between">
                <Icon boxed size="md">
                  <Glyph />
                </Icon>
                <span className="text-technical text-dim">
                  {service.id} // {service.phase}
                </span>
              </div>

              <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
                {service.title}
              </h3>
              <p className="text-body mt-2 text-sm text-muted">{service.summary}</p>

              <div className="mt-4 rounded-md border border-border-subtle bg-background/40 px-3 py-2">
                <span className="text-technical text-accent">Objective</span>
                <p className="mt-1 text-sm text-foreground">{service.objective}</p>
              </div>

              <details className="group/more mt-4">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <span className="transition-transform duration-200 group-open/more:rotate-90">
                    <Icon size="sm">
                      <ArrowRightIcon />
                    </Icon>
                  </span>
                  Typical coverage
                </summary>
                <ul className="mt-3 flex flex-col gap-1.5 pl-1">
                  {service.coverage.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted">
                      <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-accent-line" />
                      {item}
                    </li>
                  ))}
                </ul>
              </details>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Reveal className="mt-8 flex flex-wrap items-center gap-3">
        <Badge tone="neutral" className="align-middle">
          Authorized-scope only
        </Badge>
        <a
          href="#contact"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Scope an engagement
          <Icon size="sm">
            <ArrowRightIcon />
          </Icon>
        </a>
      </Reveal>
    </Section>
  );
}
