import { MotionConfig } from 'motion/react'
import { Hero } from './components/Hero'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="founder-page">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Hero />
      </div>
    </MotionConfig>
  )
}
