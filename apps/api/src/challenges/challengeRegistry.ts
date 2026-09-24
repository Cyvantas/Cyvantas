/**
 * Server-side challenge registry (Phase 11).
 *
 * Maps catalog slugs to server-authoritative ChallengeDefinitions (verifiers).
 * The registry is the ONLY place a flag secret is known, and even here it lives
 * inside a verifier closure — the registry exposes no way to read it back.
 *
 * The flag may be supplied via an environment variable so real deployments set
 * their own secret; a fixed, clearly-educational default is used otherwise so
 * local/test runs are deterministic. The default is NOT a real secret — it is a
 * placeholder for an isolated educational challenge and is never sent to a
 * browser.
 *
 * Currently only `reflected-xss` is defined; add further definitions here as
 * isolated challenges are built (Phase 12+).
 */
import { createStaticFlagVerifier } from "./verifier.ts"
import type { ChallengeDefinition } from "./challengeTypes.ts"

/** Reads a flag from env or falls back to a deterministic educational default. */
function reflectedXssFlag(env: NodeJS.ProcessEnv): string {
  const fromEnv = env.CHALLENGE_REFLECTED_XSS_FLAG?.trim()
  if (fromEnv) return fromEnv
  return "CYVANTAS{reflected_xss_input_reflected_unencoded}"
}

export function createChallengeRegistry(
  env: NodeJS.ProcessEnv = process.env,
): Map<string, ChallengeDefinition> {
  const definitions: ChallengeDefinition[] = [
    {
      slug: "reflected-xss",
      verifier: createStaticFlagVerifier(reflectedXssFlag(env)),
    },
  ]
  return new Map(definitions.map((d) => [d.slug, d]))
}
