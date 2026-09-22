import { Section } from "../ui/Section";
import { SectionTitle } from "../ui/SectionTitle";
import { Icon } from "../ui/Icon";
import { SERVICE_ICONS } from "../ui/icons";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import { SURFACE_INTRO, SURFACE_LAYERS, CAPABILITIES } from "../../content/home";

export function AttackSurface() {
  return (
    <Section id="attack-surface" className="border-t border-border-subtle">
      <Reveal>
        <SectionTitle
          eyebrow="Attack surface"
          title="Vulnerabilities live in an interconnected attack surface"
          description={SURFACE_INTRO}
        />
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        {/* Coverage / security capability snapshot */}
        <Reveal>
          <span className="text-technical text-muted">Coverage</span>
          <Stagger className="mt-4 grid grid-cols-2 gap-3">
            {CAPABILITIES.map((cap) => {
              const Glyph = SERVICE_ICONS[cap.icon];
              return (
                <StaggerItem
                  key={cap.title}
                  className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4 transition-colors hover:border-accent-line"
                >
                  <div className="flex items-center justify-between">
                    <Icon size="sm">
                      <Glyph />
                    </Icon>
                    <span className="text-technical inline-flex items-center gap-1.5 text-accent-secondary">
                      <span aria-hidden className="size-1.5 rounded-full bg-accent-secondary" />
                      Offered
                    </span>
                  </div>
                  <span className="font-display text-sm font-semibold text-foreground">
                    {cap.title}
                  </span>
                  <span className="text-caption">{cap.sub}</span>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Reveal>

        {/* Layered exposure map */}
        <Reveal>
          <span className="text-technical text-muted">Layered exposure map</span>
          <Stagger as="ol" className="surface-chain mt-4 flex flex-col gap-2">
            {SURFACE_LAYERS.map((layer) => (
              <StaggerItem
                as="li"
                key={layer.order}
                tabIndex={0}
                className="surface-layer group flex items-start gap-4 rounded-md border border-border bg-surface px-4 py-3 outline-none transition-colors hover:border-accent-line focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="font-mono text-xs text-dim transition-colors group-hover:text-accent group-focus:text-accent">
                  {layer.order}
                </span>
                <div>
                  <strong className="font-display text-sm font-semibold text-foreground">
                    {layer.title}
                  </strong>
                  <p className="text-caption mt-0.5">{layer.description}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>
      </div>
    </Section>
  );
}
