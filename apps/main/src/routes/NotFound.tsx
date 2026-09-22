import { Link } from "react-router-dom";
import { Seo } from "../components/seo/Seo";
import { ROUTE_SEO } from "../config/seo";
import { Section } from "../components/ui/Section";
import { SectionTitle } from "../components/ui/SectionTitle";
import { Icon } from "../components/ui/Icon";
import { ArrowRightIcon } from "../components/ui/icons";

/** 404 fallback for unmatched routes. */
export function NotFound() {
  return (
    <>
      <Seo {...ROUTE_SEO.notFound} />
      <Section>
        <SectionTitle
          as="h1"
          eyebrow="404"
          title="Page not found"
          description="The page you are looking for could not be found or may have moved."
        />
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to home
          <Icon size="sm">
            <ArrowRightIcon />
          </Icon>
        </Link>
      </Section>
    </>
  );
}
