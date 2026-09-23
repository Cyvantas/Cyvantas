import type { LearningPath } from "../models/learning"

/**
 * Initial learning-path catalogue. Frontend-only for now: paths reference
 * existing challenges and tools by slug so no content is duplicated and a
 * backend can serve the same shapes later. No fake statistics, learner
 * counts, certifications, or completion data (CLAUDE.md).
 */
export const learningPaths: LearningPath[] = [
  {
    id: "path-web-fundamentals",
    slug: "web-security-fundamentals",
    title: "Web Security Fundamentals",
    shortDescription:
      "The core concepts every web security practitioner needs before testing anything.",
    description:
      "Build a solid mental model of how the web works and where it breaks. This path covers the request/response lifecycle, the browser security model, and how to read the security headers that protect real applications — the groundwork for every other path.",
    category: "fundamentals",
    difficulty: "beginner",
    estimatedMinutes: 120,
    prerequisites: [],
    learningObjectives: [
      "Explain the HTTP request/response lifecycle",
      "Describe the same-origin policy and why it matters",
      "Recognise the trust boundaries in a web application",
      "Read common HTTP security response headers",
    ],
    modules: [
      {
        id: "web-fundamentals-m1",
        pathId: "path-web-fundamentals",
        title: "How the web works",
        description:
          "The moving parts behind every page load: requests, responses, origins, and transport security.",
        estimatedMinutes: 40,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "web-fundamentals-m1-l1",
            title: "The HTTP request/response lifecycle",
            summary:
              "Follow a request from the browser to the server and back, and see where security decisions are made.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "web-fundamentals-m1-l2",
            title: "Origins and the same-origin policy",
            summary:
              "Understand how the browser isolates sites from one another and why so many flaws are attempts to cross that boundary.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 2,
          },
          {
            id: "web-fundamentals-m1-l3",
            title: "Transport security with TLS",
            summary:
              "What HTTPS does and does not protect, and how to reason about data in transit.",
            contentType: "concept",
            estimatedMinutes: 10,
            order: 3,
          },
        ],
      },
      {
        id: "web-fundamentals-m2",
        pathId: "path-web-fundamentals",
        title: "The tester's mindset",
        description:
          "How to think about trust boundaries and set the ground rules for authorized testing.",
        estimatedMinutes: 40,
        order: 2,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "web-fundamentals-m2-l1",
            title: "Threat modelling basics",
            summary:
              "Identify assets, entry points, and the trust boundaries an attacker would target first.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "web-fundamentals-m2-l2",
            title: "Mapping trust boundaries",
            summary:
              "Walk through a sample application and annotate where user-controlled data crosses a boundary.",
            contentType: "walkthrough",
            estimatedMinutes: 15,
            order: 2,
          },
          {
            id: "web-fundamentals-m2-l3",
            title: "Ground rules for authorized testing",
            summary:
              "A checklist for staying in scope: test only systems you own or are explicitly authorized to test.",
            contentType: "checklist",
            estimatedMinutes: 10,
            order: 3,
          },
        ],
      },
      {
        id: "web-fundamentals-m3",
        pathId: "path-web-fundamentals",
        title: "Reading security headers",
        description:
          "The response headers that harden a site, and how to inspect them with the Security Headers Analyzer.",
        estimatedMinutes: 40,
        order: 3,
        challengeSlugs: [],
        toolSlugs: ["headers"],
        lessons: [
          {
            id: "web-fundamentals-m3-l1",
            title: "What security headers protect against",
            summary:
              "Tour the headers that mitigate clickjacking, MIME sniffing, and protocol downgrade.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "web-fundamentals-m3-l2",
            title: "Analyze a set of response headers",
            summary:
              "Paste sample response headers into the Security Headers Analyzer and interpret the findings.",
            contentType: "lab",
            estimatedMinutes: 20,
            order: 2,
          },
        ],
      },
    ],
    relatedChallenges: [],
    relatedTools: ["headers"],
    status: "available",
    order: 1,
  },
  {
    id: "path-recon",
    slug: "reconnaissance-attack-surface",
    title: "Reconnaissance & Attack Surface",
    shortDescription:
      "Map an application's attack surface before testing a single input.",
    description:
      "Effective testing starts with knowing what exists. This path covers passive and active reconnaissance techniques for enumerating an application's attack surface — always within the bounds of an authorized engagement.",
    category: "recon",
    difficulty: "beginner",
    estimatedMinutes: 70,
    prerequisites: ["web-security-fundamentals"],
    learningObjectives: [
      "Distinguish passive from active reconnaissance",
      "Enumerate an application's visible attack surface",
      "Record findings in a structured, repeatable way",
    ],
    modules: [
      {
        id: "recon-m1",
        pathId: "path-recon",
        title: "Passive reconnaissance",
        description:
          "Gather information without touching the target directly.",
        estimatedMinutes: 35,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "recon-m1-l1",
            title: "What passive recon can reveal",
            summary:
              "Understand the footprint an application leaves in public sources and why it matters.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "recon-m1-l2",
            title: "Building an asset inventory",
            summary:
              "Organise discovered hosts, endpoints, and technologies into a working inventory.",
            contentType: "checklist",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
      {
        id: "recon-m2",
        pathId: "path-recon",
        title: "Active mapping",
        description:
          "Interact with an authorized target to enumerate its endpoints and behaviour.",
        estimatedMinutes: 35,
        order: 2,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "recon-m2-l1",
            title: "Enumerating endpoints and parameters",
            summary:
              "Walk through mapping the routes, parameters, and responses of a sample application you are authorized to test.",
            contentType: "walkthrough",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "recon-m2-l2",
            title: "Prioritising the attack surface",
            summary:
              "Turn a raw inventory into a ranked list of areas worth deeper testing.",
            contentType: "review",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
    ],
    relatedChallenges: [],
    relatedTools: [],
    status: "available",
    order: 2,
  },
  {
    id: "path-auth-jwt",
    slug: "authentication-jwt-security",
    title: "Authentication & JWT Security",
    shortDescription:
      "How session and token authentication work, and where JWT implementations go wrong.",
    description:
      "Authentication is where many applications first break. This path compares session and token-based authentication, dissects the structure of a JSON Web Token, and examines algorithm-confusion weaknesses using the local JWT Decoder and a hands-on challenge.",
    category: "authentication",
    difficulty: "intermediate",
    estimatedMinutes: 110,
    prerequisites: ["reconnaissance-attack-surface"],
    learningObjectives: [
      "Compare session-based and token-based authentication",
      "Decompose a JWT into header, payload, and signature",
      "Explain how weak algorithm validation creates a bypass",
      "Recommend hardening measures for token authentication",
    ],
    modules: [
      {
        id: "auth-jwt-m1",
        pathId: "path-auth-jwt",
        title: "Sessions and tokens",
        description:
          "The two dominant models for keeping a user authenticated, and their trade-offs.",
        estimatedMinutes: 35,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "auth-jwt-m1-l1",
            title: "Session vs token authentication",
            summary:
              "Understand server-side sessions and stateless tokens, and when each is used.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "auth-jwt-m1-l2",
            title: "Anatomy of a JWT",
            summary:
              "Break a JSON Web Token into its header, payload, and signature segments.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
      {
        id: "auth-jwt-m2",
        pathId: "path-auth-jwt",
        title: "JWT weaknesses",
        description:
          "Inspect real tokens and understand how algorithm confusion undermines verification.",
        estimatedMinutes: 45,
        order: 2,
        challengeSlugs: ["jwt-algorithm-confusion"],
        toolSlugs: ["jwt"],
        lessons: [
          {
            id: "auth-jwt-m2-l1",
            title: "Inspecting a token with the JWT Decoder",
            summary:
              "Use the local JWT Decoder to read a token's header and payload without verifying the signature.",
            contentType: "lab",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "auth-jwt-m2-l2",
            title: "Understanding algorithm confusion",
            summary:
              "See how a server that trusts the token's declared algorithm can be tricked into accepting a forged signature.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 2,
          },
          {
            id: "auth-jwt-m2-l3",
            title: "Challenge: JWT algorithm confusion",
            summary:
              "Apply the concept in a controlled challenge that walks through identifying unsafe algorithm validation.",
            contentType: "challenge",
            estimatedMinutes: 15,
            order: 3,
          },
        ],
      },
      {
        id: "auth-jwt-m3",
        pathId: "path-auth-jwt",
        title: "Hardening authentication",
        description:
          "Turn the weaknesses you have seen into concrete defensive recommendations.",
        estimatedMinutes: 30,
        order: 3,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "auth-jwt-m3-l1",
            title: "Token validation checklist",
            summary:
              "A checklist for validating algorithms, expiry, audience, and signing keys correctly.",
            contentType: "checklist",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "auth-jwt-m3-l2",
            title: "Review: what good authentication looks like",
            summary:
              "Consolidate the path into a mental checklist you can apply to any authentication flow.",
            contentType: "review",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
    ],
    relatedChallenges: ["jwt-algorithm-confusion"],
    relatedTools: ["jwt"],
    status: "available",
    order: 3,
  },
  {
    id: "path-access-control",
    slug: "access-control-idor",
    title: "Access Control & IDOR",
    shortDescription:
      "Why authorization fails and how insecure direct object references expose data.",
    description:
      "Broken access control is consistently among the most impactful web weaknesses. This path covers access-control models, then focuses on insecure direct object references (IDOR) through a hands-on challenge, before turning to enforcement patterns that hold up.",
    category: "access-control",
    difficulty: "intermediate",
    estimatedMinutes: 90,
    prerequisites: ["authentication-jwt-security"],
    learningObjectives: [
      "Distinguish authentication from authorization",
      "Explain common access-control models",
      "Identify an insecure direct object reference",
      "Describe object-level authorization enforcement",
    ],
    modules: [
      {
        id: "access-control-m1",
        pathId: "path-access-control",
        title: "Access-control models",
        description:
          "The models applications use to decide who may do what, and how they are misconfigured.",
        estimatedMinutes: 30,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "access-control-m1-l1",
            title: "Authentication vs authorization",
            summary:
              "Separate proving identity from deciding permissions — conflating the two causes real bugs.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "access-control-m1-l2",
            title: "Role and object-level access control",
            summary:
              "Compare role-based checks with object-level checks and see where each is needed.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
      {
        id: "access-control-m2",
        pathId: "path-access-control",
        title: "Finding IDOR",
        description:
          "Trace object identifiers through requests and test authorization boundaries safely.",
        estimatedMinutes: 40,
        order: 2,
        challengeSlugs: ["idor"],
        toolSlugs: [],
        lessons: [
          {
            id: "access-control-m2-l1",
            title: "Spotting object identifiers in requests",
            summary:
              "Walk through identifying the IDs an application exposes and how they map to resources.",
            contentType: "walkthrough",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "access-control-m2-l2",
            title: "Challenge: insecure direct object reference",
            summary:
              "Work through a controlled IDOR challenge to verify authorization behaviour across users.",
            contentType: "challenge",
            estimatedMinutes: 20,
            order: 2,
          },
        ],
      },
      {
        id: "access-control-m3",
        pathId: "path-access-control",
        title: "Enforcing authorization",
        description:
          "Patterns that make object-level authorization the default rather than an afterthought.",
        estimatedMinutes: 20,
        order: 3,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "access-control-m3-l1",
            title: "Authorization enforcement checklist",
            summary:
              "A checklist for verifying every object access against the current user's permissions.",
            contentType: "checklist",
            estimatedMinutes: 20,
            order: 1,
          },
        ],
      },
    ],
    relatedChallenges: ["idor"],
    relatedTools: [],
    status: "available",
    order: 4,
  },
  {
    id: "path-xss",
    slug: "cross-site-scripting",
    title: "Cross-Site Scripting",
    shortDescription:
      "The three classes of XSS, how to find reflected XSS, and how to defend against all of them.",
    description:
      "Cross-site scripting remains one of the most common web weaknesses. This path distinguishes reflected, stored, and DOM-based XSS, walks through identifying reflected XSS in a controlled challenge, and covers output encoding and Content-Security-Policy as defences.",
    category: "web",
    difficulty: "intermediate",
    estimatedMinutes: 100,
    prerequisites: ["web-security-fundamentals"],
    learningObjectives: [
      "Distinguish reflected, stored, and DOM-based XSS",
      "Trace user-controlled input to a reflection point",
      "Validate a reflected XSS finding safely",
      "Apply output encoding and CSP as defences",
    ],
    modules: [
      {
        id: "xss-m1",
        pathId: "path-xss",
        title: "XSS foundations",
        description:
          "What cross-site scripting is and the three main classes you will encounter.",
        estimatedMinutes: 30,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "xss-m1-l1",
            title: "Reflected, stored, and DOM-based XSS",
            summary:
              "Understand how each class differs by where untrusted input enters and executes.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "xss-m1-l2",
            title: "Why XSS matters",
            summary:
              "See the impact of script execution in a victim's session and why it is high severity.",
            contentType: "concept",
            estimatedMinutes: 10,
            order: 2,
          },
        ],
      },
      {
        id: "xss-m2",
        pathId: "path-xss",
        title: "Finding reflected XSS",
        description:
          "Trace user input to where it is reflected and confirm the finding in a controlled challenge.",
        estimatedMinutes: 40,
        order: 2,
        challengeSlugs: ["reflected-xss"],
        toolSlugs: [],
        lessons: [
          {
            id: "xss-m2-l1",
            title: "Tracing user-controlled input",
            summary:
              "Walk through following input from entry point to the location where it is reflected into HTML.",
            contentType: "walkthrough",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "xss-m2-l2",
            title: "Challenge: reflected XSS",
            summary:
              "Identify and safely validate a reflected XSS vulnerability in a controlled application.",
            contentType: "challenge",
            estimatedMinutes: 20,
            order: 2,
          },
        ],
      },
      {
        id: "xss-m3",
        pathId: "path-xss",
        title: "Defending against XSS",
        description:
          "Output encoding and Content-Security-Policy, built hands-on with the CSP Builder.",
        estimatedMinutes: 30,
        order: 3,
        challengeSlugs: [],
        toolSlugs: ["csp"],
        lessons: [
          {
            id: "xss-m3-l1",
            title: "Output encoding as the primary defence",
            summary:
              "Learn why context-aware output encoding stops most XSS at the source.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "xss-m3-l2",
            title: "Build a CSP as defence in depth",
            summary:
              "Use the CSP Builder to compose a Content-Security-Policy that limits script execution.",
            contentType: "lab",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
    ],
    relatedChallenges: ["reflected-xss"],
    relatedTools: ["csp"],
    status: "available",
    order: 5,
  },
  {
    id: "path-api-security",
    slug: "api-security",
    title: "API Security",
    shortDescription:
      "The API attack surface, how to inspect API traffic, and the flaws that recur across APIs.",
    description:
      "Modern applications are driven by APIs, and APIs fail in their own characteristic ways. This path maps the API attack surface, uses the JSON Formatter and URL Encoder to inspect traffic locally, and covers recurring flaws such as broken object-level authorization and mass assignment.",
    category: "api",
    difficulty: "intermediate",
    estimatedMinutes: 100,
    prerequisites: ["authentication-jwt-security", "access-control-idor"],
    learningObjectives: [
      "Map the attack surface of REST and GraphQL APIs",
      "Inspect and reformat API traffic locally",
      "Recognise broken object-level authorization in APIs",
      "Explain mass assignment and excessive data exposure",
    ],
    modules: [
      {
        id: "api-security-m1",
        pathId: "path-api-security",
        title: "API attack surface",
        description:
          "Where APIs expose functionality and how their surface differs from traditional pages.",
        estimatedMinutes: 35,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "api-security-m1-l1",
            title: "REST and GraphQL surfaces",
            summary:
              "Compare how REST and GraphQL expose operations and where each concentrates risk.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "api-security-m1-l2",
            title: "Enumerating API endpoints",
            summary:
              "Walk through discovering the operations an authorized API exposes and their parameters.",
            contentType: "walkthrough",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
      {
        id: "api-security-m2",
        pathId: "path-api-security",
        title: "Inspecting API traffic",
        description:
          "Use local tools to make API requests and responses readable while you test.",
        estimatedMinutes: 35,
        order: 2,
        challengeSlugs: [],
        toolSlugs: ["json", "url"],
        lessons: [
          {
            id: "api-security-m2-l1",
            title: "Reading responses with the JSON Formatter",
            summary:
              "Use the JSON Formatter to validate and pretty-print API responses locally.",
            contentType: "lab",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "api-security-m2-l2",
            title: "Encoding parameters with the URL tool",
            summary:
              "Use the URL Encoder/Decoder to build and inspect encoded query parameters correctly.",
            contentType: "lab",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
      {
        id: "api-security-m3",
        pathId: "path-api-security",
        title: "Common API flaws",
        description:
          "The authorization and data-exposure flaws that show up across API implementations.",
        estimatedMinutes: 30,
        order: 3,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "api-security-m3-l1",
            title: "Broken object-level authorization",
            summary:
              "See how APIs repeat the IDOR pattern at scale and why per-object checks matter.",
            contentType: "concept",
            estimatedMinutes: 15,
            order: 1,
          },
          {
            id: "api-security-m3-l2",
            title: "Mass assignment and excessive data exposure",
            summary:
              "A checklist for spotting over-permissive binding and responses that leak more than intended.",
            contentType: "checklist",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
    ],
    relatedChallenges: ["idor"],
    relatedTools: ["json", "url"],
    status: "available",
    order: 6,
  },
  {
    id: "path-secure-testing",
    slug: "secure-web-application-testing",
    title: "Secure Web Application Testing",
    shortDescription:
      "Bring the earlier paths together into a repeatable, authorized testing methodology.",
    description:
      "The capstone path. Combine everything from the earlier paths into a structured methodology — Discover, Map, Test, Validate, Exploit, Remediate — and practise scoping, executing, and reporting an authorized assessment end to end.",
    category: "testing",
    difficulty: "advanced",
    estimatedMinutes: 130,
    prerequisites: [
      "web-security-fundamentals",
      "reconnaissance-attack-surface",
      "authentication-jwt-security",
      "access-control-idor",
      "cross-site-scripting",
      "api-security",
    ],
    learningObjectives: [
      "Define scope and authorization for an assessment",
      "Apply the Discover → Map → Test → Validate → Exploit → Remediate methodology",
      "Combine multiple techniques into a single assessment",
      "Write a clear, actionable findings report",
    ],
    modules: [
      {
        id: "secure-testing-m1",
        pathId: "path-secure-testing",
        title: "Building a test plan",
        description:
          "Scope, authorization, and rules of engagement — the non-negotiable groundwork.",
        estimatedMinutes: 40,
        order: 1,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "secure-testing-m1-l1",
            title: "Scope and authorization",
            summary:
              "Define exactly what is in scope and confirm authorization before any testing begins.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "secure-testing-m1-l2",
            title: "Rules of engagement checklist",
            summary:
              "A checklist covering scope, timing, data handling, and escalation for an authorized engagement.",
            contentType: "checklist",
            estimatedMinutes: 20,
            order: 2,
          },
        ],
      },
      {
        id: "secure-testing-m2",
        pathId: "path-secure-testing",
        title: "Executing the methodology",
        description:
          "Work the six stages against an authorized target, reusing skills from earlier paths.",
        estimatedMinutes: 50,
        order: 2,
        challengeSlugs: ["reflected-xss", "idor", "jwt-algorithm-confusion"],
        toolSlugs: ["headers", "jwt", "json"],
        lessons: [
          {
            id: "secure-testing-m2-l1",
            title: "Discover, map, and test",
            summary:
              "Walk the first three stages: enumerate the surface, model it, and probe for weaknesses.",
            contentType: "walkthrough",
            estimatedMinutes: 25,
            order: 1,
          },
          {
            id: "secure-testing-m2-l2",
            title: "Validate and exploit safely",
            summary:
              "Confirm findings and demonstrate impact in a controlled, authorized way — never beyond scope.",
            contentType: "lab",
            estimatedMinutes: 25,
            order: 2,
          },
        ],
      },
      {
        id: "secure-testing-m3",
        pathId: "path-secure-testing",
        title: "Reporting and remediation",
        description:
          "Turn findings into a report a team can act on, and recommend durable fixes.",
        estimatedMinutes: 40,
        order: 3,
        challengeSlugs: [],
        toolSlugs: [],
        lessons: [
          {
            id: "secure-testing-m3-l1",
            title: "Writing an actionable findings report",
            summary:
              "Structure a report so each finding has impact, evidence, and a clear remediation path.",
            contentType: "concept",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            id: "secure-testing-m3-l2",
            title: "Review: the full methodology",
            summary:
              "Consolidate the six stages into a repeatable checklist you can carry into real assessments.",
            contentType: "review",
            estimatedMinutes: 20,
            order: 2,
          },
        ],
      },
    ],
    relatedChallenges: ["reflected-xss", "idor", "jwt-algorithm-confusion"],
    relatedTools: ["headers", "jwt", "json"],
    status: "available",
    order: 7,
  },
]
