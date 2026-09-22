# CYVANTAS Frontend Architecture

> Status: Architecture & design research only. No application source code has been
> written or modified as part of this document. This is a planning artifact.

---

## 1. Project Goals

CYVANTAS is a cybersecurity company and security-research platform being rebuilt from
an existing Google Blogger site into a modern React application. The rebuild is split
into two deployables:

- **Main website** (`apps/main`) — corporate/marketing + research surface, intended for
  `cyvantas.in`.
- **Security Lab** (`apps/lab`) — an educational lab (challenges, learning, CTF, tools),
  intended for `lab.cyvantas.in`.

Quality bar: technical, credible, modern, minimal, premium, fast, accessible, and
research-oriented. It must read as a serious security research company — not a generic
AI landing page and not a "hacker template."

Hard constraints carried from `CLAUDE.md`:

- No invented statistics, certifications, testimonials, clients, or vulnerability claims.
- Educational/authorized-use framing only; no real offensive infrastructure in the frontend.
- Preserve useful SEO/content from the Blogger export; never delete the backup.
- Minimal dependencies, small reusable components, accessible by default.

---

## 2. Existing Blogger Analysis

Source of truth: `existing-blogger-theme.xml` (Blogger layout v3, responsive, `lang=en`).
The theme is a hand-built, single-page marketing site plus a Blogger-driven research feed.
It already embodies most of the target design language.

### 2.1 Page title & meta (homepage)

- **Title:** `CYVANTAS | Cybersecurity, VAPT & Penetration Testing Services`
- **Meta description:** "CYVANTAS is a cybersecurity company helping organizations
  discover vulnerabilities, understand their attack surface, and build stronger defenses
  through VAPT, red teaming, cloud, API and application security testing."
- **Robots:** `index, follow, max-image-preview:large` (search/archive/error → `noindex, follow`)
- **Author:** `CYVANTAS`
- **theme-color:** `#060A10`
- **Canonical:** dynamic per page (`data:view.url.canonical`)

### 2.2 Open Graph

- `og:site_name` = CYVANTAS
- `og:title` (non-post) = **"CYVANTAS | Security Beyond The Surface"**
- `og:description` (non-post) = "CYVANTAS helps organizations discover vulnerabilities,
  understand their attack surface, and build stronger cyber defenses through offensive
  security testing."
- `og:image` = `https://cyvantas.in/assets/cyvantas-og.jpg` *(existence unverified — see §4)*
- `og:locale` = `en_IN`
- `og:type` = website / article (posts)

### 2.3 Twitter / X

- `twitter:card` = `summary_large_image`
- `twitter:site` = `@Prajeesh_kc`
- Title/description mirror OG.

### 2.4 Structured data (JSON-LD)

- **Organization**: name CYVANTAS, url `https://cyvantas.in/`, email `cyvantas@gmail.com`,
  slogan "Security beyond the surface.", `knowsAbout` (pentest, VA, appsec, API, cloud,
  red team, threat intel), founder **Prajeesh KC**, `sameAs` GitHub/Instagram/X.
- **WebSite**: with `SearchAction` (sitelinks search box → `/search?q=`).
- **ItemList of 12 Services** (homepage only) — see §2.7.
- **Article** + **BreadcrumbList** (post pages).

### 2.5 Navigation (primary + mobile)

`Home · About · Services · Methodology · Attack Surface · Research · Projects · Founder · Contact`
Primary CTA: **"Get Security Assessment"** → `#contact`. All links are in-page anchors on
a single-page homepage; research/labels/archive route to Blogger URLs.

### 2.6 Branding

- Wordmark: **CYVANTAS** with sub-label **"Offensive Intelligence"**.
- Tagline(s): "Security beyond the surface." / "Offensive Intelligence & Cybersecurity".
- Philosophy line: **"Find it. Understand it. Secure it."**
- Logo: inline SVG hexagon mark, cyan stroke (`#2FD6EA`) on `#060A10`, white "V" chevron.
- Favicon: same hexagon as a data-URI SVG.

### 2.7 Company information & services

- Focus: Offensive Security; Specialization: VAPT / Application Security;
  Research: Vulnerability Research; Approach: Evidence Driven;
  Mission: Reduce Real-World Exposure; **Based in: India**; Contact: `cyvantas@gmail.com`.
- **12 services** (id · phase · title):
  1. SVC-01 ASSESS — Vulnerability Assessment & Penetration Testing
  2. SVC-02 ASSESS — Web Application Security Testing
  3. SVC-03 ASSESS — API Security Testing
  4. SVC-04 ASSESS — Network Security Assessment
  5. SVC-05 ASSESS — Mobile Application Security
  6. SVC-06 ASSESS — Cloud Security Assessment
  7. SVC-07 ENGAGE — Red Teaming & Adversary Simulation
  8. SVC-08 ASSESS — Security Configuration Review
  9. SVC-09 INTEL — OSINT & Threat Intelligence
  10. SVC-10 ADVISE — Cybersecurity Consulting
  11. SVC-11 BUILD — Security Automation
  12. SVC-12 ADVISE — Security Awareness & Best Practices

  Each card has: title, one-line description, an **Objective**, and a "Typical coverage"
  disclosure list — a ready-made data shape for the React `Service` model.

### 2.8 About / founder

- **Founder:** Prajeesh KC — "Founder / Cybersecurity Researcher". Two-paragraph bio
  (offensive-security perspective, vulnerability research, tooling, automation, open source).
- Focus chips: Cybersecurity, Offensive security, Vulnerability research, Security
  automation, Open-source tooling.
- Socials: GitHub `kcprajeesh`, X `@Prajeesh_kc`, Instagram `@Prajeesh_kc`.
- Founder photo: hosted on Blogger CDN (`blogger.googleusercontent.com/...`) — must be
  re-hosted locally (see §4/§19).

### 2.9 Contact information

- Email: **`cyvantas@gmail.com`** (only contact channel; no phone/address published).
- Contact form fields: name*, business email*, organization, service (12 + "Not sure yet"),
  timeline (Flexible / <1mo / 1–3mo / 3+mo), message*, honeypot (`website`).
- Form currently posts to a **Google Apps Script endpoint** (`script.google.com/macros/...`)
  with `mailto:` fallback — see §4 and §16.

### 2.10 Other notable content

- **Methodology** (Blogger): six stages **Discover → Map → Test → Validate → Exploit →
  Remediate**, each with an "Output". ⚠️ Differs from `CLAUDE.md` (Discover → Map → Test →
  Validate → **Report → Harden**). See §4.
- **Attack surface** section: 9-layer model (Internet → Domains → Subdomains → Web Apps →
  APIs → Cloud → Endpoints → Identity → Third-Party Dependencies) with an interactive SVG.
- **Why CYVANTAS** principles P-01..P-05 (Evidence Driven, Attack-Path Thinking, Real-World
  Validation, Research Mindset, Actionable Reporting).
- **Projects**: "Vibe Pentesterlab", "CYVANTAS AI Agent", plus generic tooling/research
  categories — all linking to GitHub.
- **Research feed**: Blogger posts with labels/categories (Vulnerability Research, Web
  Security, API Security, Cloud Security, Mobile Security, Offensive Security, Threat
  Intelligence, Tools).
- **Legal pages**: Privacy Policy, Terms of Use, Responsible Disclosure (Blogger static pages).
- **Responsible-disclosure / authorized-scope disclaimers** repeated throughout.
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (mono).
- Security headers present in theme: CSP (`object-src 'none'; base-uri 'self'`),
  `referrer: strict-origin-when-cross-origin`.

---

## 3. Information to Preserve

Carry forward into the React build (verbatim where it is real content, adapted where it
is Blogger markup):

- All copy: hero, about, services (12 cards incl. objectives + coverage), methodology,
  attack-surface layers, why/principles, founder bio, contact copy, disclaimers.
- SEO: homepage title, meta description, OG/Twitter metadata, canonical strategy,
  Organization + WebSite + Service JSON-LD, theme-color, robots policy.
- Branding: CYVANTAS wordmark + "Offensive Intelligence" sublabel, hexagon logo/favicon,
  taglines, philosophy line, color/type tokens (§10).
- Real facts: email `cyvantas@gmail.com`, founder Prajeesh KC, social handles, "Based in
  India", GitHub `kcprajeesh`.
- Navigation IA and the "Get Security Assessment" CTA.
- Legal + responsible-disclosure content and the authorized-scope framing.
- Accessibility affordances already present: skip link, `sr-only`, focus-visible ring,
  reduced-motion guards, honeypot field.

---

## 4. Information Requiring Verification

Do **not** guess these — confirm with the site owner before shipping:

1. **Methodology stages.** Blogger uses 6 stages (…Validate → **Exploit → Remediate**);
   `CLAUDE.md` specifies 6 (…Validate → **Report → Harden**). Which is canonical?
2. **OG image** `https://cyvantas.in/assets/cyvantas-og.jpg` — does the asset exist / should
   it be regenerated for the React build?
3. **Founder photo** — currently a Blogger CDN URL; obtain the original to re-host locally.
4. **Contact form backend** — the embedded Google Apps Script endpoint: keep, replace, or
   move behind a proper API? (It is a live endpoint URL, not a secret, but should not be
   hard-coded in client source long-term — see §16.)
5. **Twitter/X handle** — theme uses `@Prajeesh_kc` (personal). Is there a company handle?
6. **Projects** ("Vibe Pentesterlab", "CYVANTAS AI Agent") — real, current, and safe to
   feature? Any real repo URLs beyond the GitHub profile?
7. **Legal pages** (Privacy / Terms / Responsible Disclosure) — need the actual body text;
   only the Blogger page slugs are known.
8. **Lab content** — the Blogger site has **no** Security Lab; all lab challenges, learning
   content, and CTF data are net-new and must be authored (mock data initially).
9. **Any numeric claims** — none exist in the export; do not introduce any.

---

## 5. Application Architecture

### 5.1 Monorepo shape

Two independent Vite apps already scaffolded under `apps/`:

```
apps/
  main/    # cyvantas.in      (Vite + React 19 + TS + Tailwind v4 + Motion — starter state)
  lab/     # lab.cyvantas.in  (empty — to be scaffolded identically)
```

`apps/main` currently holds the default Vite starter (`App.tsx` counter). Dependencies
already installed: `react@19`, `react-dom@19`, `motion@13`, `tailwindcss@4` +
`@tailwindcss/vite`, TS 6, ESLint 10. No router yet.

### 5.2 Shared code strategy

Because main and lab share tokens, primitives, and SEO/motion utilities, introduce a
lightweight shared layer. Recommended (lowest-friction) option:

- A `packages/ui` (design tokens + primitives) and `packages/lib` (hooks, SEO, motion
  presets, types) consumed by both apps via workspace aliases, **or**
- If avoiding workspace tooling now: a `shared/` folder referenced through Vite path
  aliases (`@shared/*`) in each app's `vite.config.ts` + `tsconfig`.

Decision deferred to implementation; either keeps duplication out of tokens/primitives.
Start with path-alias `shared/` to keep dependency count minimal (per `CLAUDE.md`).

### 5.3 Routing

- Add **React Router** (single new dependency) to each app. The main site becomes true
  multi-route (`/`, `/services`, `/research`, `/about`, `/contact`) instead of one-page
  anchors, while preserving anchor deep-links within `/`.
- Lab is multi-route from day one (§7).

### 5.4 Rendering

- Client-rendered SPA via Vite is the baseline. For SEO-critical pages, plan an optional
  pre-render/SSG step (e.g. `vite-plugin-ssg`-style prerender of static routes) in a later
  phase — not required for v1, but the routing/`<Head>` architecture (§14) is designed so
  it can be added without rework.

---

## 6. Main Website Architecture

Routes and the sections they compose (content all sourced from §2):

| Route        | Purpose | Primary sections |
|--------------|---------|------------------|
| `/`          | Home    | Nav → Hero → Capabilities snapshot → About → Methodology → Attack Surface → Why → Research teaser → **Lab intro** → Contact CTA → Footer |
| `/services`  | Services detail | Services grid (12 cards + objectives + coverage), engagement framing |
| `/research`  | Research index | Post list + category filter (mock/local data until backend) |
| `/about`     | About + Founder | About copy, principles, founder bio + socials |
| `/contact`   | Contact | Contact copy + form (§16) |

Note: `CLAUDE.md` lists a "Security Lab introduction" section on the homepage — this is the
bridge to `apps/lab`. Add it even though the Blogger site predates the lab.

Page/section conventions:

- Each **page** = a thin route component composing **section** components.
- Each **section** consumes typed data from a `content/` module (no copy hard-coded inside
  presentational components), making future CMS/backend swap trivial.

---

## 7. Security Lab Architecture

Routes (`lab.cyvantas.in`):

| Route                      | Purpose |
|----------------------------|---------|
| `/`                        | Dashboard — overview, progress, featured challenges, "Learn. Break. Defend." |
| `/challenges`              | Filterable challenge catalog (category, difficulty, status) |
| `/challenges/:slug`        | Challenge detail — objectives, hints (progressive), prerequisites, tags |
| `/learning`                | Learning tracks / modules |
| `/ctf`                     | CTF events / board |
| `/tools`                   | Client-side security tools (§ tools list) |

Concept: **CYVANTAS SECURITY LAB — Learn. Break. Defend.**
Categories: Web Security · Authentication · API Security · Reconnaissance · CTF.

Lab-specific architecture:

- **Local-first data**: challenges/tools ship as typed mock data (`content/challenges.ts`),
  with a data-access layer (§18) so a real API can replace it without touching UI.
- **Progress/state**: completion + hints-revealed persisted to `localStorage` (no backend
  in v1), behind a small `useProgress` hook so it can move to a server later.
- **Tools** run entirely client-side (JWT decode, Base64/URL encode, JSON format, hash id,
  regex test, CSP builder, header generator). No data leaves the browser (§16).

---

## 8. Component Architecture

Hierarchy (both apps share the same layering):

```
App
└─ RouterProvider
   └─ <RootLayout>            # header, footer, skip-link, <main>, page transitions
      └─ <Page>               # route-level; composes sections; owns <SEO/> head
         └─ <Section>         # Hero, Services, Methodology, Challenges… (data-driven)
            └─ primitives      # Button, Card, Badge/Chip, Eyebrow, Terminal, StatusDot…
```

Component tiers:

1. **Primitives / UI** (shared): `Button`, `Card`, `Badge`/`Chip`, `Eyebrow`, `SectionTitle`,
   `StatusDot`, `Terminal`/`CodeBlock`, `Tag`, `Field`/`Input`/`Select`/`Textarea`, `Icon`,
   `VisuallyHidden`, `SkipLink`.
2. **Composite / patterns**: `Navbar`, `MobileMenu`, `Footer`, `ServiceCard`,
   `MethodologyStage`, `AttackSurfaceDiagram`, `PostCard`, `ChallengeCard`, `ChallengeFilter`,
   `ToolPanel`, `ContactForm`.
3. **Sections**: page-composing blocks that map 1:1 to §6/§7.
4. **Pages / routes**: thin composition + data + `<SEO>`.

Rules (from `CLAUDE.md`): small, single-purpose, semantically named components; no giant
components; no duplicated markup; copy comes from data modules, not JSX literals.

---

## 9. Design System

A premium research-lab aesthetic derived directly from the existing Blogger skin (already
on-brand), formalized into tokens (§10) and component specs below.

- **Foundation**: deep near-black (`#060A10`) with layered charcoal panels; hairline borders
  instead of heavy dividers; restrained radial lighting; optional fine grid + subtle noise
  as low-opacity backgrounds only.
- **Accents**: cyan (`#2FD6EA`) primary, green (`#38D99A`) for "live/entry-point/success",
  amber/danger reserved strictly for severity semantics — never decoration.
- **Typography**: Space Grotesk (display), Inter (body), JetBrains Mono (mono, technical
  content and eyebrows only).
- **Restraint**: minimal glass (only header backdrop-blur with a solid fallback); no Matrix
  rain, skulls, or excessive neon; glow used sparingly on focus/hover.

### Component specs

- **Buttons**: `primary` (cyan bg, dark text), `ghost` (transparent, hairline border → cyan
  on hover), `sm` variant. Min height 44px (touch target). Transitions 150–200ms.
- **Cards**: panel bg, hairline border, `--r-lg` radius; hover raises border to cyan-line +
  faint cyan wash; `<details>`-style progressive disclosure for "learn more"/coverage.
- **Badges / Chips**: mono uppercase, hairline; color variants `cyan`, `green`, and
  **severity** (`critical/high` danger, `medium` amber, `low` green, `info` cyan).
- **Navigation**: sticky, translucent header with blur fallback; animated underline on
  active/hover; mobile drawer with numbered items (01–09) and body scroll-lock.
- **Forms**: visible labels, error text adjacent to field, `aria-describedby`, honeypot,
  44px targets, focus-visible rings.
- **Code / Terminal**: mono, panel bg, optional typing animation (§11); read-only, decorative.
- **Status indicators**: `StatusDot` with optional pulsing "ping" (reduced-motion aware) for
  "active/offered/online" states.

---

## 10. Design Tokens

Lifted from the Blogger `:root` (authoritative brand values) and expressed as CSS custom
properties + Tailwind v4 `@theme` tokens.

```css
:root {
  /* Backgrounds & surfaces */
  --bg:#060A10; --panel:#0D1420; --panel-2:#111C2A;
  --line:#1C2733; --line-2:#141E2A;
  /* Text */
  --text:#E8EDF4; --muted:#8A97A8; --dim:#576474;
  /* Accents */
  --cyan:#2FD6EA; --cyan-soft:rgba(47,214,234,.10); --cyan-line:rgba(47,214,234,.35);
  --green:#38D99A; --green-soft:rgba(56,217,154,.12);
  --danger:#FF8A8A; --amber:#F2C879;
  /* Type */
  --f-display:'Space Grotesk', system-ui, sans-serif;
  --f-body:'Inter', system-ui, sans-serif;
  --f-mono:'JetBrains Mono', ui-monospace, monospace;
  /* Radius */
  --r-sm:6px; --r-md:10px; --r-lg:14px;
  /* Layout */
  --maxw:1200px; --hdr:64px; --gut:clamp(16px,4vw,32px);
}
```

- **Spacing scale**: 4px base; section padding `clamp(64px,9vw,112px)`; gutter token above.
- **Radius**: sm 6 / md 10 / lg 14.
- **Borders**: 1px hairlines using `--line` / `--line-2`; accent borders use `--cyan-line`.
- **Shadows**: avoid heavy drop shadows; use border + faint accent glow (`0 0 0` ping,
  `--cyan-soft` wash) for elevation cues.
- **Backgrounds/effects**: radial lighting + fine grid + noise as opt-in low-opacity layers.
- **Type scale**: body 16px/1.65; section titles `clamp(1.7rem,4.2vw,2.75rem)`; eyebrow 12px
  mono uppercase with `//` prefix; hero display large + tight tracking.

These become Tailwind theme tokens (`--color-*`, `--font-*`, `--radius-*`) so utilities and
components reference **semantic** tokens, never raw hex (per UI/UX Pro Max rule #6).

---

## 11. Motion Strategy

Library: **Motion for React** (already installed). All patterns are centralized as reusable
variants/hooks in `shared/motion/` and are **reduced-motion aware** (a `useReducedMotion`
guard collapses distance/opacity-only or disables entirely).

Timing (from `CLAUDE.md`): micro-interactions 150–250ms; larger transitions 300–600ms.

| Pattern | Implementation |
|---------|----------------|
| Page transitions | `AnimatePresence` on the router outlet; fade/short-rise, ≤300ms |
| Hero reveal | Sequenced stagger of eyebrow → h1 → sub → actions |
| Text reveal | Per-line/word variant, opacity+`y`, small stagger |
| Staggered sections | `whileInView` container with `staggerChildren` |
| Scroll reveal | `whileInView` + `viewport once` (replaces Blogger `.reveal` IO) |
| Card hover | CSS transition preferred; Motion only if spring/layout needed |
| Navigation | Underline scaleX; header state on scroll |
| Mobile menu | Drawer slide + backdrop fade; focus trap + scroll lock |
| Challenge filtering | `layout` animations + `AnimatePresence` on the grid |
| Terminal typing | Timed character reveal; decorative, skipped under reduced-motion |
| Status indicators | Pulsing "ping" keyframe; disabled under reduced-motion |
| Counters | Only for **real** values; `animate` count-up on inView (no fake stats) |

Guidelines: animation must convey meaning or hierarchy; no perpetual/idle animation; simple
hover = CSS; Motion only when state, sequencing, layout, or scroll is involved.

---

## 12. Responsive Strategy

- **Mobile-first**, fluid type/spacing via `clamp()` (already the Blogger approach).
- Verified breakpoints: **320, 375, 390, 414, 768, 1024, 1280, 1440, 1920**.
- Container `max-width:1200px` with `clamp` gutters; no fixed-px widths; no horizontal scroll;
  zoom never disabled.
- Layout primitives: CSS grid for section grids (services, challenges, footer), flex for nav.
- Nav collapses to a numbered drawer below the desktop breakpoint; touch targets ≥44×44 with
  ≥8px spacing.

---

## 13. Accessibility

Baseline (meets UI/UX Pro Max CRITICAL rules and `CLAUDE.md`):

- Semantic HTML + sequential headings; landmark regions (`header`/`nav`/`main`/`footer`).
- **Skip link** to `#main`; `.sr-only` utility for screen-reader-only text.
- `:focus-visible` rings (2px cyan, offset) on all interactive elements — never removed.
- Full keyboard nav incl. mobile drawer focus trap; predictable back behavior with router.
- ARIA only where needed (icon-only buttons, nav labels, form errors via `aria-describedby`).
- Color never the sole signal (severity chips pair color + text/icon).
- Contrast ≥4.5:1 verified against `--text`/`--muted` on `--bg`/panels.
- `prefers-reduced-motion` respected globally (§11) and for the status "ping".
- Forms: visible labels, adjacent errors, `aria-required`, honeypot for spam.

---

## 14. SEO

- **Per-route head management** via a small `<SEO>` component (React 19 native `<title>`/
  `<meta>` hoisting, or a minimal head lib) — title, description, canonical, OG, Twitter.
- Port the Blogger metadata (§2.1–2.4) as route-level defaults; homepage title/description
  preserved verbatim.
- **JSON-LD**: Organization + WebSite site-wide; Service `ItemList` on `/` and `/services`;
  `Article`/`BreadcrumbList` on research posts when the research backend lands.
- Canonical URLs per route; `robots` policy mirrors Blogger (index main, noindex search).
- `theme-color`, `og:locale=en_IN`, `twitter:site` carried over.
- Generate `sitemap.xml` + `robots.txt` at build.
- Architecture kept SSG-ready (§5.4) so metadata can be server-rendered for crawlers later.

---

## 15. Performance

- Vite build; route-based **code splitting** (lazy routes), especially lab tools.
- Fonts: `preconnect` + `display=swap` + subset the three families; self-host later if needed.
- Images: prefer SVG (logo, diagrams are already SVG); WebP/AVIF + lazy-load + explicit
  dimensions to keep **CLS < 0.1**.
- Avoid layout thrash; animate transform/opacity only.
- Keep dependencies minimal (router + motion + tailwind are the core adds).
- Budget: fast first paint on the dark hero; defer non-critical JS (tools, diagrams).

---

## 16. Security Considerations

- **No secrets in client code.** The Blogger contact form embeds a Google Apps Script
  endpoint; in React, route submissions through an env-configured endpoint
  (`import.meta.env.VITE_CONTACT_ENDPOINT`) or a serverless function — never hard-code, and
  keep the honeypot + basic validation. Confirm the backend decision (§4.4).
- Preserve the theme's **CSP** intent (`object-src 'none'; base-uri 'self'`) and
  `referrer: strict-origin-when-cross-origin`; tighten CSP for the SPA at deploy.
- External links use `rel="noopener noreferrer"`.
- **Security tools are client-side**: JWT/Base64/URL/JSON/hash/regex/CSP/header tools must
  process input **in-browser only** — no network calls, no logging of user input.
- Lab challenges are **educational/authorized-use only**; no real offensive infrastructure;
  keep the responsible-disclosure + authorized-scope disclaimers prominent.
- Sanitize any research/markdown content rendered from a future CMS.
- Never commit `.env`/keys/tokens (already covered by `.gitignore`).

---

## 17. Future Backend Architecture

Designed-for, not built now:

- **Content/API boundary**: all data flows through a typed data-access layer (§18) with a
  `MockProvider` today and an `HttpProvider` later — UI is provider-agnostic.
- Likely services: research/blog content (CMS or headless), challenge catalog + submissions,
  CTF scoring, user progress/auth. Keep these as separate concerns behind stable DTOs.
- Auth (if added): token handling server-side; never store long-lived secrets in the client.
- Contact + challenge-submission endpoints as serverless functions.
- Keep DTOs versioned and decoupled from view models so the frontend absorbs schema changes
  in the mapping layer only.

---

## 18. Data Models

Typed models live in `shared/types`. Content modules provide mock data implementing them.

### 18.1 Service

```ts
type ServicePhase = 'ASSESS' | 'ENGAGE' | 'INTEL' | 'ADVISE' | 'BUILD';

interface Service {
  id: string;            // e.g. "SVC-01"
  slug: string;
  title: string;
  phase: ServicePhase;
  summary: string;
  objective: string;
  coverage: string[];    // "Typical coverage" bullets
}
```

### 18.2 Methodology stage

```ts
interface MethodologyStage {
  order: number;         // 1..6
  name: string;          // Discover, Map, Test, Validate, … (⚠ see §4.1)
  description: string;
  output: string;
}
```

### 18.3 Research post

```ts
interface ResearchPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  labels: string[];      // Web Security, API Security, …
  publishedAt: string;   // ISO8601
  updatedAt?: string;
  coverImage?: string;
  authorName: string;
}
```

### 18.4 Challenge (Security Lab)

```ts
type ChallengeCategory =
  | 'Web Security' | 'Authentication' | 'API Security' | 'Reconnaissance' | 'CTF';
type Difficulty = 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Expert';
type ChallengeStatus = 'not-started' | 'in-progress' | 'completed';

interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: Difficulty;
  points: number;
  estimatedMinutes: number;
  objectives: string[];
  hints: string[];         // progressively revealed
  status: ChallengeStatus; // client-derived from progress store in v1
  tags: string[];
  prerequisites: string[]; // challenge slugs
}
```

### 18.5 Security tool

```ts
type ToolId =
  | 'jwt-decoder' | 'base64' | 'url-codec' | 'json-formatter'
  | 'hash-identifier' | 'regex-tester' | 'csp-builder' | 'header-generator';

interface SecurityTool {
  id: ToolId;
  title: string;
  description: string;
  clientOnly: true;        // invariant: never sends input off-device
}
```

### 18.6 Progress (local)

```ts
interface ChallengeProgress {
  challengeSlug: string;
  status: ChallengeStatus;
  hintsRevealed: number;
  completedAt?: string;
}
```

All persisted via a `useProgress` hook (localStorage) so it can migrate to a server store.

---

## 19. Blogger Migration Strategy

The **existing Blogger site must stay live and untouched** while React is built.
`existing-blogger-theme.xml` is a read-only reference/backup — never edit or delete it.

```
Blogger (live, cyvantas.in)
        │  extract content + SEO + tokens (done in this doc)
        ▼
React development (apps/main, apps/lab)   ← build against mock/local data
        ▼
Local testing (vite dev; verify §12 breakpoints, a11y, SEO tags)
        ▼
Temporary deployment (preview subdomain / hosting preview URL — NOT the apex)
        ▼
Production testing (crawl SEO, compare metadata, redirects, Core Web Vitals)
        ▼
DNS migration (LATER — not now): cut cyvantas.in / lab.cyvantas.in to the new hosts
```

Migration tasks:

- Re-host assets currently on Blogger CDN (founder photo, OG image) into app `public/`.
- Recreate legal + responsible-disclosure pages from their real body text (§4.7).
- Preserve URL slugs where they carry SEO value; add redirects for changed paths.
- Keep research posts sourced from a provider so the Blogger feed → CMS transition is a
  data-layer swap, not a rewrite.
- **Do not modify DNS** as part of this phase (explicit constraint).

---

## 20. Implementation Roadmap

Maps `CLAUDE.md`'s staged build to concrete milestones:

1. **Architecture** — this document (done).
2. **Design system & tokens** — Tailwind v4 `@theme` + CSS vars from §10; primitives.
3. **App scaffolding** — add router to `apps/main`; scaffold `apps/lab`; shared aliases.
4. **Navigation & layout** — Navbar, MobileMenu, Footer, RootLayout, SkipLink.
5. **Hero** — main homepage hero + attack-surface visual.
6. **Core sections** — About, Services (12 cards), Methodology (confirm §4.1), Why, Attack Surface.
7. **Research** — index + filter on mock `ResearchPost` data.
8. **Security Lab shell** — dashboard, routes, layout, "Learn. Break. Defend."
9. **Challenge system** — catalog, filtering, detail, hints, local progress.
10. **Security tools** — client-side JWT/Base64/URL/JSON/hash/regex/CSP/header tools.
11. **Accessibility pass** — keyboard, focus, contrast, reduced-motion, ARIA audit.
12. **SEO** — `<SEO>` per route, JSON-LD, sitemap/robots, verify against Blogger metadata.
13. **Performance** — code-split, fonts, images, CWV budget.
14. **Security review** — CSP, contact endpoint, tool isolation, disclaimers.
15. **Migration** — re-host assets, legal pages, preview deploy, prod testing (DNS deferred).

---

## Recommended Implementation Order

A practical, dependency-ordered plan (each phase leaves the app shippable):

- **Phase 0 — Foundations.** Lock tokens (§10) into Tailwind v4 `@theme`; build primitives
  (Button, Card, Badge/Chip, Eyebrow, SectionTitle, StatusDot, Icon, form fields). Add
  reduced-motion-aware Motion presets. *Blocks everything; do first.*
- **Phase 1 — Main shell.** Router + RootLayout + Navbar/MobileMenu/Footer + SkipLink +
  page-transition wrapper + `<SEO>` scaffold. Port homepage title/OG/Twitter/JSON-LD.
- **Phase 2 — Main content.** Hero → Capabilities snapshot → About → Methodology → Attack
  Surface → Why → Research teaser → Lab intro → Contact CTA. All copy from `content/`
  modules (verbatim from §2). Confirm methodology wording (§4.1) before finalizing.
- **Phase 3 — Main routes.** `/services`, `/about`, `/research` (mock), `/contact` (form
  wired to env endpoint + honeypot + validation).
- **Phase 4 — Lab foundation.** Scaffold `apps/lab` on the same tokens/primitives; Dashboard
  + routing + "Learn. Break. Defend." shell.
- **Phase 5 — Challenges.** Typed mock catalog → catalog page (filter/sort) → detail
  (objectives, progressive hints, prerequisites) → `useProgress` (localStorage).
- **Phase 6 — Tools.** Ship client-only tools incrementally (JWT decoder and Base64 first —
  highest value, simplest); enforce the "no network" invariant.
- **Phase 7 — Learning & CTF.** Learning tracks and CTF board on mock data.
- **Phase 8 — Hardening.** Full a11y audit, SEO/JSON-LD completion, performance budget, CSP
  + security review, sitemap/robots.
- **Phase 9 — Migration prep.** Re-host Blogger-CDN assets, author legal + responsible-
  disclosure pages, preview deploy, production testing. **DNS cutover intentionally deferred.**

Verification gates: run `build` + `lint` after each phase; test the §12 breakpoints and the
golden-path flows in a browser before marking a phase done.
