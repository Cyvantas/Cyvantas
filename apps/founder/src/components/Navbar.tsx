import { motion, useReducedMotion } from 'motion/react'
import { founder } from '../content/site'
import { Icon } from './Icon'

export function Navbar() {
  const reducedMotion = useReducedMotion()

  return (
    <motion.header
      className="site-header"
      initial={false}
      animate={reducedMotion ? undefined : { opacity: [0, 1] }}
      transition={{ duration: reducedMotion ? 0 : 0.45 }}
    >
      <a className="wordmark" href={founder.companyUrl} aria-label="CYVANTAS — company website">
        <img src={founder.logo} alt="CYVANTAS" width="1200" height="284" />
      </a>
      <nav className="header-links" aria-label="Primary navigation">
        <a href={founder.companyUrl}>CYVANTAS.IN</a>
        <a href={founder.contactUrl}>CONTACT<Icon name="arrow-up-right" width="12" height="12" /></a>
      </nav>
    </motion.header>
  )
}
