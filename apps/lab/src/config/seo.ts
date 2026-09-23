/**
 * Per-route SEO metadata for the Security Lab. Neutral, factual copy — no
 * invented claims, statistics, or certifications (CLAUDE.md).
 */

import { SITE } from "./site";

/**
 * Local, on-brand Open Graph card served from the app origin
 * (public/assets/lab-og.jpg). Absolute URL as required by OG/Twitter.
 * NOTE: asset not yet added — create before production deploy.
 */
export const OG_IMAGE = `${SITE.url}/assets/lab-og.jpg`;

/** Personal handle from the CYVANTAS brand; company handle UNVERIFIED. */
export const TWITTER_SITE = "@Prajeesh_kc";

export interface RouteSeo {
  /** Route path; used to build the canonical URL. */
  path: string;
  title: string;
  description: string;
  /** Optional Open Graph title override (defaults to `title`). */
  ogTitle?: string;
}

export const ROUTE_SEO = {
  dashboard: {
    path: "/",
    title: "CYVANTAS Security Lab | Learn. Break. Defend.",
    description:
      "Hands-on security training: guided challenges, learning paths, CTF missions, and browser-based security tools.",
    ogTitle: "CYVANTAS Security Lab | Learn. Break. Defend.",
  },
  challenges: {
    path: "/challenges",
    title: "Challenges | CYVANTAS Security Lab",
    description:
      "Practise web, authentication, API, recon, and CTF security challenges in a controlled, educational environment.",
  },
  learning: {
    path: "/learning",
    title: "Learning Paths | CYVANTAS Security Lab",
    description:
      "Structured learning paths for building practical offensive and defensive security skills, sequencing concepts, walkthroughs, hands-on labs, and challenges.",
  },
  ctf: {
    path: "/ctf",
    title: "CTF Missions | CYVANTAS Security Lab",
    description:
      "Scenario-driven security missions that combine reconnaissance, analysis, exploitation concepts, and defensive validation inside controlled, authorized training environments.",
  },
  tools: {
    path: "/tools",
    title: "Security Tools | CYVANTAS Security Lab",
    description:
      "Browser-based educational security tools — decode tokens, encode data, and inspect requests locally.",
  },
  about: {
    path: "/about",
    title: "About | CYVANTAS Security Lab",
    description: "About the CYVANTAS Security Lab and its authorized, educational purpose.",
  },
  notFound: {
    path: "/404",
    title: "Page not found | CYVANTAS Security Lab",
    description: "The page you are looking for could not be found.",
  },
} satisfies Record<string, RouteSeo>;
