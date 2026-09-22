import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import { METHODOLOGY } from "../../content/home";

export function Methodology() {
  return (
    <Section id="methodology" className="border-t border-border-subtle">
      <Reveal>
        <SectionTitle
          eyebrow="Methodology"
          title="A repeatable, evidence-driven engagement flow"
          description="Discover → Map → Test → Validate → Exploit → Remediate. Each stage produces a concrete output so findings stay traceable from first contact to verified fix."
        />
      </Reveal>

      <Stagger
        as="ol"
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {METHODOLOGY.map((stage) => (
          <StaggerItem
            as="li"
            key={stage.order}
            className={
              "relative flex flex-col rounded-lg border bg-surface p-6 " +
              (stage.highlight
                ? "border-accent-line"
                : "border-border")
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-semibold text-dim">
                {stage.order}
              </span>
              {stage.highlight ? (
                <Badge tone="cyan">Authorized only</Badge>
              ) : null}
            </div>

            <h3 className="font-display mt-3 text-xl font-semibold text-foreground">
              {stage.name}
            </h3>
            <p className="text-body mt-2 flex-1 text-sm text-muted">{stage.description}</p>

            <div className="mt-4 border-t border-border-subtle pt-3">
              <span className="text-technical text-accent-secondary">Output</span>
              <p className="mt-1 text-sm text-foreground">{stage.output}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
