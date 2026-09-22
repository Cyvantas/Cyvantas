import { Container } from "../ui/Container";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";

/**
 * Placeholder sticky header. Real navigation (links, active state, mobile
 * drawer) lands in Phase 1 — this establishes the shell layout and tokens.
 */
export function Navbar() {
  return (
    <header
      className={
        "sticky top-0 z-[var(--z-header)] h-[var(--header-height)] " +
        "border-b border-border bg-background/80 backdrop-blur-md " +
        "supports-[not(backdrop-filter:blur(0))]:bg-background"
      }
    >
      <Container as="nav" aria-label="Primary" className="flex h-full items-center justify-between">
        <a
          href="/"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Logo />
        </a>

        <Button size="sm" variant="ghost" className="hidden sm:inline-flex">
          Get Security Assessment
        </Button>
      </Container>
    </header>
  );
}
