/**
 * Server-side flag verifiers (Phase 11).
 *
 * The real flag is held in a closure here and NEVER leaves the server: it is
 * not returned by any endpoint, not placed in a DTO, and not written to an
 * audit log. `verify` returns only a boolean.
 *
 * The comparison is constant-time in the length of the expected flag, so a
 * caller cannot learn the flag (or how many leading characters matched) by
 * measuring response time. A trivial `===` would short-circuit on the first
 * differing byte and leak that signal.
 */
import type {
  ChallengeVerificationContext,
  ChallengeVerifier,
} from "./challengeTypes.ts"

/**
 * Constant-time-ish string equality. Runs in time proportional to the EXPECTED
 * value's length regardless of the candidate, so it does not reveal a partial
 * match through timing. Not a cryptographic MAC, but sufficient to avoid the
 * obvious early-exit timing leak for short educational flags.
 */
function timingSafeEqual(expected: string, candidate: string): boolean {
  // Compare byte-by-byte over the expected length. A length mismatch still
  // walks the full expected length so timing does not reveal the flag length.
  let mismatch = expected.length === candidate.length ? 0 : 1
  for (let i = 0; i < expected.length; i += 1) {
    const e = expected.charCodeAt(i)
    // Reading past the candidate yields NaN → coerce to a non-matching value.
    const c = i < candidate.length ? candidate.charCodeAt(i) : -1
    mismatch |= e ^ c
  }
  return mismatch === 0
}

/**
 * A deterministic static-flag verifier. Acceptable for Phase 11: the flag is a
 * fixed server-side secret and the check does not depend on the client telling
 * us HOW the challenge was solved.
 *
 * Future work (documented in docs/CHALLENGES.md): an environment-side verifier
 * that inspects evidence collected by the runtime (e.g. a callback the injected
 * payload triggers), binding correctness to the specific environment instead of
 * a shared static string.
 */
export function createStaticFlagVerifier(flag: string): ChallengeVerifier {
  const expected = flag
  return {
    verify(_context: ChallengeVerificationContext, answer: string): boolean {
      if (typeof answer !== "string" || answer.length === 0) return false
      return timingSafeEqual(expected, answer)
    },
  }
}
