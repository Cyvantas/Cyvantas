/**
 * Homepage content — verified copy ported from the existing Blogger theme
 * (existing-blogger-theme.xml / ARCHITECTURE.md §2). No invented statistics,
 * certifications, testimonials, or clients. Presentational components consume
 * these typed models so a backend/CMS can replace them without UI changes.
 */
import { SITE } from "../config/site";

export type IconKey =
  | "target"
  | "globe"
  | "plug"
  | "network"
  | "phone"
  | "cloud"
  | "crosshair"
  | "sliders"
  | "eye"
  | "chat"
  | "gear"
  | "book";

export type ServicePhase = "ASSESS" | "ENGAGE" | "INTEL" | "ADVISE" | "BUILD";

export interface Service {
  id: string;
  icon: IconKey;
  phase: ServicePhase;
  title: string;
  summary: string;
  objective: string;
  coverage: string[];
}

export interface MethodologyStage {
  order: string;
  name: string;
  description: string;
  output: string;
  /** The exploit stage is authorized-scope only; flagged for emphasis. */
  highlight?: boolean;
}

export interface SurfaceLayer {
  order: string;
  title: string;
  description: string;
}

export interface Principle {
  id: string;
  title: string;
  description: string;
}

export interface Capability {
  icon: IconKey;
  title: string;
  sub: string;
}

export interface FounderSocial {
  label: string;
  href: string;
  handle: string;
}

// --- Hero -----------------------------------------------------------------

export const HERO = {
  status: "Security research active",
  kicker: "Offensive security & VAPT",
  /** Primary headline (ported verbatim from the live site). */
  headline: "Security beyond the surface.",
  /** Supporting philosophy line shown beneath the headline. */
  philosophy: "Find it. Understand it. Secure it.",
  lead:
    "CYVANTAS helps organizations uncover vulnerabilities, understand their real " +
    "attack surface, and build stronger defenses through offensive security, " +
    "penetration testing, vulnerability research, and adversarial intelligence.",
  facts: [
    "Six-stage methodology",
    "Evidence-driven findings",
    "Authorized-scope testing only",
  ],
  github: "https://github.com/Cyvantas",
} as const;

// --- Capabilities snapshot ------------------------------------------------

export const CAPABILITIES: Capability[] = [
  { icon: "target", title: "VAPT", sub: "Assessment" },
  { icon: "globe", title: "Web Security", sub: "Applications" },
  { icon: "plug", title: "API Security", sub: "REST · GraphQL" },
  { icon: "cloud", title: "Cloud Security", sub: "IAM · Storage · Network" },
  { icon: "phone", title: "Mobile Security", sub: "Android · iOS" },
  { icon: "network", title: "Network Security", sub: "Internal · External" },
  { icon: "crosshair", title: "Red Teaming", sub: "Adversary simulation" },
  { icon: "eye", title: "Threat Intelligence", sub: "OSINT · Exposure" },
];

// --- Services (12) --------------------------------------------------------

export const SERVICES: Service[] = [
  {
    id: "SVC-01",
    icon: "target",
    phase: "ASSESS",
    title: "Vulnerability Assessment & Penetration Testing",
    summary:
      "Simulated attacks against your systems to uncover exploitable vulnerabilities before adversaries do.",
    objective: "Identify and validate exploitable weaknesses",
    coverage: [
      "Asset and exposure discovery",
      "Manual testing that goes beyond scanner output",
      "Validated findings with remediation guidance",
    ],
  },
  {
    id: "SVC-02",
    icon: "globe",
    phase: "ASSESS",
    title: "Web Application Security Testing",
    summary:
      "In-depth testing of web applications for logic flaws and common vulnerability classes.",
    objective: "Harden applications against real-world exploitation",
    coverage: [
      "Authentication and session handling",
      "Access-control and business-logic flaws",
      "Injection and client-side vulnerability classes",
    ],
  },
  {
    id: "SVC-03",
    icon: "plug",
    phase: "ASSESS",
    title: "API Security Testing",
    summary:
      "Assessment of REST, GraphQL, and internal APIs for authentication and data-exposure flaws.",
    objective: "Close gaps in API access control and data handling",
    coverage: [
      "Authentication and object-level authorization",
      "Excessive data exposure and mass assignment",
      "Input handling and abuse resistance",
    ],
  },
  {
    id: "SVC-04",
    icon: "network",
    phase: "ASSESS",
    title: "Network Security Assessment",
    summary:
      "Evaluation of internal and external network architecture, segmentation, and exposed services.",
    objective: "Reduce the network's exploitable attack surface",
    coverage: [
      "External exposure and service enumeration",
      "Segmentation and internal trust",
      "Protocol and configuration weaknesses",
    ],
  },
  {
    id: "SVC-05",
    icon: "phone",
    phase: "ASSESS",
    title: "Mobile Application Security",
    summary:
      "Static and dynamic analysis of Android and iOS applications and their backends.",
    objective: "Secure mobile clients against reverse engineering and data leakage",
    coverage: [
      "Android and iOS static and dynamic analysis",
      "Local storage and transport security",
      "Backend API interaction",
    ],
  },
  {
    id: "SVC-06",
    icon: "cloud",
    phase: "ASSESS",
    title: "Cloud Security Assessment",
    summary:
      "Review of cloud infrastructure configuration across identity, storage, and network controls.",
    objective: "Eliminate cloud misconfigurations before attackers find them",
    coverage: [
      "Identity and privilege paths",
      "Storage exposure and network controls",
      "Configuration against hardening baselines",
    ],
  },
  {
    id: "SVC-07",
    icon: "crosshair",
    phase: "ENGAGE",
    title: "Red Teaming & Adversary Simulation",
    summary: "Objective-driven simulated attacks that mirror real adversary tradecraft.",
    objective: "Test detection and response under realistic conditions",
    coverage: [
      "Objective-based attack scenarios",
      "Adversary tradecraft within an agreed scope",
      "Detection and response observations",
    ],
  },
  {
    id: "SVC-08",
    icon: "sliders",
    phase: "ASSESS",
    title: "Security Configuration Review",
    summary:
      "Manual review of system, application, and device configurations against hardening baselines.",
    objective: "Close configuration gaps automated scans miss",
    coverage: [
      "Operating system, application and device settings",
      "Comparison against hardening baselines",
      "Prioritized hardening guidance",
    ],
  },
  {
    id: "SVC-09",
    icon: "eye",
    phase: "INTEL",
    title: "OSINT & Threat Intelligence",
    summary: "Mapping of publicly exposed information and organizational digital footprint.",
    objective: "Understand what adversaries can see before they act",
    coverage: [
      "Exposed domains, subdomains and services",
      "Publicly available information about the organization",
      "An adversary's-eye view of your footprint",
    ],
  },
  {
    id: "SVC-10",
    icon: "chat",
    phase: "ADVISE",
    title: "Cybersecurity Consulting",
    summary: "Strategic guidance on security posture, roadmaps, and risk prioritization.",
    objective: "Align security investment with actual risk",
    coverage: [
      "Security posture review",
      "Risk prioritization and roadmap",
      "Secure design guidance",
    ],
  },
  {
    id: "SVC-11",
    icon: "gear",
    phase: "BUILD",
    title: "Security Automation",
    summary: "Custom tooling and scripts to streamline recurring security workflows.",
    objective: "Make security testing faster and more consistent",
    coverage: [
      "Custom scripts and tooling",
      "Repeatable testing workflows",
      "Automating recurring security tasks",
    ],
  },
  {
    id: "SVC-12",
    icon: "book",
    phase: "ADVISE",
    title: "Security Awareness & Best Practices",
    summary:
      "Practical guidance and training to build security-conscious habits across teams.",
    objective: "Reduce human-factor risk across the organization",
    coverage: [
      "Practical, role-relevant guidance",
      "Secure everyday habits for teams",
      "Best-practice briefings",
    ],
  },
];

// --- Methodology (6 stages) ----------------------------------------------

export const METHODOLOGY: MethodologyStage[] = [
  {
    order: "01",
    name: "Discover",
    description: "Identify assets, applications, infrastructure and attack surface.",
    output: "Asset & exposure inventory",
  },
  {
    order: "02",
    name: "Map",
    description:
      "Understand technologies, trust boundaries, exposed services and potential attack paths.",
    output: "Attack-path hypotheses",
  },
  {
    order: "03",
    name: "Test",
    description: "Perform controlled offensive security testing.",
    output: "Candidate findings",
  },
  {
    order: "04",
    name: "Validate",
    description: "Confirm vulnerabilities and eliminate false positives.",
    output: "Confirmed findings",
  },
  {
    order: "05",
    name: "Exploit",
    description: "Where authorized, demonstrate realistic impact safely.",
    output: "Evidence of impact",
    highlight: true,
  },
  {
    order: "06",
    name: "Remediate",
    description: "Provide actionable remediation guidance and validation.",
    output: "Fix guidance & retest",
  },
];

// --- Attack surface (9 layers) -------------------------------------------

export const SURFACE_INTRO =
  "A weakness rarely matters in isolation. What matters is the path an attacker " +
  "can chain from the internet to something you care about.";

export const SURFACE_LAYERS: SurfaceLayer[] = [
  { order: "01", title: "Internet", description: "Everything reachable from the outside." },
  { order: "02", title: "Domains", description: "Registered names, DNS records and ownership." },
  {
    order: "03",
    title: "Subdomains",
    description: "Forgotten, staging and takeover-prone hosts.",
  },
  {
    order: "04",
    title: "Web Applications",
    description: "Logic, sessions and access control.",
  },
  {
    order: "05",
    title: "APIs",
    description: "Authentication, authorization and data exposure.",
  },
  {
    order: "06",
    title: "Cloud Infrastructure",
    description: "Identity policies, storage and network rules.",
  },
  {
    order: "07",
    title: "Endpoints",
    description: "Exposed services, devices and mobile clients.",
  },
  {
    order: "08",
    title: "Identity",
    description: "Accounts, tokens, SSO and privilege paths.",
  },
  {
    order: "09",
    title: "Third-Party Dependencies",
    description: "Vendors, libraries and integrations you inherit.",
  },
];

// --- Principles (Why CYVANTAS) -------------------------------------------

export const PRINCIPLES: Principle[] = [
  {
    id: "P-01",
    title: "Evidence Driven",
    description:
      "Findings should be supported by technical evidence — reproducible steps and proof, not scanner output alone.",
  },
  {
    id: "P-02",
    title: "Attack-Path Thinking",
    description:
      "Don't look at vulnerabilities in isolation. Chained together, small weaknesses become real routes into a system.",
  },
  {
    id: "P-03",
    title: "Real-World Validation",
    description: "Prioritize understanding actual security impact over theoretical severity.",
  },
  {
    id: "P-04",
    title: "Research Mindset",
    description: "Continuously investigate emerging vulnerabilities and attack techniques.",
  },
  {
    id: "P-05",
    title: "Actionable Reporting",
    description:
      "Security reports should help engineering teams fix problems, with clear priorities and steps.",
  },
];

// --- About ----------------------------------------------------------------

export const ABOUT = {
  title:
    "A cybersecurity brand built around one question: where are you actually exposed?",
  paragraph:
    "CYVANTAS is an offensive-security-focused cybersecurity organization. We work " +
    "from the attacker's perspective to give organizations a realistic view of their " +
    "risk, then translate that view into practical steps toward a stronger security posture.",
  points: [
    "Finding real attack paths, not just isolated issues",
    "Understanding exposure across applications, APIs, cloud and identity",
    "Validating vulnerabilities to remove false positives",
    "Reducing attack surface with concrete remediation steps",
    "Producing actionable security intelligence for engineering teams",
  ],
  philosophy: "Find it. Understand it. Secure it.",
  spec: [
    { label: "Focus", value: "Offensive Security" },
    { label: "Specialization", value: "VAPT / Application Security" },
    { label: "Research", value: "Vulnerability Research" },
    { label: "Approach", value: "Evidence Driven" },
    { label: "Mission", value: "Reduce Real-World Exposure" },
    { label: "Based in", value: SITE.basedIn },
    { label: "Contact", value: SITE.contactEmail, accent: true },
  ] as { label: string; value: string; accent?: boolean }[],
} as const;

// --- Research -------------------------------------------------------------

export const RESEARCH = {
  intro:
    "Vulnerability research, writeups, advisories and technical articles. New posts " +
    "appear here as they are published.",
  categories: [
    "Vulnerability Research",
    "Web Security",
    "API Security",
    "Cloud Security",
    "Mobile Security",
    "Offensive Security",
    "Threat Intelligence",
    "Tools",
  ],
  /**
   * Research navigation. Vulnerability Research / Security Advisories resolve
   * to the in-app /research route; Frameworks / Resources are homepage anchors.
   * `external` controls target/rel and the outbound-link affordance.
   */
  links: [
    { label: "Vulnerability Research", href: "/research", external: false },
    { label: "Security Advisories", href: "/research", external: false },
    { label: "Frameworks", href: "#frameworks", external: false },
    { label: "Resources", href: "#frameworks", external: false },
  ] as { label: string; href: string; external: boolean }[],
} as const;

// --- Security Lab bridge --------------------------------------------------

export const LAB = {
  tagline: "Learn. Break. Defend.",
  lead:
    "CYVANTAS Security Lab is a hands-on environment for offensive-security practice — " +
    "challenges, guided learning, CTF and browser-based security tools. Everything is " +
    "designed for authorized, educational use.",
  areas: ["Challenges", "Learning", "CTF", "Security Tools"],
  href: SITE.labUrl,
} as const;

// --- Founder --------------------------------------------------------------

export const FOUNDER = {
  name: SITE.founder,
  role: "Founder / Cybersecurity Researcher",
  /**
   * Verified founder portrait, vendored from the existing Blogger site
   * (blogger.googleusercontent.com reference in existing-blogger-theme.xml)
   * into apps/main/public/. Served from the app origin, not hotlinked.
   */
  photo: {
    src: "/founder-prajeesh-kc.jpg",
    alt: "Portrait of Prajeesh KC",
    width: 512,
    height: 512,
  },
  bio: [
    "Prajeesh founded CYVANTAS to bring an offensive-security perspective to " +
      "organizations navigating an increasingly complex threat landscape. His work " +
      "centers on vulnerability research, security tooling, and workflow automation, " +
      "with an ongoing interest in open-source development.",
    "He shares security research, tooling, and technical writing through CYVANTAS and " +
      "maintains open-source projects on GitHub.",
  ],
  focus: [
    "Cybersecurity",
    "Offensive security",
    "Vulnerability research",
    "Security automation",
    "Open-source tooling",
  ],
  socials: [
    { label: "GitHub", href: "https://github.com/kcprajeesh", handle: "kcprajeesh" },
    { label: "X", href: "https://x.com/Prajeesh_kc", handle: "@Prajeesh_kc" },
    { label: "Instagram", href: "https://instagram.com/Prajeesh_kc", handle: "@Prajeesh_kc" },
  ] as FounderSocial[],
} as const;

// --- Contact --------------------------------------------------------------

export const CONTACT = {
  title: "Let's secure what matters.",
  lead:
    "Tell us about your environment and what you need assessed. We'll follow up to " +
    "scope the engagement.",
  topics: [
    "VAPT",
    "Application security",
    "API security",
    "Cloud security",
    "Red teaming",
    "Security assessments",
    "Vulnerability research",
  ],
  /** Service dropdown options (ported from the live contact form). */
  services: [
    "Vulnerability Assessment & Penetration Testing",
    "Web Application Security",
    "API Security Testing",
    "Network Security Assessment",
    "Mobile Application Security",
    "Cloud Security Assessment",
    "Red Teaming & Adversary Simulation",
    "Security Configuration Review",
    "OSINT & Threat Intelligence",
    "Cybersecurity Consulting",
    "Security Automation",
    "Security Awareness & Best Practices",
    "Vulnerability research",
    "Not sure yet",
  ],
  /** Timeline dropdown options (ported from the live contact form). */
  timelines: ["Flexible", "Within 1 month", "1–3 months", "3+ months"],
  email: SITE.contactEmail,
  privacy:
    "We only use the details you share here to respond to your inquiry. Your " +
    "information is never sold or shared with third parties.",
} as const;

// --- Frameworks & references ---------------------------------------------

export interface Framework {
  name: string;
  description: string;
  href: string;
  display: string;
}

export const FRAMEWORKS_INTRO =
  "CYVANTAS uses established industry frameworks as a reference baseline for testing " +
  "and reporting. These are external resources published by their respective organizations.";

export const FRAMEWORKS: Framework[] = [
  {
    name: "OWASP Top 10",
    description:
      "Community-driven awareness document for the most critical web application security risks.",
    href: "https://owasp.org/www-project-top-ten/",
    display: "owasp.org",
  },
  {
    name: "OWASP API Security",
    description: "The top API-specific security risks and how to test for them.",
    href: "https://owasp.org/API-Security/",
    display: "owasp.org/API-Security",
  },
  {
    name: "NIST Cybersecurity Framework",
    description:
      "Guidance for understanding, assessing and improving cybersecurity risk management.",
    href: "https://www.nist.gov/cyberframework",
    display: "nist.gov/cyberframework",
  },
  {
    name: "MITRE ATT&CK",
    description: "A knowledge base of real-world adversary tactics and techniques.",
    href: "https://attack.mitre.org/",
    display: "attack.mitre.org",
  },
  {
    name: "CVE / NVD",
    description:
      "The CVE program and the National Vulnerability Database of public vulnerability records.",
    href: "https://nvd.nist.gov/",
    display: "nvd.nist.gov",
  },
];

/** OWASP Top 10:2025 categories (reference list from the live site). */
export const OWASP_TOP_TEN: { id: string; name: string }[] = [
  { id: "A01", name: "Broken Access Control" },
  { id: "A02", name: "Security Misconfiguration" },
  { id: "A03", name: "Software Supply Chain Failures" },
  { id: "A04", name: "Cryptographic Failures" },
  { id: "A05", name: "Injection" },
  { id: "A06", name: "Insecure Design" },
  { id: "A07", name: "Authentication Failures" },
  { id: "A08", name: "Software or Data Integrity Failures" },
  { id: "A09", name: "Security Logging & Alerting Failures" },
  { id: "A10", name: "Mishandling of Exceptional Conditions" },
];

export const FRAMEWORKS_NOTE =
  "Referencing a framework does not imply certification by, or affiliation with, the " +
  "organizations that publish them.";

// --- Projects & open source ----------------------------------------------

export interface Project {
  title: string;
  description: string;
  tag: "Project" | "Category";
  href: string;
  cta: string;
}

export const PROJECTS_INTRO =
  "CYVANTAS security tooling and research is developed in the open. Repositories, " +
  "scripts and utilities are published on GitHub as they are ready.";

export const PROJECTS: Project[] = [
  {
    title: "Vibe Pentesterlab",
    description: "A CYVANTAS project. Details and source are published on GitHub.",
    tag: "Project",
    href: "https://github.com/Cyvantas",
    cta: "View on GitHub",
  },
  {
    title: "CYVANTAS AI Agent",
    description: "A CYVANTAS project. Details and source are published on GitHub.",
    tag: "Project",
    href: "https://github.com/Cyvantas",
    cta: "View on GitHub",
  },
  {
    title: "Security automation tools",
    description:
      "Custom tooling and scripts that streamline recurring security workflows.",
    tag: "Category",
    href: "https://github.com/Cyvantas",
    cta: "Browse repositories",
  },
  {
    title: "Research tooling",
    description: "Utilities that support vulnerability research and technical writing.",
    tag: "Category",
    href: "https://github.com/Cyvantas",
    cta: "Browse repositories",
  },
];

export const PROJECTS_DISCLAIMER =
  "Only use security tools against systems you own or are explicitly authorized to test.";
