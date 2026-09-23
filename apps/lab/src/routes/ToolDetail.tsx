import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { SITE } from "../config/site";
import { Section } from "../components/ui/Section";
import { SectionTitle } from "../components/ui/SectionTitle";
import { StatusDot } from "../components/ui/StatusDot";
import { Icon } from "../components/ui/Icon";
import { ArrowRightIcon } from "../components/ui/icons";
import { Reveal } from "../components/motion/Reveal";
import { ToolIconGlyph } from "../components/tools/ToolIconGlyph";
import { ToolNav } from "../components/tools/ToolNav";
import { JwtPanel } from "../components/tools/JwtPanel";
import { Base64Panel } from "../components/tools/Base64Panel";
import { UrlPanel } from "../components/tools/UrlPanel";
import { JsonPanel } from "../components/tools/JsonPanel";
import { HashPanel } from "../components/tools/HashPanel";
import { CspPanel } from "../components/tools/CspPanel";
import { HeadersPanel } from "../components/tools/HeadersPanel";
import { RegexPanel } from "../components/tools/RegexPanel";
import { getToolBySlug } from "../data/tools";

const PANELS: Record<string, () => ReactElement> = {
  jwt: JwtPanel,
  base64: Base64Panel,
  url: UrlPanel,
  json: JsonPanel,
  hash: HashPanel,
  csp: CspPanel,
  headers: HeadersPanel,
  regex: RegexPanel,
};

const backLink =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors " +
  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

function BackToTools() {
  return (
    <Link to="/tools" className={backLink}>
      <span className="rotate-180">
        <Icon size="sm">
          <ArrowRightIcon />
        </Icon>
      </span>
      All tools
    </Link>
  );
}

export function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const tool = slug ? getToolBySlug(slug) : undefined;
  const Panel = tool ? PANELS[tool.slug] : undefined;

  if (!tool || !Panel) {
    return (
      <>
        <Seo {...ROUTE_SEO.notFound} />
        <Section>
          <SectionTitle
            as="h1"
            eyebrow="404"
            title="Tool not found"
            description="This tool does not exist or may have been moved. Browse the full set of security tools."
          />
          <div className="mt-8">
            <BackToTools />
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <Seo
        path={`/tools/${tool.slug}`}
        title={`${tool.name} | ${SITE.name}`}
        description={tool.description}
      />

      <Section as="header" className="border-b border-border-subtle">
        <Reveal className="flex flex-col gap-5">
          <BackToTools />
          <div className="flex items-center gap-4">
            <ToolIconGlyph icon={tool.icon} boxed size="lg" />
            <SectionTitle as="h1" eyebrow="Security Tools" title={tool.name} />
          </div>
          <p className="text-body max-w-[65ch] text-muted">{tool.description}</p>
          <StatusDot status="online" label="Runs locally — no data leaves your browser" />
        </Reveal>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
          <Reveal as="div">
            <Panel />
          </Reveal>
          <aside className="lg:order-last">
            <ToolNav />
          </aside>
        </div>
      </Section>
    </>
  );
}
