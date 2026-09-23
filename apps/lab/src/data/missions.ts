import type { CTFMission } from "../models/ctf"

/**
 * Initial CTF / mission catalogue. Frontend-only for now: missions reference
 * existing challenges, tools, and learning paths by slug so no content is
 * duplicated and a backend can serve the same shapes later.
 *
 * Every mission is scenario-driven and scoped to a controlled, authorized
 * training environment. No real targets, no fake statistics, no completion data
 * (CLAUDE.md). Challenge slugs used here all exist in data/challenges.ts:
 * reflected-xss, jwt-algorithm-confusion, idor.
 */
export const missions: CTFMission[] = [
  {
    id: "mission-surface-recon",
    slug: "surface-recon",
    title: "Surface Recon",
    shortDescription:
      "Map a fictional application's attack surface and identify its security-relevant entry points.",
    description:
      "Reconnaissance is where every assessment begins. In this mission you methodically enumerate a controlled training application's visible surface — hosts, endpoints, and the response headers that hint at how it is defended — and turn raw observations into a prioritised map worth deeper testing.",
    difficulty: "beginner",
    category: "recon",
    estimatedMinutes: 45,
    points: 300,
    briefing: {
      scenario:
        "You are assessing a fictional web application within an authorized CYVANTAS training environment.",
      objective:
        "Map the exposed application surface and identify security-relevant entry points.",
      scope:
        "Controlled training environment only. Never use real organizations or third-party systems as mission targets.",
    },
    objectives: [
      "Enumerate the application's visible attack surface",
      "Inspect HTTP response headers for security signals",
      "Prioritise entry points worth deeper testing",
      "Record findings in a structured, repeatable way",
    ],
    stages: [
      {
        id: "surface-recon-s1",
        missionId: "mission-surface-recon",
        title: "Map the surface",
        objective: "Build an inventory of the application's visible surface.",
        description:
          "Catalogue the hosts, routes, and technologies the training application exposes. Organise what you find into a working inventory you can reason about.",
        order: 1,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "surface-recon-s2",
        missionId: "mission-surface-recon",
        title: "Identify entry points",
        objective: "Locate the inputs and endpoints an attacker would probe first.",
        description:
          "Trace where the application accepts user-controlled data — parameters, forms, and API routes — and note each as a candidate entry point.",
        order: 2,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "surface-recon-s3",
        missionId: "mission-surface-recon",
        title: "Validate exposure",
        objective: "Inspect security headers to gauge how each surface is defended.",
        description:
          "Use the Security Headers Analyzer on captured responses to see which protections are present, missing, or worth a second look.",
        order: 3,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "surface-recon-s4",
        missionId: "mission-surface-recon",
        title: "Document findings",
        objective: "Turn the raw inventory into a ranked, actionable map.",
        description:
          "Consolidate observations into a prioritised attack-surface map, ready to hand to the next mission or a real engagement.",
        order: 4,
        challengeSlugs: [],
        required: false,
        status: "available",
      },
    ],
    challengeSlugs: [],
    toolSlugs: ["headers"],
    learningPathSlugs: ["reconnaissance-attack-surface"],
    prerequisites: [],
    status: "available",
    order: 1,
  },
  {
    id: "mission-web-entry-point",
    slug: "web-entry-point",
    title: "Web Entry Point",
    shortDescription:
      "Discover where user input enters a web application and confirm a reflected XSS finding safely.",
    description:
      "Every web flaw starts at an input. This mission has you discover the application's input surface, trace user-controlled data to where it is reflected into a response, and validate a reflected cross-site scripting finding in a controlled challenge — then reason about the validation that would have stopped it.",
    difficulty: "intermediate",
    category: "web",
    estimatedMinutes: 55,
    points: 500,
    briefing: {
      scenario:
        "You are testing a fictional web application within an authorized CYVANTAS training environment.",
      objective:
        "Discover the application's input surface and confirm a reflected input-handling weakness.",
      scope:
        "Controlled training environment only. Validate findings safely — never target real systems or users.",
    },
    objectives: [
      "Discover the application's input surface",
      "Trace user-controlled input to a reflection point",
      "Validate a reflected XSS finding safely",
      "Reason about input validation and output encoding",
    ],
    stages: [
      {
        id: "web-entry-point-s1",
        missionId: "mission-web-entry-point",
        title: "Discover inputs",
        objective: "Enumerate the parameters and forms the application accepts.",
        description:
          "Catalogue every place the application takes user-controlled data, from query strings to form fields.",
        order: 1,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "web-entry-point-s2",
        missionId: "mission-web-entry-point",
        title: "Trace reflection",
        objective: "Follow an input to where it is reflected into the response.",
        description:
          "Pick a candidate input and trace it from entry point to the location where it appears in the rendered HTML.",
        order: 2,
        challengeSlugs: ["reflected-xss"],
        required: true,
        status: "available",
      },
      {
        id: "web-entry-point-s3",
        missionId: "mission-web-entry-point",
        title: "Validate the finding",
        objective: "Confirm the reflected XSS in a controlled challenge.",
        description:
          "Work through the Reflected XSS challenge to safely verify the vulnerability without impacting anyone.",
        order: 3,
        challengeSlugs: ["reflected-xss"],
        required: true,
        status: "available",
      },
      {
        id: "web-entry-point-s4",
        missionId: "mission-web-entry-point",
        title: "Recommend validation",
        objective: "Describe the encoding and validation that would prevent it.",
        description:
          "Summarise context-aware output encoding and input validation as the defences that close the finding.",
        order: 4,
        challengeSlugs: [],
        required: false,
        status: "available",
      },
    ],
    challengeSlugs: ["reflected-xss"],
    toolSlugs: ["url"],
    learningPathSlugs: ["cross-site-scripting"],
    prerequisites: ["surface-recon"],
    status: "available",
    order: 2,
  },
  {
    id: "mission-broken-identity",
    slug: "broken-identity",
    title: "Broken Identity",
    shortDescription:
      "Inspect JSON Web Tokens and understand how algorithm confusion undermines authentication.",
    description:
      "Authentication is where many applications first break. This mission dissects the structure of a JSON Web Token, inspects real tokens with the local JWT Decoder, and works through an algorithm-confusion challenge to see how a server that trusts a token's declared algorithm can be tricked.",
    difficulty: "intermediate",
    category: "authentication",
    estimatedMinutes: 60,
    points: 550,
    briefing: {
      scenario:
        "You are reviewing the authentication of a fictional application in an authorized CYVANTAS training environment.",
      objective:
        "Inspect the application's tokens and identify unsafe algorithm validation.",
      scope:
        "Controlled training environment only. Inspect tokens locally — never replay credentials against real services.",
    },
    objectives: [
      "Decompose a JWT into header, payload, and signature",
      "Inspect tokens with a local, offline decoder",
      "Identify unsafe algorithm validation",
      "Recommend correct token validation",
    ],
    stages: [
      {
        id: "broken-identity-s1",
        missionId: "mission-broken-identity",
        title: "Anatomy of a token",
        objective: "Break a JWT into its three segments.",
        description:
          "Separate a token into header, payload, and signature and understand what each part asserts.",
        order: 1,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "broken-identity-s2",
        missionId: "mission-broken-identity",
        title: "Inspect the token",
        objective: "Read a token's claims with the JWT Decoder.",
        description:
          "Use the local JWT Decoder to inspect the header and payload — inspection only, no signature verification.",
        order: 2,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "broken-identity-s3",
        missionId: "mission-broken-identity",
        title: "Find the confusion",
        objective: "Identify unsafe algorithm validation in a controlled challenge.",
        description:
          "Work through the JWT Algorithm Confusion challenge to see how weak algorithm handling creates a bypass.",
        order: 3,
        challengeSlugs: ["jwt-algorithm-confusion"],
        required: true,
        status: "available",
      },
      {
        id: "broken-identity-s4",
        missionId: "mission-broken-identity",
        title: "Harden validation",
        objective: "Recommend correct algorithm, expiry, and key handling.",
        description:
          "Summarise the token-validation checklist that prevents algorithm confusion and related weaknesses.",
        order: 4,
        challengeSlugs: [],
        required: false,
        status: "available",
      },
    ],
    challengeSlugs: ["jwt-algorithm-confusion"],
    toolSlugs: ["jwt"],
    learningPathSlugs: ["authentication-jwt-security"],
    prerequisites: ["surface-recon"],
    status: "available",
    order: 3,
  },
  {
    id: "mission-access-control",
    slug: "access-control",
    title: "Access Control",
    shortDescription:
      "Trace object references through requests and verify authorization boundaries across users.",
    description:
      "Broken access control is consistently among the most impactful web weaknesses. This mission has you identify the object identifiers an application exposes, test whether they are properly authorized, and confirm an insecure direct object reference in a controlled challenge before recommending object-level enforcement.",
    difficulty: "intermediate",
    category: "access-control",
    estimatedMinutes: 55,
    points: 500,
    briefing: {
      scenario:
        "You are assessing the authorization model of a fictional application in an authorized CYVANTAS training environment.",
      objective:
        "Identify exposed object references and verify authorization boundaries.",
      scope:
        "Controlled training environment only. Only access resources the training scenario authorizes.",
    },
    objectives: [
      "Identify object identifiers in requests",
      "Understand authorization boundaries",
      "Confirm an insecure direct object reference",
      "Describe object-level authorization enforcement",
    ],
    stages: [
      {
        id: "access-control-s1",
        missionId: "mission-access-control",
        title: "Spot the identifiers",
        objective: "Find the object IDs the application exposes.",
        description:
          "Trace requests and note the identifiers that map to resources — the raw material for an IDOR test.",
        order: 1,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "access-control-s2",
        missionId: "mission-access-control",
        title: "Test the boundary",
        objective: "Compare access to resources belonging to different users.",
        description:
          "Systematically check whether the application enforces per-object authorization or trusts the supplied identifier.",
        order: 2,
        challengeSlugs: ["idor"],
        required: true,
        status: "available",
      },
      {
        id: "access-control-s3",
        missionId: "mission-access-control",
        title: "Confirm the IDOR",
        objective: "Verify the authorization flaw in a controlled challenge.",
        description:
          "Work through the Insecure Direct Object Reference challenge to confirm the boundary can be crossed.",
        order: 3,
        challengeSlugs: ["idor"],
        required: true,
        status: "available",
      },
      {
        id: "access-control-s4",
        missionId: "mission-access-control",
        title: "Enforce authorization",
        objective: "Recommend object-level access-control enforcement.",
        description:
          "Summarise the pattern of checking every object access against the current user's permissions.",
        order: 4,
        challengeSlugs: [],
        required: false,
        status: "available",
      },
    ],
    challengeSlugs: ["idor"],
    toolSlugs: [],
    learningPathSlugs: ["access-control-idor"],
    prerequisites: ["broken-identity"],
    status: "available",
    order: 4,
  },
  {
    id: "mission-api-exposure",
    slug: "api-exposure",
    title: "API Exposure",
    shortDescription:
      "Map an API's surface, inspect its traffic locally, and reason about authorization flaws.",
    description:
      "Modern applications are driven by APIs, and APIs fail in their own characteristic ways. This mission maps a training API's surface, uses the JSON Formatter and URL Encoder to make its traffic readable, and reasons about broken object-level authorization and excessive data exposure — all processed locally.",
    difficulty: "intermediate",
    category: "api",
    estimatedMinutes: 55,
    points: 500,
    briefing: {
      scenario:
        "You are testing a fictional API within an authorized CYVANTAS training environment.",
      objective:
        "Map the API surface and reason about its authorization weaknesses.",
      scope:
        "Controlled training environment only. Inspect traffic locally — never proxy or attack real APIs.",
    },
    objectives: [
      "Map the attack surface of a training API",
      "Inspect and reformat API traffic locally",
      "Encode and decode parameters correctly",
      "Recognise broken object-level authorization in APIs",
    ],
    stages: [
      {
        id: "api-exposure-s1",
        missionId: "mission-api-exposure",
        title: "Enumerate endpoints",
        objective: "Discover the operations the API exposes.",
        description:
          "Catalogue the API's routes, methods, and parameters to build a picture of its surface.",
        order: 1,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "api-exposure-s2",
        missionId: "mission-api-exposure",
        title: "Read the traffic",
        objective: "Make responses readable with the JSON Formatter.",
        description:
          "Use the local JSON Formatter to validate and pretty-print captured API responses while you test.",
        order: 2,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "api-exposure-s3",
        missionId: "mission-api-exposure",
        title: "Handle parameters",
        objective: "Encode and decode query parameters correctly.",
        description:
          "Use the URL Encoder/Decoder to build and inspect encoded parameters without corrupting the request.",
        order: 3,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "api-exposure-s4",
        missionId: "mission-api-exposure",
        title: "Assess authorization",
        objective: "Reason about broken object-level authorization.",
        description:
          "Consider how the API repeats the IDOR pattern at scale and where per-object checks are missing.",
        order: 4,
        challengeSlugs: [],
        required: false,
        status: "available",
      },
    ],
    challengeSlugs: [],
    toolSlugs: ["json", "url"],
    learningPathSlugs: ["api-security"],
    prerequisites: ["broken-identity", "access-control"],
    status: "available",
    order: 5,
  },
  {
    id: "mission-defensive-validation",
    slug: "defensive-validation",
    title: "Defensive Validation",
    shortDescription:
      "Turn offensive findings into durable defences: input validation, CSP, and safe regular expressions.",
    description:
      "The defensive capstone. This mission takes the weaknesses uncovered in earlier missions and turns them into concrete, testable defences — input validation, a Content-Security-Policy that limits script execution, hardened security headers, and regular expressions that resist catastrophic backtracking.",
    difficulty: "advanced",
    category: "defensive",
    estimatedMinutes: 65,
    points: 700,
    briefing: {
      scenario:
        "You are hardening a fictional application within an authorized CYVANTAS training environment.",
      objective:
        "Convert earlier findings into durable, testable defensive controls.",
      scope:
        "Controlled training environment only. All tools run locally in the browser — nothing is sent anywhere.",
    },
    objectives: [
      "Design input validation for identified entry points",
      "Compose a Content-Security-Policy as defence in depth",
      "Review security headers for gaps",
      "Write regular expressions that resist backtracking",
    ],
    stages: [
      {
        id: "defensive-validation-s1",
        missionId: "mission-defensive-validation",
        title: "Validate input",
        objective: "Define validation rules for the entry points you found.",
        description:
          "Specify allow-list validation and context-aware encoding for each input surface identified earlier.",
        order: 1,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "defensive-validation-s2",
        missionId: "mission-defensive-validation",
        title: "Build a CSP",
        objective: "Compose a policy that limits script execution.",
        description:
          "Use the CSP Builder to assemble a Content-Security-Policy as defence in depth against injection.",
        order: 2,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "defensive-validation-s3",
        missionId: "mission-defensive-validation",
        title: "Review headers",
        objective: "Check the response headers for remaining gaps.",
        description:
          "Analyze the hardened response headers to confirm the protections you expect are present.",
        order: 3,
        challengeSlugs: [],
        required: true,
        status: "available",
      },
      {
        id: "defensive-validation-s4",
        missionId: "mission-defensive-validation",
        title: "Harden patterns",
        objective: "Write regular expressions that resist backtracking.",
        description:
          "Use the Regex Tester to verify validation patterns match as intended without catastrophic backtracking.",
        order: 4,
        challengeSlugs: [],
        required: false,
        status: "available",
      },
    ],
    challengeSlugs: [],
    toolSlugs: ["csp", "headers", "regex"],
    learningPathSlugs: ["secure-web-application-testing"],
    prerequisites: ["web-entry-point", "api-exposure"],
    status: "available",
    order: 6,
  },
]
