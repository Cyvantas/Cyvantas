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

export interface FooterLink {
  label: string;
  href: string;
  /** External links open in a new tab with rel=noopener. */
  external?: boolean;
}

/**
 * Footer "Navigation" column. Services/Research/About/Contact resolve to their
 * real routes so the links work from every page; Projects has no dedicated
 * route, so it targets the homepage section (`/#projects`) and scrolls there
 * after navigating home. All are internal — rendered with a router <Link>.
 */
export const FOOTER_NAV: FooterLink[] = [
  { label: "Services", href: "/services" },
  { label: "Research", href: "/research" },
  { label: "Projects", href: "/#projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/**
 * Footer "Legal" column. Policy pages live on the existing site origin
 * (real Blogger pages); centralized here so they can be repointed to React
 * routes once those pages are built.
 */
export const LEGAL_NAV: FooterLink[] = [
  { label: "Privacy Policy", href: `${SITE.url}/p/privacy-policy.html`, external: true },
  { label: "Terms of Use", href: `${SITE.url}/p/terms.html`, external: true },
  {
    label: "Responsible Disclosure",
    href: `${SITE.url}/p/responsible-disclosure.html`,
    external: true,
  },
];
