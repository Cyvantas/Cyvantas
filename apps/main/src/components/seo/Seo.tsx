import { SITE } from "../../config/site";
import { OG_IMAGE, TWITTER_SITE, buildSiteJsonLd, type RouteSeo } from "../../config/seo";

/**
 * Route-level head management. React 19 hoists `<title>`/`<meta>`/`<link>`
 * rendered anywhere in the tree into `<head>`, so each page renders `<Seo>`
 * with its own metadata (title, description, canonical, OG, Twitter).
 * On the homepage it also emits site-level Organization/WebSite JSON-LD.
 */
export function Seo({ path, title, description, ogTitle }: RouteSeo) {
  const canonical = `${SITE.url}${path === "/" ? "" : path}`;
  const resolvedOgTitle = ogTitle ?? title;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={OG_IMAGE} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_SITE} />
      <meta name="twitter:title" content={resolvedOgTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {path === "/" ? (
        <script
          type="application/ld+json"
          // Static, trusted site data (config only) — no user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSiteJsonLd()) }}
        />
      ) : null}
    </>
  );
}
