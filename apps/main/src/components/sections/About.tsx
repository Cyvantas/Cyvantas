import { Section } from "../ui/Section";
import { SectionTitle, Eyebrow } from "../ui/SectionTitle";
import { Reveal, Stagger, StaggerItem } from "../motion/Reveal";
import { ABOUT, PRINCIPLES, FOUNDER } from "../../content/home";

export function About() {
  return (
    <Section id="about" className="border-t border-border-subtle">
      {/* About copy + spec */}
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <Reveal>
          <Eyebrow>About CYVANTAS</Eyebrow>
          <h2 className="text-heading mt-3 text-foreground text-balance">{ABOUT.title}</h2>
          <p className="text-body mt-5 text-muted">{ABOUT.paragraph}</p>

          <ul className="mt-6 flex flex-col gap-2.5">
            {ABOUT.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-foreground">
                <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-accent-line" />
                {point}
              </li>
            ))}
          </ul>

          <p className="font-display mt-8 text-xl font-medium text-foreground">
            <span className="text-technical mr-3 block text-accent sm:inline">Philosophy</span>
            &ldquo;{ABOUT.philosophy}&rdquo;
          </p>
        </Reveal>

        <Reveal>
          <dl className="rounded-lg border border-border bg-surface p-6">
            {ABOUT.spec.map((row, i) => (
              <div
                key={row.label}
                className={
                  "flex items-baseline justify-between gap-4 py-2.5 " +
                  (i > 0 ? "border-t border-border-subtle" : "")
                }
              >
                <dt className="text-technical text-dim">{row.label}</dt>
                <dd
                  className={
                    "text-right text-sm font-medium " +
                    (row.accent ? "text-accent-secondary" : "text-foreground")
                  }
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {/* Principles */}
      <Reveal className="mt-16">
        <SectionTitle eyebrow="Why CYVANTAS" title="Built on an offensive-security mindset" />
      </Reveal>
      <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((principle) => (
          <StaggerItem
            key={principle.id}
            className="rounded-lg border border-border bg-surface p-6"
          >
            <span className="text-technical text-accent">{principle.id}</span>
            <h3 className="font-display mt-2 text-lg font-semibold text-foreground">
              {principle.title}
            </h3>
            <p className="text-body mt-2 text-sm text-muted">{principle.description}</p>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Founder */}
      <Reveal className="mt-16">
        <Eyebrow>Founder</Eyebrow>
        <div className="mt-6 rounded-lg border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <img
              src={FOUNDER.photo.src}
              alt={FOUNDER.photo.alt}
              width={FOUNDER.photo.width}
              height={FOUNDER.photo.height}
              loading="lazy"
              decoding="async"
              className="size-28 shrink-0 rounded-lg border border-border object-cover sm:size-32"
            />
            <div>
              <h3 className="font-display text-2xl font-semibold text-foreground">
                {FOUNDER.name}
              </h3>
              <span className="text-technical text-accent">{FOUNDER.role}</span>

              <div className="mt-4 flex flex-col gap-3">
                {FOUNDER.bio.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-body max-w-[70ch] text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <ul className="mt-5 flex flex-wrap gap-2">
            {FOUNDER.focus.map((chip) => (
              <li
                key={chip}
                className="text-technical rounded-sm border border-border px-2.5 py-1 text-muted"
              >
                {chip}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-4">
            {FOUNDER.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {social.label}
                <span className="sr-only"> — {social.handle} (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
