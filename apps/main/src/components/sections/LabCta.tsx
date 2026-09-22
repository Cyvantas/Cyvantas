import { Section } from "../ui/Section";
import { Eyebrow } from "../ui/SectionTitle";
import { Icon } from "../ui/Icon";
import { BeakerIcon, ArrowUpRightIcon } from "../ui/icons";
import { Reveal } from "../motion/Reveal";
import { LAB } from "../../content/home";

export function LabCta() {
  return (
    <Section id="lab" className="border-t border-border-subtle">
      <Reveal className="relative overflow-hidden rounded-xl border border-border bg-surface p-8 sm:p-12">
        {/* Restrained radial wash, decorative only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 90% at 85% 0%, var(--color-accent-secondary-soft) 0%, transparent 60%)",
          }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <Eyebrow>CYVANTAS Security Lab</Eyebrow>
            <p className="font-display mt-4 text-3xl font-semibold text-foreground sm:text-4xl">
              Learn.{" "}
              <span className="text-accent">Break.</span>{" "}
              <span className="text-accent-secondary">Defend.</span>
            </p>
            <p className="text-body mt-4 max-w-[54ch] text-muted">{LAB.lead}</p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {LAB.areas.map((area) => (
                <li
                  key={area}
                  className="text-technical rounded-sm border border-border px-2.5 py-1 text-muted"
                >
                  {area}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <Icon boxed size="lg" className="border-accent-secondary/40">
              <BeakerIcon />
            </Icon>
            <a
              href={LAB.href}
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-accent-secondary/50 bg-accent-secondary-soft px-5 text-sm font-medium text-accent-secondary transition-colors hover:bg-accent-secondary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Enter the Lab
              <Icon size="sm">
                <ArrowUpRightIcon />
              </Icon>
              <span className="sr-only"> (opens the Security Lab)</span>
            </a>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
