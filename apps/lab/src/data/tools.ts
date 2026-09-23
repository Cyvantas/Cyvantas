import type { SecurityTool } from "../models/tool"

/**
 * Browser-based security utilities. All processing is local — no tool input is
 * ever sent to a server. `slug` maps to the /tools/:slug route.
 */
export const securityTools: SecurityTool[] = [
  {
    id: "jwt",
    slug: "jwt",
    name: "JWT Decoder",
    description: "Decode and inspect a JWT's header and payload locally. Inspection only — no signature verification.",
    category: "authentication",
    icon: "key",
    available: true,
  },
  {
    id: "base64",
    slug: "base64",
    name: "Base64 Encoder / Decoder",
    description: "Encode text to Base64 or decode it back, with full Unicode support.",
    category: "encoding",
    icon: "code",
    available: true,
  },
  {
    id: "url",
    slug: "url",
    name: "URL Encoder / Decoder",
    description: "Percent-encode or decode URL components using encodeURIComponent semantics.",
    category: "encoding",
    icon: "globe",
    available: true,
  },
  {
    id: "json",
    slug: "json",
    name: "JSON Formatter",
    description: "Validate, pretty-print, and minify JSON with clear parse-error feedback.",
    category: "analysis",
    icon: "braces",
    available: true,
  },
  {
    id: "hash",
    slug: "hash",
    name: "Hash Identifier",
    description: "Suggest possible hash formats from a digest's structure. No cracking or database lookups.",
    category: "hashing",
    icon: "fingerprint",
    available: true,
  },
  {
    id: "csp",
    slug: "csp",
    name: "CSP Builder",
    description: "Compose a Content-Security-Policy directive by directive, with a plain-language explanation of the result.",
    category: "policy",
    icon: "shield",
    available: true,
  },
  {
    id: "headers",
    slug: "headers",
    name: "Security Headers Analyzer",
    description: "Paste HTTP response headers to review which security headers are present, missing, or worth a second look. Parsed entirely locally.",
    category: "analysis",
    icon: "headers",
    available: true,
  },
  {
    id: "regex",
    slug: "regex",
    name: "Regex Tester",
    description: "Test a regular expression against sample input and inspect matches, indexes, and capture groups locally.",
    category: "testing",
    icon: "regex",
    available: true,
  },
]

export function getToolBySlug(slug: string): SecurityTool | undefined {
  return securityTools.find((tool) => tool.slug === slug)
}
