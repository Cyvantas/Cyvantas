/**
 * Copy and structure for the Lab dashboard. Kept data-driven so the route
 * composes reusable cards without hardcoded markup.
 */

export type AreaIcon = "target" | "book" | "flag" | "wrench";

export interface LabArea {
  icon: AreaIcon;
  title: string;
  description: string;
  to: string;
  cta: string;
}

export const DASHBOARD_HERO = {
  eyebrow: "Security Lab",
  title: "Learn. Break. Defend.",
  description:
    "A hands-on environment for authorized, educational security practice. Work through guided challenges, follow structured learning paths, take on CTF missions, and use browser-based security tools.",
} as const;

export const LAB_AREAS: LabArea[] = [
  {
    icon: "target",
    title: "Challenges",
    description:
      "Practise realistic web, authentication, API, and recon vulnerabilities in a controlled environment.",
    to: "/challenges",
    cta: "Browse challenges",
  },
  {
    icon: "book",
    title: "Learning",
    description:
      "Structured paths that build offensive and defensive skills step by step, from fundamentals up.",
    to: "/learning",
    cta: "Start learning",
  },
  {
    icon: "flag",
    title: "CTF",
    description:
      "Capture-the-flag style missions that combine multiple techniques into a single objective.",
    to: "/ctf",
    cta: "View CTF",
  },
  {
    icon: "wrench",
    title: "Security Tools",
    description:
      "Browser-based utilities — decode tokens, encode data, and inspect requests, all processed locally.",
    to: "/tools",
    cta: "Open tools",
  },
];
