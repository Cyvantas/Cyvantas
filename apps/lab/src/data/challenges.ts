import type { Challenge } from "../models/challenge"

export const challenges: Challenge[] = [
  {
    id: "web-001",
    slug: "reflected-xss",
    title: "Reflected XSS",
    description:
      "Identify and understand a reflected cross-site scripting vulnerability in a controlled application.",
    category: "web",
    difficulty: "beginner",
    points: 100,
    estimatedMinutes: 15,
    status: "available",
    objectives: [
      "Identify the injection point",
      "Understand reflected input",
      "Validate the vulnerability safely",
    ],
    hints: [
      "Start by tracing user-controlled input.",
      "Look for locations where input is reflected into HTML.",
    ],
    tags: ["XSS", "Web", "Input Validation"],
  },

  {
    id: "auth-001",
    slug: "jwt-algorithm-confusion",
    title: "JWT Algorithm Confusion",
    description:
      "Explore how incorrect JWT algorithm validation can create an authentication weakness.",
    category: "authentication",
    difficulty: "medium",
    points: 250,
    estimatedMinutes: 25,
    status: "available",
    objectives: [
      "Understand JWT signing algorithms",
      "Inspect JWT headers",
      "Identify unsafe algorithm validation",
    ],
    hints: [
      "Inspect the JWT header before examining the payload.",
      "Compare the algorithm expected by the server with the one supplied by the token.",
    ],
    tags: ["JWT", "Authentication", "API"],
  },

  {
    id: "api-001",
    slug: "idor",
    title: "Insecure Direct Object Reference",
    description:
      "Identify an authorization flaw caused by insufficient object-level access control.",
    category: "api",
    difficulty: "medium",
    points: 200,
    estimatedMinutes: 20,
    status: "available",
    objectives: [
      "Identify object identifiers",
      "Understand authorization boundaries",
      "Verify access control behavior",
    ],
    hints: [
      "Compare requests made for resources belonging to different users.",
    ],
    tags: ["IDOR", "Authorization", "API"],
  },
]
