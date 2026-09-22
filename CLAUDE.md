# CYVANTAS — Project Instructions

## Project

CYVANTAS is a modern cybersecurity company and security research platform.

Main website:
https://cyvantas.in

Security laboratory:
https://lab.cyvantas.in

The project is being rebuilt from an existing Google Blogger website into a modern React application.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Motion for React
- UI/UX Pro Max
- 21st.dev components where useful

## Applications

apps/main/
- Main CYVANTAS website
- Intended domain: cyvantas.in

apps/lab/
- CYVANTAS Security Lab
- Intended domain: lab.cyvantas.in

## Design Direction

Create a premium cybersecurity research-lab aesthetic.

Visual characteristics:

- Deep black / charcoal foundation
- Subtle cyan and green technical accents
- High contrast typography
- Clean modern sans-serif typography
- Monospace typography only for technical content
- Fine grid patterns
- Subtle noise
- Radial lighting
- Restrained glow effects
- Strong spacing and visual hierarchy
- Responsive design

Avoid:

- Generic hacker imagery
- Matrix rain
- Skulls
- Excessive neon
- Excessive glassmorphism
- Fake statistics
- Fake customer logos
- Fake testimonials
- Fake security certifications
- Fake vulnerability claims

The design should feel like a serious cybersecurity research company rather than a gaming/hacker template.

## Animation

Use Motion for meaningful UI animation.

Preferred animation types:

- Hero reveal
- Text reveal
- Staggered sections
- Scroll-triggered reveals
- Card hover interactions
- Navigation transitions
- Mobile menu transitions
- Challenge filtering transitions
- Terminal animations
- Security status indicators
- Page transitions where appropriate

Animation guidelines:

- Micro interactions: approximately 150–250ms
- Larger transitions: approximately 300–600ms
- Keep animation subtle and purposeful
- Respect prefers-reduced-motion
- Avoid unnecessary continuous animations

Use CSS for simple hover states.
Use Motion when animation requires state, sequencing, layout, or scroll interaction.

## Main Website

Routes:

/
 /services
 /research
 /about
 /contact

Main sections:

1. Navigation
2. Hero
3. Security capabilities
4. Methodology
5. Research / intelligence
6. Security Lab introduction
7. Contact CTA
8. Footer

Security capabilities may include:

- Application Security
- Web Security
- API Security
- Cloud Security
- Vulnerability Assessment
- Penetration Testing
- Red Teaming
- Vulnerability Research

Do not invent company statistics or certifications.

## Security Methodology

Use:

Discover → Map → Test → Validate → Report → Harden

Explain each stage clearly.

## CYVANTAS Security Lab

Tagline:

Learn. Break. Defend.

Lab sections:

- Dashboard
- Challenges
- Learning
- CTF
- Security Tools

Challenge categories:

- Web Security
- Authentication
- API Security
- Reconnaissance
- CTF

Challenge cards should support:

- Title
- Description
- Category
- Difficulty
- Points
- Estimated time
- Completion state

Use local mock data initially.

Design the data model so a backend can be added later.

## Security Tools

Plan for browser-based educational tools such as:

- JWT decoder
- Base64 encoder/decoder
- URL encoder/decoder
- JSON formatter
- Hash identifier
- Regex tester
- CSP builder
- Security header generator

Prefer local browser processing when possible.

## Accessibility

Requirements:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible buttons
- Accessible navigation
- ARIA only where necessary
- Good color contrast
- prefers-reduced-motion support
- Responsive layouts

## Responsive Design

Test layouts at:

320px
375px
390px
414px
768px
1024px
1280px
1440px
1920px

Mobile is a first-class experience.

## SEO

Implement:

- Page titles
- Meta descriptions
- Canonical URLs
- Open Graph metadata
- Twitter/X metadata
- Semantic HTML
- Appropriate structured data

Preserve useful SEO information from:

existing-blogger-theme.xml

Do not blindly copy Blogger markup.

## Existing Blogger Website

The original Blogger theme is stored at:

existing-blogger-theme.xml

Treat it as a reference and migration source.

Before removing or changing useful content:

- inspect the XML
- identify existing SEO metadata
- identify Open Graph metadata
- identify useful URLs
- identify important content
- preserve useful information

Never delete the backup.

## Security

Never commit:

- API keys
- passwords
- tokens
- credentials
- .env files
- private keys

Use environment variables for secrets.

Do not create real offensive infrastructure in the frontend.

Security challenges must be designed for authorized educational use.

## Code Quality

Prefer:

- small reusable components
- clear TypeScript types
- semantic component names
- reusable design tokens
- maintainable folder structure
- minimal dependencies
- accessible components

Avoid:

- giant components
- duplicated markup
- unnecessary libraries
- hardcoded secrets
- fake functionality

## Component Strategy

Use UI/UX Pro Max for design decisions.

Use 21st.dev components selectively when they improve the interface.

Adapt components to the CYVANTAS design system rather than copying them blindly.

## Development Strategy

Build in stages:

1. Architecture
2. Design system
3. Navigation
4. Hero
5. Core sections
6. Research
7. Security Lab
8. Challenge system
9. Security tools
10. Accessibility
11. SEO
12. Performance
13. Security review

Do not build everything in one huge component.

## Quality Standard

CYVANTAS should feel:

technical
credible
modern
minimal
premium
fast
accessible
research-oriented

The final result should look like a real cybersecurity platform, not a generic AI-generated landing page.
