import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Seo } from "../components/seo/Seo"
import { ROUTE_SEO } from "../config/seo"
import { PageHero } from "../components/sections/PageHero"
import { Section } from "../components/ui/Section"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { StatusDot } from "../components/ui/StatusDot"
import { Reveal } from "../components/motion/Reveal"
import { ChallengeFilters } from "../components/challenges/ChallengeFilters"
import { ChallengeCard } from "../components/challenges/ChallengeCard"
import { staggerContainer, fadeUp } from "../lib/motion"
import { localChallengeProvider } from "../providers/ChallengeProvider"
import { useChallengeFilters } from "../lib/useChallengeFilters"
import type { Challenge } from "../models/challenge"

export function Challenges() {
  const [all, setAll] = useState<Challenge[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load through the provider so a backend can replace the local source later.
  useEffect(() => {
    let active = true
    localChallengeProvider.list().then((list) => {
      if (!active) return
      setAll(list)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  const {
    category,
    setCategory,
    difficulty,
    setDifficulty,
    query,
    setQuery,
    results,
    isFiltered,
    reset,
  } = useChallengeFilters(all)

  const filterKey = `${category}|${difficulty}|${query}`

  return (
    <>
      <Seo {...ROUTE_SEO.challenges} />
      <PageHero
        eyebrow="Challenges"
        title="Security Challenges"
        description="Work through focused, hands-on security challenges in a controlled, educational setting. Each one walks you through identifying and understanding a specific class of vulnerability safely."
      />

      <Section pad={false} className="pb-[var(--section-pad)] pt-[var(--section-pad)]">
        <Reveal className="mb-8">
          <StatusDot
            status="idle"
            label={`${all.length} ${all.length === 1 ? "challenge" : "challenges"} available`}
          />
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside aria-label="Filter challenges">
            <Reveal>
              <ChallengeFilters
                category={category}
                onCategoryChange={setCategory}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                query={query}
                onQueryChange={setQuery}
              />
            </Reveal>
          </aside>

          <div className="flex flex-col gap-5">
            <p className="text-technical text-dim" role="status" aria-live="polite">
              Showing {results.length} of {all.length}
            </p>

            {!loaded ? (
              <p className="text-body text-muted">Loading challenges…</p>
            ) : results.length > 0 ? (
              <motion.ul
                key={filterKey}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {results.map((challenge) => (
                  <motion.li key={challenge.id} variants={fadeUp}>
                    <ChallengeCard
                      challenge={challenge}
                      to={`/challenges/${challenge.slug}`}
                      showTags
                    />
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <Card className="flex flex-col items-start gap-3">
                <StatusDot status="idle" label="No matches" />
                <p className="text-body text-muted">
                  No challenges match your current filters. Try a different category or
                  difficulty, or clear your search.
                </p>
                {isFiltered ? (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Clear filters
                  </Button>
                ) : null}
              </Card>
            )}
          </div>
        </div>
      </Section>
    </>
  )
}
