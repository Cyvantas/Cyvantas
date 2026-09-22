/**
 * Per-route SEO metadata. Homepage title/description/OG values are ported
 * verbatim from the existing Blogger theme (ARCHITECTURE.md §2.1–2.3).
 * Other routes use neutral, factual copy — no invented claims. Values that
 * could not be verified are flagged for later confirmation, not guessed.
 */

/** Discovered in the Blogger theme; asset existence UNVERIFIED (ARCHITECTURE.md §4.2). */
export const OG_IMAGE = "https://cyvantas.in/assets/cyvantas-og.jpg";

/** Personal handle from the Blogger theme; company handle UNVERIFIED (ARCHITECTURE.md §4.5). */
export const TWITTER_SITE = "@Prajeesh_kc";

export interface RouteSeo {
  /** Route path; used to build the canonical URL. */
  path: string;
  title: string;
  description: string;
  /** Optional Open Graph title override (defaults to `title`). */
  ogTitle?: string;
}

const HOME_DESCRIPTION =
  "CYVANTAS is a cybersecurity company helping organizations discover " +
  "vulnerabilities, understand their attack surface, and build stronger " +
  "defenses through VAPT, red teaming, cloud, API and application security testing.";

export const ROUTE_SEO = {
  home: {
    path: "/",
    title: "CYVANTAS | Cybersecurity, VAPT & Penetration Testing Services",
    description: HOME_DESCRIPTION,
    // Verified non-post OG title from the Blogger theme (ARCHITECTURE.md §2.2).
    ogTitle: "CYVANTAS | Security Beyond The Surface",
  },
  services: {
    path: "/services",
    title: "Services | CYVANTAS",
    description: "Explore the security capabilities offered by CYVANTAS.",
  },
  research: {
    path: "/research",
    title: "Research | CYVANTAS",
    description: "Security research and intelligence from CYVANTAS.",
  },
  about: {
    path: "/about",
    title: "About | CYVANTAS",
    description: "Learn about CYVANTAS and its founder, Prajeesh KC.",
  },
  contact: {
    path: "/contact",
    title: "Contact | CYVANTAS",
    description: "Get in touch with CYVANTAS about authorized security assessments.",
  },
  notFound: {
    path: "/404",
    title: "Page not found | CYVANTAS",
    description: "The page you are looking for could not be found.",
  },
} satisfies Record<string, RouteSeo>;
