import type { ReactNode, SVGProps } from 'react'

type IconName = 'arrow-up-right' | 'github' | 'x' | 'instagram'

const paths: Record<IconName, ReactNode> = {
  'arrow-up-right': <path d="M6 18 18 6M6 6h12v12" />,
  github: <path d="M9 19c-4 1-4-2-6-2m15 5v-4a3.5 3.5 0 0 0-1-3c3-.3 6-1.5 6-6A4.7 4.7 0 0 0 22 6a4.3 4.3 0 0 0-.1-3S20.7 2.7 18 4a13.4 13.4 0 0 0-7 0C8.3 2.7 7.1 3 7.1 3A4.3 4.3 0 0 0 7 6a4.7 4.7 0 0 0-1 3c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 3v4" transform="translate(-2 0)" />,
  x: <path d="m4 3 13 18h3L7 3H4Zm16 0L4 21" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" /></>,
}

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {paths[name]}
    </svg>
  )
}
