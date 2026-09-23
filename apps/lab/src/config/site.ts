/**
 * Site-wide constants and navigation model for the CYVANTAS Security Lab
 * (apps/lab → lab.cyvantas.in). The main marketing site lives on a separate
 * deployable; `mainUrl` is centralized here so it can be repointed without
 * touching UI.
 */
export const SITE = {
  name: "CYVANTAS Security Lab",
  shortName: "Security Lab",
  url: "https://lab.cyvantas.in",
  /** Main marketing site (apps/main → cyvantas.in). Change here to repoint. */
  mainUrl: "https://cyvantas.in",
  contactEmail: "cyvantas@gmail.com",
  tagline: "Learn. Break. Defend.",
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
  { label: "Dashboard", to: "/" },
  { label: "Challenges", to: "/challenges" },
  { label: "Learning", to: "/learning" },
  { label: "CTF", to: "/ctf" },
  { label: "Tools", to: "/tools" },
  { label: "About", to: "/about" },
];

/** External link back to the main CYVANTAS marketing site. */
export const MAIN_SITE = {
  label: "Main Site",
  href: SITE.mainUrl,
} as const;
