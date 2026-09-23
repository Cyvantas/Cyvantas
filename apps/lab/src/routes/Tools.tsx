import { Link } from "react-router-dom";
import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { PageHero } from "../components/sections/PageHero";
import { Section } from "../components/ui/Section";
import { Card, CardTitle } from "../components/ui/Card";
import { StatusDot } from "../components/ui/StatusDot";
import { Icon } from "../components/ui/Icon";
import { ArrowRightIcon } from "../components/ui/icons";
import { Stagger, StaggerItem } from "../components/motion/Reveal";
import { ToolIconGlyph } from "../components/tools/ToolIconGlyph";
import { securityTools } from "../data/tools";

const cardLink =
  "group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Tools index — browser-based security utilities, each on its own /tools/:slug page. */
export function Tools() {
  return (
    <>
      <Seo {...ROUTE_SEO.tools} />
      <PageHero
        eyebrow="Security Tools"
        title="Browser-based security tools"
        description="Educational utilities that process everything locally in your browser. No tool input is ever sent to a server."
      />
      <Section pad={false} className="pb-[var(--section-pad)]">
        <div className="mb-8">
          <StatusDot status="online" label="All tools run locally — no data leaves your browser" />
        </div>
        <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {securityTools.map((tool) => (
            <StaggerItem as="li" key={tool.id}>
              <Link
                to={`/tools/${tool.slug}`}
                className={cardLink}
                aria-label={`Open ${tool.name}`}
              >
                <Card interactive className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <ToolIconGlyph icon={tool.icon} boxed />
                    <span className="transition-transform group-hover:translate-x-0.5">
                      <Icon size="sm">
                        <ArrowRightIcon />
                      </Icon>
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                    <p className="text-body text-sm text-muted">{tool.description}</p>
                  </div>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
