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
import { MissionFilters } from "../components/ctf/MissionFilters"
import { MissionCard } from "../components/ctf/MissionCard"
import { staggerContainer, fadeUp } from "../lib/motion"
import { localCTFProvider } from "../providers/CTFProvider"
import { missionProgressProvider } from "../providers/MissionProgressProvider"
import { useMissionFilters } from "../lib/useMissionFilters"
import type { CTFMission } from "../models/ctf"

export function CTF() {
  const [all, setAll] = useState<CTFMission[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load through the provider so a backend can replace the local source later.
  useEffect(() => {
    let active = true
    localCTFProvider.listMissions().then((list) => {
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
    status,
    setStatus,
    query,
    setQuery,
    results,
    isFiltered,
    reset,
  } = useMissionFilters(all)

  const filterKey = `${category}|${difficulty}|${status}|${query}`
  const progressPersisted = missionProgressProvider.supportsPersistence

  return (
    <>
      <Seo {...ROUTE_SEO.ctf} />
      <PageHero
        eyebrow="CTF Missions"
        title="Capture the objective."
        description="Scenario-driven security missions that combine reconnaissance, analysis, exploitation concepts, and defensive validation inside controlled environments."
      />

      <Section pad={false} className="pb-[var(--section-pad)] pt-[var(--section-pad)]">
        <Reveal className="mb-8 flex flex-col gap-3">
          <StatusDot
            status="idle"
            label={`${all.length} ${all.length === 1 ? "mission" : "missions"} available`}
          />
          {!progressPersisted ? (
            <p className="text-body text-sm text-dim">
              Mission progress tracking will be available when Lab accounts are introduced.
              Every mission is open and self-guided for now.
            </p>
          ) : null}
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside aria-label="Filter missions">
            <Reveal>
              <MissionFilters
                category={category}
                onCategoryChange={setCategory}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                status={status}
                onStatusChange={setStatus}
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
              <p className="text-body text-muted">Loading missions…</p>
            ) : results.length > 0 ? (
              <motion.ul
                key={filterKey}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {results.map((mission) => (
                  <motion.li key={mission.id} variants={fadeUp}>
                    <MissionCard mission={mission} to={`/ctf/${mission.slug}`} />
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <Card className="flex flex-col items-start gap-3">
                <StatusDot status="idle" label="No matches" />
                <p className="text-body text-muted">
                  No missions match your current filters. Try a different category, difficulty,
                  or status, or clear your search.
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
