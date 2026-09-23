import { Link } from "react-router-dom";
import { Container } from "../ui/Container";
import { Divider } from "../ui/Divider";
import { Logo } from "./Logo";
import { SITE, FOOTER_NAV, LEGAL_NAV, LAB_NAV, COMPANY_SOCIALS } from "../../config/site";
import { RESEARCH } from "../../content/home";

/** Site footer: brand, navigation / research / social / legal, and disclosure. */
export function Footer() {
  const year = new Date().getFullYear();

  const linkClass =
    "text-sm text-muted transition-colors hover:text-accent focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background rounded-sm";

  const heading = "text-technical text-dim";

  // In-page hashes are made route-safe ("#x" -> "/#x") so a router <Link> lands
  // on the homepage section from any page instead of a dead in-page jump.
  const toRouteSafe = (href: string) => (href.startsWith("#") ? `/${href}` : href);

  return (
    <footer className="mt-auto border-t border-border bg-surface/40">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <Logo />
            <p className="text-technical mt-4 text-dim">Offensive Intelligence & Cybersecurity</p>
            <p className="text-body mt-3 max-w-[40ch] text-sm text-muted">
              {SITE.tagline} Offensive security, vulnerability research and security automation.
            </p>
            <a href={`mailto:${SITE.contactEmail}`} className={`${linkClass} mt-4 inline-block`}>
              {SITE.contactEmail}
            </a>
          </div>

          <nav aria-label="Navigation" className="flex flex-col gap-3">
            <span className={heading}>Navigation</span>
            {FOOTER_NAV.map((item) => (
              <Link key={item.label} to={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
            <a href={LAB_NAV.href} rel="noopener noreferrer" className={linkClass}>
              {LAB_NAV.label}
            </a>
          </nav>

          <nav aria-label="Research" className="flex flex-col gap-3">
            <span className={heading}>Research</span>
            {RESEARCH.links.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {link.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <Link key={link.label} to={toRouteSafe(link.href)} className={linkClass}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className={heading}>Social</span>
              {COMPANY_SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {social.label}
                  <span className="sr-only"> — {social.handle} (opens in a new tab)</span>
                </a>
              ))}
            </div>

            <nav aria-label="Legal" className="flex flex-col gap-3">
              <span className={heading}>Legal</span>
              {LEGAL_NAV.map((item) => (
                <Link key={item.label} to={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <Divider className="my-8" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption">
            &copy; {year} {SITE.name}. All rights reserved. Based in {SITE.basedIn}.
          </p>
          <span className="text-technical text-dim">
            Offensive Intelligence // Security Research
          </span>
        </div>

        <p className="text-caption mt-4">
          Security research is conducted for educational and authorized defensive purposes.
          Never test systems without permission.
        </p>
      </Container>
    </footer>
  );
}
