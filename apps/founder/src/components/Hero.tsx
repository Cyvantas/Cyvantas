import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { founder, socials } from '../content/site'
import { Icon } from './Icon'
import { Navbar } from './Navbar'

const motionQuery = '(prefers-reduced-motion: reduce)'

function subscribeToMotionPreference(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}

  const preference = window.matchMedia(motionQuery)
  preference.addEventListener('change', onChange)
  return () => preference.removeEventListener('change', onChange)
}

function prefersReducedMotion() {
  return typeof window.matchMedia !== 'function' || window.matchMedia(motionQuery).matches
}

function HeroBackground() {
  // Subscribe directly so changing the OS preference also stops a running video.
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const canPlayVideo = !reducedMotion && !playbackFailed

  useEffect(() => {
    if (!canPlayVideo) return

    const video = videoRef.current
    if (!video) return

    let active = true
    video.muted = true
    video.defaultMuted = true
    video.volume = 0

    const playback = video.play()
    playback?.catch((error: unknown) => {
      // React StrictMode can interrupt the initial play request during cleanup.
      if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
        setPlaybackFailed(true)
      }
    })

    return () => {
      active = false
      video.pause()
    }
  }, [canPlayVideo])

  return (
    <div className="hero-media" aria-hidden="true">
      <img
        src={founder.portrait.src}
        alt=""
        width={founder.portrait.width}
        height={founder.portrait.height}
        fetchPriority="high"
        decoding="async"
      />
      {canPlayVideo && (
        <video
          ref={videoRef}
          src="/videos/founder-hero.mp4"
          poster={founder.portrait.src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          disablePictureInPicture
          onError={() => setPlaybackFailed(true)}
          onVolumeChange={(event) => {
            const video = event.currentTarget
            if (!video.muted || video.volume !== 0) {
              video.muted = true
              video.volume = 0
            }
          }}
        />
      )}
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
