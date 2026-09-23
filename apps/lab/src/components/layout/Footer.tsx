import { Link } from "react-router-dom";
import { Container } from "../ui/Container";
import { Divider } from "../ui/Divider";
import { Logo } from "./Logo";
import { SITE, PRIMARY_NAV, MAIN_SITE } from "../../config/site";

/** Lab footer: brand, lab navigation, link back to the main site, and disclosure. */
export function Footer() {
  const year = new Date().getFullYear();

  const linkClass =
    "text-sm text-muted transition-colors hover:text-accent focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background rounded-sm";

  const heading = "text-technical text-dim";

  return (
    <footer className="mt-auto border-t border-border bg-surface/40">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr] lg:gap-12">
          <div>
            <Logo />
            <p className="text-technical mt-4 text-dim">Learn. Break. Defend.</p>
            <p className="text-body mt-3 max-w-[42ch] text-sm text-muted">
              A hands-on platform for authorized, educational security practice —
              guided challenges, learning paths, CTF missions, and browser-based tools.
            </p>
            <a href={`mailto:${SITE.contactEmail}`} className={`${linkClass} mt-4 inline-block`}>
              {SITE.contactEmail}
            </a>
          </div>

          <nav aria-label="Lab" className="flex flex-col gap-3">
            <span className={heading}>Lab</span>
            {PRIMARY_NAV.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="CYVANTAS" className="flex flex-col gap-3">
            <span className={heading}>CYVANTAS</span>
            <a href={MAIN_SITE.href} rel="noopener noreferrer" className={linkClass}>
              {MAIN_SITE.label}
              <span className="sr-only"> (opens the main site)</span>
            </a>
          </nav>
        </div>

        <Divider className="my-8" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption">
            &copy; {year} {SITE.name}. Based in {SITE.basedIn}.
          </p>
          <span className="text-technical text-dim">Security Research // Education</span>
        </div>

        <p className="text-caption mt-4">
          All challenges and tools are designed for authorized, educational use only.
          Never test systems without permission.
        </p>
      </Container>
    </footer>
  );
}
