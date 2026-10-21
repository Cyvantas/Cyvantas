export const founder = {
  name: 'Prajeesh KC',
  url: 'https://founder.cyvantas.in/',
  companyUrl: 'https://cyvantas.in/',
  contactUrl: 'mailto:cyvantas@gmail.com',
  logo: '/cyvantas-logo-light.png',
  portrait: {
    src: '/images/founder-hero.png',
    alt: 'Prajeesh KC, founder of CYVANTAS',
    width: 1672,
    height: 941,
  },
  eyebrow: 'FOUNDER · CYBERSECURITY RESEARCHER',
  headline: 'Building Security.',
  description: 'Prajeesh KC — Founder of CYVANTAS, exploring application security and intelligent security tools.',
} as const

// Preserve personal profiles established in this app and the main site's
// founder content. The company has a separate Cyvantas GitHub account.
export const socials = [
  { label: 'GitHub', href: 'https://github.com/kcprajeesh', handle: 'kcprajeesh', icon: 'github' },
  { label: 'Instagram', href: 'https://instagram.com/Prajeesh_kc', handle: '@Prajeesh_kc', icon: 'instagram' },
  { label: 'X', href: 'https://x.com/Prajeesh_kc', handle: '@Prajeesh_kc', icon: 'x' },
] as const
