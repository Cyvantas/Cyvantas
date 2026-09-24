/**
 * ScoringRepository unit tests (Phase 12) — exercised directly over the
 * in-memory implementation, no HTTP/DB/runtime.
 *
 * Proves the server-authoritative, idempotent scoring contract: attempts are
 * always counted, points are awarded EXACTLY ONCE on the first correct solve,
 * a duplicate/racing correct submission is `alreadySolved` with zero points,
 * totals sum the ledger, and getUserSummary projects a safe per-challenge view.
 */
import { describe, it, expect } from "vitest"
import { createInMemoryRepositories } from "../src/repositories/memory.ts"

const USER = "user-scoring-1"
const OTHER = "user-scoring-2"
const SLUG = "reflected-xss"
const POINTS = 100

function scoring() {
  return createInMemoryRepositories().scoring
}

describe("ScoringRepository — recordSubmission", () => {
  it("awards catalog points on the first correct solve", async () => {
    const s = scoring()
    const out = await s.recordSubmission({
      userId: USER,
      challengeSlug: SLUG,
      correct: true,
      points: POINTS,
      at: new Date(),
    })
    expect(out).toMatchObject({
      correct: true,
      alreadySolved: false,
      pointsAwarded: POINTS,
      totalPoints: POINTS,
      attempts: 1,
    })
    expect(out.completedAt).toBeInstanceOf(Date)
  })

  it("awards points EXACTLY once — a second correct solve is alreadySolved", async () => {
    const s = scoring()
    await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: true, points: POINTS, at: new Date() })
    const second = await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: true, points: POINTS, at: new Date() })
    expect(second).toMatchObject({
      correct: true,
      alreadySolved: true,
      pointsAwarded: 0,
      totalPoints: POINTS,
      attempts: 2,
    })
  })

  it("counts attempts on wrong submissions without awarding points", async () => {
    const s = scoring()
    await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: false, points: POINTS, at: new Date() })
    const out = await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: false, points: POINTS, at: new Date() })
    expect(out).toMatchObject({
      correct: false,
      alreadySolved: false,
      pointsAwarded: 0,
      totalPoints: 0,
      attempts: 2,
    })
    expect(out.completedAt).toBeNull()
  })

  it("still awards on the first correct solve after prior wrong attempts", async () => {
    const s = scoring()
    await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: false, points: POINTS, at: new Date() })
    const solve = await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: true, points: POINTS, at: new Date() })
    expect(solve).toMatchObject({ alreadySolved: false, pointsAwarded: POINTS, totalPoints: POINTS, attempts: 2 })
  })

  it("keeps totals per-user (one user's solve does not leak into another)", async () => {
    const s = scoring()
    await s.recordSubmission({ userId: USER, challengeSlug: SLUG, correct: true, points: POINTS, at: new Date() })
    const other = await s.recordSubmission({ userId: OTHER, challengeSlug: SLUG, correct: false, points: POINTS, at: new Date() })
    expect(other.totalPoints).toBe(0)
    expect((await s.getUserSummary(USER)).totalPoints).toBe(POINTS)
    expect((await s.getUserSummary(OTHER)).totalPoints).toBe(0)
  })
})

describe("ScoringRepository — getUserSummary", () => {
  it("is empty for a user with no submissions", async () => {
    const s = scoring()
    expect(await s.getUserSummary(USER)).toEqual({ totalPoints: 0, solvedCount: 0, challenges: [] })
  })

  it("projects a safe per-challenge view and sums the ledger across challenges", async () => {
    const s = scoring()
    await s.recordSubmission({ userId: USER, challengeSlug: "reflected-xss", correct: true, points: 100, at: new Date() })
    await s.recordSubmission({ userId: USER, challengeSlug: "other-challenge", correct: true, points: 50, at: new Date() })
    const summary = await s.getUserSummary(USER)
    expect(summary.totalPoints).toBe(150)
    expect(summary.solvedCount).toBe(2)
    expect(summary.challenges).toHaveLength(2)
    for (const c of summary.challenges) {
      expect(c).not.toHaveProperty("userId")
      expect(c.status).toBe("completed")
      expect(c.firstSolvedAt).toBeInstanceOf(Date)
    }
  })
})
