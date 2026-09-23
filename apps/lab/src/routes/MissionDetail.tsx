import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Seo } from "../components/seo/Seo"
import { ROUTE_SEO } from "../config/seo"
import { SITE } from "../config/site"
import { Section } from "../components/ui/Section"
import { SectionTitle, Eyebrow } from "../components/ui/SectionTitle"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { StatusDot } from "../components/ui/StatusDot"
import { Icon } from "../components/ui/Icon"
import { ArrowRightIcon } from "../components/ui/icons"
import { Reveal, Stagger, StaggerItem } from "../components/motion/Reveal"
import { MissionHeader } from "../components/ctf/MissionHeader"
import { MissionBriefing } from "../components/ctf/MissionBriefing"
import { MissionStage, type ResolvedStageLink } from "../components/ctf/MissionStage"
import { ChallengeCard } from "../components/challenges/ChallengeCard"
import { LearningCard } from "../components/learning/LearningCard"
import { ToolIconGlyph } from "../components/tools/ToolIconGlyph"
import { localCTFProvider } from "../providers/CTFProvider"
import { localChallengeProvider } from "../providers/ChallengeProvider"
import { localLearningProvider } from "../providers/LearningProvider"
import { missionProgressProvider } from "../providers/MissionProgressProvider"
import { missionEnvironmentProvider } from "../providers/MissionEnvironmentProvider"
import { getToolBySlug } from "../data/tools"
import type { CTFMission, MissionStage as MissionStageModel } from "../models/ctf"
import type { Challenge } from "../models/challenge"
import type { LearningPath } from "../models/learning"
import type { SecurityTool } from "../models/tool"

interface Loaded {
  mission: CTFMission
  relatedChallenges: Challenge[]
  relatedPaths: LearningPath[]
  challengeTitleBySlug: Record<string, string>
}

const backLink =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors " +
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"

function BackToMissions() {
  return (
    <Link to="/ctf" className={backLink}>
      <span className="rotate-180">
        <Icon size="sm">
          <ArrowRightIcon />
        </Icon>
      </span>
      Back to Missions
    </Link>
  )
}

function stageChallengeLinks(
  stage: MissionStageModel,
  titleBySlug: Record<string, string>,
): ResolvedStageLink[] {
  return stage.challengeSlugs
    .filter((slug) => slug in titleBySlug)
    .map((slug) => ({ slug, label: titleBySlug[slug] }))
}

export function MissionDetail() {
  const { slug } = useParams<{ slug: string }>()
  // `null` while loading; "not-found" for an invalid slug; otherwise the result.
  const [result, setResult] = useState<Loaded | "not-found" | null>(null)

  // Reset to loading during render when the slug changes (matches the
  // ChallengeDetail / LearningDetail pattern — no synchronous setState in effect).
  const [prevSlug, setPrevSlug] = useState(slug)
  if (slug !== prevSlug) {
    setPrevSlug(slug)
    setResult(null)
  }

  useEffect(() => {
    if (!slug) return
    let active = true
    Promise.all([
      localCTFProvider.getMission(slug),
      localChallengeProvider.list(),
      localLearningProvider.list(),
    ]).then(([found, allChallenges, allPaths]) => {
      if (!active) return
      if (!found) {
        setResult("not-found")
        return
      }
      const titleBySlug: Record<string, string> = {}
      for (const challenge of allChallenges) titleBySlug[challenge.slug] = challenge.title
      const relatedChallenges = found.challengeSlugs
        .map((s) => allChallenges.find((c) => c.slug === s))
        .filter((c): c is Challenge => c !== undefined)
      const relatedPaths = found.learningPathSlugs
        .map((s) => allPaths.find((p) => p.slug === s))
        .filter((p): p is LearningPath => p !== undefined)
      setResult({
        mission: found,
        relatedChallenges,
        relatedPaths,
        challengeTitleBySlug: titleBySlug,
      })
    })
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
            title="Mission not found"
            description="This mission does not exist or may have been moved. Browse the full catalogue to find another."
          />
          <div className="mt-8">
            <BackToMissions />
          </div>
        </Section>
      </>
    )
  }

  if (result === null) {
    return (
      <Section>
        <p className="text-body text-muted">Loading mission…</p>
      </Section>
    )
  }

  const { mission, relatedChallenges, relatedPaths, challengeTitleBySlug } = result
  const relatedTools = mission.toolSlugs
    .map((s) => getToolBySlug(s))
    .filter((t): t is SecurityTool => t !== undefined)
  const status = missionProgressProvider.getMissionStatus(mission.id)
  const environmentReady = missionEnvironmentProvider.supportsProvisioning

  return (
    <>
      <Seo
        path={`/ctf/${mission.slug}`}
        title={`${mission.title} | ${SITE.name}`}
        description={mission.shortDescription}
      />

      <Section as="header" className="border-b border-border-subtle">
        <Reveal className="flex flex-col gap-5">
          <BackToMissions />
          <MissionHeader mission={mission} status={status} />
        </Reveal>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-12">
            <Reveal>
              <MissionBriefing briefing={mission.briefing} />
            </Reveal>

            <div className="flex flex-col gap-5">
              <SectionTitle as="h2" eyebrow="Objectives" title="Mission objectives" />
              <Stagger as="ol" className="flex flex-col gap-3">
                {mission.objectives.map((objective, index) => (
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
                eyebrow="Stages"
                title="Mission stages"
                description="Expand each stage to see its objective, detail, and related challenges."
              />
              <Stagger as="ol" className="flex flex-col gap-3">
                {mission.stages.map((stage, index) => (
                  <StaggerItem as="li" key={stage.id}>
                    <MissionStage
                      stage={stage}
                      index={index + 1}
                      defaultOpen={index === 0}
                      challengeLinks={stageChallengeLinks(stage, challengeTitleBySlug)}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <Card className="flex flex-col gap-3">
              <Eyebrow>Mission Environment</Eyebrow>
              <StatusDot status="idle" label="Not provisioned" />
              <p className="text-body text-sm text-muted">
                Interactive mission environments are not provisioned yet. Isolated, on-demand
                sandboxes — where you will launch and interact with a controlled instance — will
                be connected in a later phase. For now, review the mission and practise with the
                related challenges.
              </p>
              <Button variant="ghost" size="sm" disabled={!environmentReady} aria-disabled={!environmentReady}>
                {environmentReady ? "Launch environment" : "Environment unavailable"}
              </Button>
              {relatedChallenges.length > 0 ? (
                <a href="#related-challenges" className={backLink}>
                  Explore related challenges
                  <Icon size="sm">
                    <ArrowRightIcon />
                  </Icon>
                </a>
              ) : null}
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-technical text-dim">Status</h2>
              <StatusDot status="idle" label="Not tracked yet" />
              <p className="text-body text-sm text-muted">
                Mission progress tracking will be available when Lab accounts are introduced. For
                now, each mission is self-guided.
              </p>
            </Card>
          </aside>
        </div>
      </Section>

      {relatedChallenges.length > 0 ? (
        <Section id="related-challenges" className="border-t border-border-subtle scroll-mt-[var(--header-height)]">
          <SectionTitle as="h2" eyebrow="Practise" title="Related challenges" className="mb-8" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relatedChallenges.map((challenge) => (
              <StaggerItem as="li" key={challenge.id}>
                <ChallengeCard challenge={challenge} to={`/challenges/${challenge.slug}`} showTags />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      {relatedTools.length > 0 ? (
        <Section className="border-t border-border-subtle">
          <SectionTitle as="h2" eyebrow="Toolkit" title="Recommended tools" className="mb-8" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relatedTools.map((tool) => (
              <StaggerItem as="li" key={tool.id}>
                <Link
                  to={`/tools/${tool.slug}`}
                  className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Card interactive className="flex h-full flex-col gap-4">
                    <ToolIconGlyph icon={tool.icon} boxed size="lg" />
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {tool.name}
                      </h3>
                      <p className="text-body text-sm text-muted">{tool.description}</p>
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      {relatedPaths.length > 0 ? (
        <Section className="border-t border-border-subtle">
          <SectionTitle as="h2" eyebrow="Learn" title="Related learning paths" className="mb-8" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relatedPaths.map((path) => (
              <StaggerItem as="li" key={path.id}>
                <LearningCard path={path} to={`/learning/${path.slug}`} />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      <Section className="border-t border-border-subtle">
        <Reveal>
          <SectionTitle as="h2" eyebrow="Keep going" title="Explore more missions" className="mb-8" />
        </Reveal>
        <BackToMissions />
      </Section>
    </>
  )
}
