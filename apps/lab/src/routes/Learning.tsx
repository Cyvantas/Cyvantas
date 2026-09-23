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
import { LearningFilters } from "../components/learning/LearningFilters"
import { LearningCard } from "../components/learning/LearningCard"
import { staggerContainer, fadeUp } from "../lib/motion"
import { localLearningProvider } from "../providers/LearningProvider"
import { useLearningFilters } from "../lib/useLearningFilters"
import type { LearningPath } from "../models/learning"

export function Learning() {
  const [all, setAll] = useState<LearningPath[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load through the provider so a backend can replace the local source later.
  useEffect(() => {
    let active = true
    localLearningProvider.list().then((list) => {
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
    duration,
    setDuration,
    query,
    setQuery,
    results,
    isFiltered,
    reset,
  } = useLearningFilters(all)

  const filterKey = `${category}|${difficulty}|${duration}|${query}`

  return (
    <>
      <Seo {...ROUTE_SEO.learning} />
      <PageHero
        eyebrow="Learning"
        title="Security learning paths"
        description="Structured paths for building practical offensive and defensive security skills. Each path sequences concepts, walkthroughs, hands-on labs, and challenges. Practise only against systems you own or are explicitly authorized to test."
      />

      <Section pad={false} className="pb-[var(--section-pad)] pt-[var(--section-pad)]">
        <Reveal className="mb-8">
          <StatusDot
            status="idle"
            label={`${all.length} ${all.length === 1 ? "learning path" : "learning paths"} available`}
          />
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside aria-label="Filter learning paths">
            <Reveal>
              <LearningFilters
                category={category}
                onCategoryChange={setCategory}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                duration={duration}
                onDurationChange={setDuration}
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
              <p className="text-body text-muted">Loading learning paths…</p>
            ) : results.length > 0 ? (
              <motion.ul
                key={filterKey}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {results.map((path) => (
                  <motion.li key={path.id} variants={fadeUp}>
                    <LearningCard path={path} to={`/learning/${path.slug}`} />
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <Card className="flex flex-col items-start gap-3">
                <StatusDot status="idle" label="No matches" />
                <p className="text-body text-muted">
                  No learning paths match your current filters. Try a different category,
                  difficulty, or duration, or clear your search.
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
