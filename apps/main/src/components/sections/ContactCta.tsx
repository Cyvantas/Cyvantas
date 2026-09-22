import { Section } from "../ui/Section";
import { Eyebrow } from "../ui/SectionTitle";
import { Icon } from "../ui/Icon";
import { MailIcon } from "../ui/icons";
import { Reveal } from "../motion/Reveal";
import { CONTACT } from "../../content/home";
import { ContactForm } from "./ContactForm";

export function ContactCta() {
  return (
    <Section id="contact" className="border-t border-border-subtle">
      <Reveal className="rounded-xl border border-border bg-surface p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <Eyebrow>Get in touch</Eyebrow>
            <h2 className="text-heading mt-3 text-foreground text-balance">{CONTACT.title}</h2>
            <p className="text-body mt-4 max-w-[54ch] text-muted">{CONTACT.lead}</p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {CONTACT.topics.map((topic) => (
                <li
                  key={topic}
                  className="text-technical rounded-sm border border-border px-2.5 py-1 text-muted"
                >
                  {topic}
                </li>
              ))}
            </ul>

            <a
              href={`mailto:${CONTACT.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-sm text-sm text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Icon size="sm">
                <MailIcon />
              </Icon>
              {CONTACT.email}
            </a>

            <p className="text-caption mt-4 max-w-[42ch]">{CONTACT.privacy}</p>
          </div>

          <ContactForm />
        </div>
      </Reveal>
    </Section>
  );
}
