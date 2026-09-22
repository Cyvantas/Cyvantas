/**
 * Site-wide constants and navigation model. Real, verified values only
 * (ARCHITECTURE.md §2/§3). The Security Lab lives on a separate deployable;
 * `labUrl` is centralized here so it can be repointed without touching UI.
 */
export const SITE = {
  name: "CYVANTAS",
  url: "https://cyvantas.in",
  /** Separate lab app (apps/lab → lab.cyvantas.in). Change here to repoint. */
  labUrl: "https://lab.cyvantas.in",
  contactEmail: "cyvantas@gmail.com",
  tagline: "Security beyond the surface.",
  locale: "en_IN",
  basedIn: "India",
  founder: "Prajeesh KC",
} as const;

export interface NavItem {
  label: string;
  /** Internal route path. */
  to: string;
}

/** Primary in-app navigation (internal routes only). */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "Research", to: "/research" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

/** External link to the separate Security Lab experience. */
export const LAB_NAV = {
  label: "Security Lab",
  href: SITE.labUrl,
} as const;
