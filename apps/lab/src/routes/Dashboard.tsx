import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { Section } from "../components/ui/Section";
import { SectionTitle } from "../components/ui/SectionTitle";
import { Card, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatusDot } from "../components/ui/StatusDot";
import { Icon } from "../components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "../components/motion/Reveal";
import { ChallengeCard } from "../components/challenges/ChallengeCard";
import { LearningCard } from "../components/learning/LearningCard";
import { MissionCard } from "../components/ctf/MissionCard";
import {
  ArrowRightIcon,
  TargetIcon,
  BookIcon,
  FlagIcon,
  WrenchIcon,
} from "../components/ui/icons";
import { cn } from "../lib/cn";
import { localChallengeProvider } from "../providers/ChallengeProvider";
import { localLearningProvider } from "../providers/LearningProvider";
import { localCTFProvider } from "../providers/CTFProvider";
import type { Challenge } from "../models/challenge";
import type { LearningPath } from "../models/learning";
import type { CTFMission } from "../models/ctf";
import { securityTools } from "../data/tools";
import { DASHBOARD_HERO, LAB_AREAS, type AreaIcon } from "../content/dashboard";

const AREA_ICONS: Record<AreaIcon, () => ReactElement> = {
  target: TargetIcon,
  book: BookIcon,
  flag: FlagIcon,
  wrench: WrenchIcon,
};

const cardLink =
  "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg";

export function Dashboard() {
  const [featured, setFeatured] = useState<Challenge[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [missions, setMissions] = useState<CTFMission[]>([]);

  // Load through the providers so a real backend can replace the local sources
  // without touching this component.
  useEffect(() => {
    let active = true;
    localChallengeProvider.list().then((all) => {
      if (active) setFeatured(all.slice(0, 3));
    });
    localLearningProvider.list().then((all) => {
      if (active) setPaths(all.slice(0, 3));
    });
    localCTFProvider.listMissions().then((all) => {
      if (active) setMissions(all.slice(0, 3));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Seo {...ROUTE_SEO.dashboard} />

      <Section as="header" className="border-b border-border-subtle">
        <Reveal className="flex flex-col gap-6">
          <SectionTitle
            as="h1"
            eyebrow={DASHBOARD_HERO.eyebrow}
            title={DASHBOARD_HERO.title}
            description={DASHBOARD_HERO.description}
          />
          <StatusDot status="online" label="Lab environment online" />
        </Reveal>
      </Section>

      <Section aria-labelledby="areas-heading">
        <SectionTitle
          as="h2"
          eyebrow="Explore"
          title="Where to start"
          className="mb-10"
        />
        <Stagger
          as="ul"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {LAB_AREAS.map((area) => {
            const Glyph = AREA_ICONS[area.icon];
            return (
              <StaggerItem as="li" key={area.to}>
                <Link to={area.to} className={cn(cardLink, "block h-full")}>
                  <Card interactive className="flex h-full flex-col gap-4">
                    <Icon size="lg" boxed>
                      <Glyph />
                    </Icon>
                    <div className="flex flex-col gap-2">
                      <CardTitle className="text-base">{area.title}</CardTitle>
                      <p className="text-body text-sm text-muted">{area.description}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-accent">
                      {area.cta}
                      <span className="transition-transform group-hover:translate-x-0.5">
                        <Icon size="sm">
                          <ArrowRightIcon />
                        </Icon>
                      </span>
                    </span>
                  </Card>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>
      <Section aria-labelledby="featured-heading" className="border-t border-border-subtle">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <SectionTitle as="h2" eyebrow="Featured" title="Try a challenge" />
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            All challenges
            <Icon size="sm">
              <ArrowRightIcon />
            </Icon>
          </Link>
        </div>
        {featured.length > 0 ? (
          <Stagger as="ul" className="grid gap-4 md:grid-cols-3">
            {featured.map((challenge) => (
              <StaggerItem as="li" key={challenge.id}>
                <ChallengeCard challenge={challenge} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <p className="text-body text-muted">Loading challenges…</p>
        )}
      </Section>

      <Section aria-labelledby="learning-heading" className="border-t border-border-subtle">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <SectionTitle as="h2" eyebrow="Learning" title="Continue learning" />
          <Link
            to="/learning"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            All learning paths
            <Icon size="sm">
              <ArrowRightIcon />
            </Icon>
          </Link>
        </div>
        {paths.length > 0 ? (
          <Stagger as="ul" className="grid gap-4 md:grid-cols-3">
            {paths.map((path) => (
              <StaggerItem as="li" key={path.id}>
                <LearningCard path={path} to={`/learning/${path.slug}`} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <p className="text-body text-muted">Loading learning paths…</p>
        )}
      </Section>

      <Section aria-labelledby="ctf-heading" className="border-t border-border-subtle">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            as="h2"
            eyebrow="Capture"
            title="CTF missions"
            description="Scenario-driven exercises that combine multiple security concepts."
          />
          <Link
            to="/ctf"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            All missions
            <Icon size="sm">
              <ArrowRightIcon />
            </Icon>
          </Link>
        </div>
        {missions.length > 0 ? (
          <Stagger as="ul" className="grid gap-4 md:grid-cols-3">
            {missions.map((mission) => (
              <StaggerItem as="li" key={mission.id}>
                <MissionCard mission={mission} to={`/ctf/${mission.slug}`} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <p className="text-body text-muted">Loading missions…</p>
        )}
      </Section>

      <Section aria-labelledby="tools-heading" className="border-t border-border-subtle">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <SectionTitle as="h2" eyebrow="Utilities" title="Security tools" />
          <Link
            to="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            All tools
            <Icon size="sm">
              <ArrowRightIcon />
            </Icon>
          </Link>
        </div>
        <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {securityTools.map((tool) => (
            <StaggerItem as="li" key={tool.id}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{tool.name}</CardTitle>
                  {tool.available ? (
                    <Badge tone="green">Ready</Badge>
                  ) : (
                    <Badge tone="neutral">Soon</Badge>
                  )}
                </div>
                <p className="text-body text-sm text-muted">{tool.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
