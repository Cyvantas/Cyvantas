import { useRef, useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { ArrowUpRightIcon } from "../ui/icons";
import { cn } from "../../lib/cn";
import { PRIMARY_NAV, MAIN_SITE } from "../../config/site";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

const linkBase =
  "text-sm font-medium text-muted transition-colors hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // Close the mobile menu on route change by adjusting state during render
  // instead of in an effect, avoiding a cascading re-render.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-header)] h-[var(--header-height)]",
        "border-b border-border bg-background/80 backdrop-blur-md",
        "supports-[not(backdrop-filter:blur(0))]:bg-background",
      )}
    >
      <Container as="nav" aria-label="Primary" className="flex h-full items-center justify-between gap-4">
        <NavLink
          to="/"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="CYVANTAS Security Lab — dashboard"
        >
          <Logo />
        </NavLink>

        {/* Desktop navigation. The 7-item nav only fits without crowding at
            large widths, so the accessible mobile menu is used below lg. */}
        <ul className="hidden items-center gap-7 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => cn(linkBase, isActive && "text-accent")}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
          <li>
            <a
              href={MAIN_SITE.href}
              rel="noopener noreferrer"
              className={cn(
                linkBase,
                "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5",
                "hover:border-accent-line hover:text-accent",
              )}
            >
              {MAIN_SITE.label}
              <span className="size-3.5 text-current">
                <Icon size="sm">
                  <ArrowUpRightIcon />
                </Icon>
              </span>
            </a>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-md border border-border lg:hidden",
            "text-foreground transition-colors hover:border-accent-line",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        >
          <Icon>
            <MenuIcon />
          </Icon>
        </button>
      </Container>

      <MobileMenu open={open} onClose={() => setOpen(false)} returnFocusRef={toggleRef} />
    </header>
  );
}
