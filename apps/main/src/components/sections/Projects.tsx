import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/Icon";
import { ArrowUpRightIcon, AlertIcon } from "../ui/icons";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import { PROJECTS, PROJECTS_INTRO, PROJECTS_DISCLAIMER } from "../../content/home";

export function Projects() {
  return (
    <Section id="projects" className="border-t border-border-subtle">
      <Reveal>
        <SectionTitle
          eyebrow="Projects & open source"
          title="Security tooling, built in the open"
          description={PROJECTS_INTRO}
        />
      </Reveal>

      <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
        {PROJECTS.map((project) => (
          <StaggerItem
            as="article"
            key={project.title}
            className="group flex flex-col rounded-lg border border-border bg-surface p-6"
          >
            <Badge tone={project.tag === "Project" ? "cyan" : "neutral"}>
              {project.tag}
            </Badge>
            <h3 className="font-display mt-3 text-lg font-semibold text-foreground">
              {project.title}
            </h3>
            <p className="text-body mt-2 text-sm text-muted">{project.description}</p>

            <div className="mt-4 flex items-baseline justify-between border-t border-border-subtle pt-4">
              <span className="text-technical text-dim">Source · GitHub</span>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-technical inline-flex items-center gap-1.5 text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {project.cta}
                <Icon size="sm">
                  <ArrowUpRightIcon />
                </Icon>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <p className="text-caption mt-6 flex items-start gap-2">
        <Icon size="sm" className="mt-0.5 shrink-0">
          <AlertIcon />
        </Icon>
        <span>{PROJECTS_DISCLAIMER}</span>
      </p>
    </Section>
  );
}
