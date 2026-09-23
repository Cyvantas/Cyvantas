import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Seo } from "../components/seo/Seo"
import { ROUTE_SEO } from "../config/seo"
import { SITE } from "../config/site"
import { Section } from "../components/ui/Section"
import { SectionTitle } from "../components/ui/SectionTitle"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { StatusDot } from "../components/ui/StatusDot"
import { Icon } from "../components/ui/Icon"
import { ArrowRightIcon } from "../components/ui/icons"
import { Reveal, Stagger, StaggerItem } from "../components/motion/Reveal"
import { ChallengeCard } from "../components/challenges/ChallengeCard"
import { Hints } from "../components/challenges/Hints"
import { LabEnvironmentPanel } from "../components/challenges/LabEnvironmentPanel"
import { localChallengeProvider } from "../providers/ChallengeProvider"
import { relatedChallenges } from "../lib/challengeFilters"
import { CATEGORY_LABEL, DIFFICULTY_TONE, STATUS_META } from "../lib/challengeDisplay"
import type { Challenge } from "../models/challenge"

const backLink =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors " +
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"

function BackToChallenges() {
  return (
    <Link to="/challenges" className={backLink}>
      <span className="rotate-180">
        <Icon size="sm">
          <ArrowRightIcon />
        </Icon>
      </span>
      Back to Challenges
    </Link>
  )
}

export function ChallengeDetail() {
  const { slug } = useParams<{ slug: string }>()
  // `null` while loading; "not-found" for an invalid slug; otherwise the result.
  const [result, setResult] = useState<
    { challenge: Challenge; related: Challenge[] } | "not-found" | null
  >(null)

  // Reset to the loading state during render when the slug changes, avoiding a
  // synchronous setState inside the effect (cascading-render lint rule).
  const [prevSlug, setPrevSlug] = useState(slug)
  if (slug !== prevSlug) {
    setPrevSlug(slug)
    setResult(null)
  }

  useEffect(() => {
    if (!slug) return
    let active = true
    Promise.all([localChallengeProvider.getBySlug(slug), localChallengeProvider.list()]).then(
      ([found, all]) => {
        if (!active) return
        setResult(found ? { challenge: found, related: relatedChallenges(all, found) } : "not-found")
      },
    )
    return () => {
      active = false
    }
  }, [slug])

  if (!slug || result === "not-found") {
    return (
      <>
        <Seo {...ROUTE_SEO.notFound} />
        <Section>
          <SectionTitle
            as="h1"
            eyebrow="404"
            title="Challenge not found"
            description="This challenge does not exist or may have been moved. Browse the full catalogue to find another."
          />
          <div className="mt-8">
            <BackToChallenges />
          </div>
        </Section>
      </>
    )
  }

  if (result === null) {
    return (
      <Section>
        <p className="text-body text-muted">Loading challenge…</p>
      </Section>
    )
  }

  const { challenge, related } = result
  const meta = STATUS_META[challenge.status]

  return (
    <>
      <Seo
        path={`/challenges/${challenge.slug}`}
        title={`${challenge.title} | ${SITE.name}`}
        description={challenge.description}
      />
      <Section as="header" className="border-b border-border-subtle">
        <Reveal className="flex flex-col gap-5">
          <BackToChallenges />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cyan">{CATEGORY_LABEL[challenge.category]}</Badge>
            <Badge tone={DIFFICULTY_TONE[challenge.difficulty]}>{challenge.difficulty}</Badge>
            <StatusDot status={meta.status} label={meta.label} />
          </div>
          <SectionTitle as="h1" eyebrow="Challenge" title={challenge.title} />
          <p className="text-body max-w-[65ch] text-muted">{challenge.description}</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-technical text-dim">{challenge.points} pts</span>
            <span className="text-technical text-dim">~{challenge.estimatedMinutes} min</span>
          </div>
        </Reveal>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-5">
              <SectionTitle as="h2" eyebrow="Objectives" title="What you will do" />
              <Stagger as="ol" className="flex flex-col gap-3">
                {challenge.objectives.map((objective, index) => (
                  <StaggerItem
                    as="li"
                    key={index}
                    className="flex items-start gap-3 text-body text-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated font-mono text-xs text-accent"
                    >
                      {index + 1}
                    </span>
                    <span>{objective}</span>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>

            <div className="flex flex-col gap-5">
              <SectionTitle
                as="h2"
                eyebrow="Hints"
                title="Progressive hints"
                description="Reveal only as many as you need — each one is hidden until you open it."
              />
              <Hints hints={challenge.hints} />
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <LabEnvironmentPanel />
            {challenge.tags.length > 0 ? (
              <Card className="flex flex-col gap-3">
                <h2 className="text-technical text-dim">Tags</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {challenge.tags.map((tag) => (
                    <li key={tag}>
                      <Badge tone="neutral">{tag}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </aside>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section className="border-t border-border-subtle">
          <SectionTitle as="h2" eyebrow="Related" title="Related challenges" className="mb-8" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <StaggerItem as="li" key={item.id}>
                <ChallengeCard challenge={item} to={`/challenges/${item.slug}`} showTags />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}
    </>
  )
}
