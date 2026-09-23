import { Section } from "../ui/Section";
import { PageHero } from "./PageHero";
import { Reveal } from "../motion/Reveal";
import type { LegalDoc } from "../../content/legal";

/** Renders a structured legal document (Privacy / Terms / Responsible Disclosure). */
export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <PageHero eyebrow={doc.eyebrow} title={doc.title} description={doc.intro} />
      <Section pad={false} className="pb-[var(--section-pad)]">
        <Reveal>
          <div className="max-w-[70ch]">
            <p
              role="note"
              className="text-caption rounded-md border border-border bg-surface/60 px-4 py-3 text-muted"
            >
              {doc.draftNote}
            </p>

            <div className="mt-10 flex flex-col gap-10">
              {doc.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)} className="text-body mt-3 text-muted">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets ? (
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {section.bullets.map((item) => (
                        <li key={item} className="flex gap-3 text-sm text-foreground">
                          <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-accent-line" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
