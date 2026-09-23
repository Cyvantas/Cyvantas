import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Seo } from "../components/seo/Seo"
import { ROUTE_SEO } from "../config/seo"
import { SITE } from "../config/site"
import { Section } from "../components/ui/Section"
import { SectionTitle } from "../components/ui/SectionTitle"
import { Card } from "../components/ui/Card"
import { StatusDot } from "../components/ui/StatusDot"
import { Icon } from "../components/ui/Icon"
import { ArrowRightIcon } from "../components/ui/icons"
import { Reveal, Stagger, StaggerItem } from "../components/motion/Reveal"
import { LearningPathHeader } from "../components/learning/LearningPathHeader"
import { LearningObjectiveList } from "../components/learning/LearningObjectiveList"
import { LearningModule, type ResolvedLink } from "../components/learning/LearningModule"
import { ChallengeCard } from "../components/challenges/ChallengeCard"
import { MissionCard } from "../components/ctf/MissionCard"
import { ToolIconGlyph } from "../components/tools/ToolIconGlyph"
import { localLearningProvider } from "../providers/LearningProvider"
import { localChallengeProvider } from "../providers/ChallengeProvider"
import { localCTFProvider } from "../providers/CTFProvider"
import { learningProgressProvider } from "../providers/LearningProgressProvider"
import { resolvePrerequisites } from "../lib/learningFilters"
import { LEARNING_CATEGORY_LABEL } from "../lib/learningDisplay"
import { getToolBySlug } from "../data/tools"
import type { LearningPath, LearningModule as LearningModuleModel } from "../models/learning"
import type { Challenge } from "../models/challenge"
import type { SecurityTool } from "../models/tool"
import type { CTFMission } from "../models/ctf"

interface Loaded {
  path: LearningPath
  prerequisites: LearningPath[]
  relatedChallenges: Challenge[]
  relatedMissions: CTFMission[]
  challengeTitleBySlug: Record<string, string>
}

const backLink =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors " +
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"

function BackToLearning() {
  return (
    <Link to="/learning" className={backLink}>
      <span className="rotate-180">
        <Icon size="sm">
          <ArrowRightIcon />
        </Icon>
      </span>
      Back to Learning
    </Link>
  )
}

function moduleChallengeLinks(
  module: LearningModuleModel,
  titleBySlug: Record<string, string>,
): ResolvedLink[] {
  return module.challengeSlugs
    .filter((slug) => slug in titleBySlug)
    .map((slug) => ({ slug, label: titleBySlug[slug] }))
}

function moduleToolLinks(module: LearningModuleModel): ResolvedLink[] {
  return module.toolSlugs
    .map((slug) => {
      const tool = getToolBySlug(slug)
      return tool ? { slug, label: tool.name } : undefined
    })
    .filter((link): link is ResolvedLink => link !== undefined)
}

export function LearningDetail() {
  const { slug } = useParams<{ slug: string }>()
  // `null` while loading; "not-found" for an invalid slug; otherwise the result.
  const [result, setResult] = useState<Loaded | "not-found" | null>(null)

  // Reset to loading during render when the slug changes (avoids a synchronous
  // setState inside the effect — matches the ChallengeDetail pattern).
  const [prevSlug, setPrevSlug] = useState(slug)
  if (slug !== prevSlug) {
    setPrevSlug(slug)
    setResult(null)
  }

  useEffect(() => {
    if (!slug) return
    let active = true
    Promise.all([
      localLearningProvider.getBySlug(slug),
      localLearningProvider.list(),
      localChallengeProvider.list(),
      localCTFProvider.listMissions(),
    ]).then(([found, allPaths, allChallenges, allMissions]) => {
      if (!active) return
      if (!found) {
        setResult("not-found")
        return
      }
      const titleBySlug: Record<string, string> = {}
      for (const challenge of allChallenges) titleBySlug[challenge.slug] = challenge.title
      const relatedChallenges = found.relatedChallenges
        .map((s) => allChallenges.find((c) => c.slug === s))
        .filter((c): c is Challenge => c !== undefined)
      const relatedMissions = allMissions.filter((m) =>
        m.learningPathSlugs.includes(found.slug),
      )
      setResult({
        path: found,
        prerequisites: resolvePrerequisites(found, allPaths),
        relatedChallenges,
        relatedMissions,
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
            title="Learning path not found"
            description="This learning path does not exist or may have been moved. Browse the full catalogue to find another."
          />
          <div className="mt-8">
            <BackToLearning />
          </div>
        </Section>
      </>
    )
  }

  if (result === null) {
    return (
      <Section>
        <p className="text-body text-muted">Loading learning path…</p>
      </Section>
    )
  }

  const { path, prerequisites, relatedChallenges, relatedMissions, challengeTitleBySlug } = result
  const relatedTools = path.relatedTools
    .map((s) => getToolBySlug(s))
    .filter((t): t is SecurityTool => t !== undefined)
  const progressPersisted = learningProgressProvider.supportsPersistence

  return (
    <>
      <Seo
        path={`/learning/${path.slug}`}
        title={`${path.title} | ${SITE.name}`}
        description={path.shortDescription}
      />

      <Section as="header" className="border-b border-border-subtle">
        <Reveal className="flex flex-col gap-5">
          <BackToLearning />
          <LearningPathHeader path={path} />
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#curriculum"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-background transition-[color,background-color] duration-200 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start learning
              <Icon size="sm">
                <ArrowRightIcon />
              </Icon>
            </a>
            <StatusDot
              status="idle"
              label={progressPersisted ? "Progress saved to your account" : "Self-guided — no sign-in required"}
            />
          </div>
        </Reveal>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-5">
              <SectionTitle as="h2" eyebrow="Objectives" title="What you will learn" />
              <LearningObjectiveList objectives={path.learningObjectives} />
            </div>

            <div id="curriculum" className="flex flex-col gap-5 scroll-mt-[var(--header-height)]">
              <SectionTitle
                as="h2"
                eyebrow="Curriculum"
                title="Modules"
                description="Expand each module to see its lessons, related challenges, and tools."
              />
              <Stagger as="ol" className="flex flex-col gap-3">
                {path.modules.map((module, index) => (
                  <StaggerItem as="li" key={module.id}>
                    <LearningModule
                      module={module}
                      index={index + 1}
                      defaultOpen={index === 0}
                      challengeLinks={moduleChallengeLinks(module, challengeTitleBySlug)}
                      toolLinks={moduleToolLinks(module)}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <Card className="flex flex-col gap-3">
              <h2 className="text-technical text-dim">Prerequisites</h2>
              {prerequisites.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {prerequisites.map((prereq) => (
                    <li key={prereq.id}>
                      <Link
                        to={`/learning/${prereq.slug}`}
                        className="text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                      >
                        {prereq.title}
                      </Link>
                      <p className="text-body text-sm text-muted">
                        {LEARNING_CATEGORY_LABEL[prereq.category]} · {prereq.difficulty}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-sm text-muted">
                  None — this is a good place to start.
                </p>
              )}
              <p className="text-body text-sm text-dim">
                Prerequisites are informational. Every path is open — nothing is locked.
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-technical text-dim">Progress</h2>
              <StatusDot status="idle" label="Not tracked yet" />
              <p className="text-body text-sm text-muted">
                Progress tracking will be available when Lab accounts are introduced. For now,
                each path is self-guided.
              </p>
            </Card>
          </aside>
        </div>
      </Section>

      {relatedChallenges.length > 0 ? (
        <Section className="border-t border-border-subtle">
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
          <SectionTitle as="h2" eyebrow="Toolkit" title="Related security tools" className="mb-8" />
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

      {relatedMissions.length > 0 ? (
        <Section className="border-t border-border-subtle">
          <SectionTitle as="h2" eyebrow="Capture" title="Practise in CTF" className="mb-8" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relatedMissions.map((mission) => (
              <StaggerItem as="li" key={mission.id}>
                <MissionCard mission={mission} to={`/ctf/${mission.slug}`} />
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      <Section className="border-t border-border-subtle">
        <Reveal>
          <SectionTitle as="h2" eyebrow="Keep going" title="Continue your learning" className="mb-8" />
        </Reveal>
        <BackToLearning />
      </Section>
    </>
  )
}

