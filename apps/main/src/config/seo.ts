/**
 * Per-route SEO metadata. Homepage title/description/OG values are ported
 * verbatim from the existing Blogger theme (ARCHITECTURE.md §2.1–2.3).
 * Other routes use neutral, factual copy — no invented claims. Values that
 * could not be verified are flagged for later confirmation, not guessed.
 */

import { SITE, COMPANY_SOCIALS } from "./site";

/**
 * Local, on-brand Open Graph card served from the app origin
 * (public/assets/cyvantas-og.jpg). Absolute URL as required by OG/Twitter.
 */
export const OG_IMAGE = `${SITE.url}/assets/cyvantas-og.jpg`;

/** Official CYVANTAS company X/Twitter handle (company identity, site-wide). */
export const TWITTER_SITE = "@cyvantas";

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
  privacy: {
    path: "/privacy",
    title: "Privacy Policy | CYVANTAS",
    description:
      "How CYVANTAS handles the information you share through this website and its contact form.",
  },
  terms: {
    path: "/terms",
    title: "Terms of Use | CYVANTAS",
    description: "The terms that govern your use of the CYVANTAS website.",
  },
  responsibleDisclosure: {
    path: "/responsible-disclosure",
    title: "Responsible Disclosure | CYVANTAS",
    description:
      "How to report a security vulnerability affecting CYVANTAS, and our coordinated disclosure approach.",
  },
  notFound: {
    path: "/404",
    title: "Page not found | CYVANTAS",
    description: "The page you are looking for could not be found.",
  },
} satisfies Record<string, RouteSeo>;

/**
 * Site-level JSON-LD (Organization + WebSite). Built only from verified facts
 * already present on the site — no reviews, ratings, awards, clients,
 * certifications or statistics. Serialized once on the homepage by <Seo>.
 */
export function buildSiteJsonLd() {
  const orgId = `${SITE.url}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE.name,
        url: SITE.url,
        email: SITE.contactEmail,
        description: HOME_DESCRIPTION,
        logo: `${SITE.url}/cyvantas-logo-light.png`,
        image: OG_IMAGE,
        founder: { "@type": "Person", name: SITE.founder },
        address: { "@type": "PostalAddress", addressCountry: "IN" },
        sameAs: COMPANY_SOCIALS.map((s) => s.href),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        name: SITE.name,
        url: SITE.url,
        description: HOME_DESCRIPTION,
        inLanguage: SITE.locale.replace("_", "-"),
        publisher: { "@id": orgId },
      },
    ],
  };
}
