import { motion, useReducedMotion } from 'motion/react'
import { founder, socials } from '../content/site'
import { Icon } from './Icon'
import { Navbar } from './Navbar'

function HeroBackground() {
  return (
    <div className="hero-media">
      <img
        src={founder.portrait.src}
        alt={founder.portrait.alt}
        width={founder.portrait.width}
        height={founder.portrait.height}
        fetchPriority="high"
        decoding="async"
      />
    </div>
  )
}

export function Hero() {
  const reducedMotion = useReducedMotion()
  const interaction = reducedMotion ? {} : { whileHover: { y: -1 }, whileTap: { scale: 0.98 } }

  return (
    <main id="main-content" className="hero" aria-labelledby="hero-heading" tabIndex={-1}>
      <Navbar />
      <HeroBackground />

      <div className="hero-shade" aria-hidden="true" />

      <motion.div
        className="hero-content"
        initial={false}
        animate={reducedMotion ? undefined : { y: [8, 0], opacity: [0, 1] }}
        transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="eyebrow">{founder.eyebrow}</p>
        <h1 id="hero-heading">{founder.headline}</h1>
        <p className="hero-description">{founder.description}</p>
        <div className="hero-actions">
          <motion.a className="action action-primary" href={founder.companyUrl} {...interaction} transition={{ duration: 0.18 }}>
            EXPLORE CYVANTAS<Icon name="arrow-up-right" width="14" height="14" />
          </motion.a>
          <motion.a className="action" href={founder.contactUrl} {...interaction} transition={{ duration: 0.18 }}>
            GET IN TOUCH<Icon name="arrow-up-right" width="14" height="14" />
          </motion.a>
        </div>
      </motion.div>

      <nav className="social-links" aria-label="Social profiles">
        {socials.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label + ' — ' + social.handle + ' (opens in a new tab)'}
            title={social.label}
          >
            <Icon name={social.icon} width="18" height="18" />
          </a>
        ))}
      </nav>
    </main>
  )
}
