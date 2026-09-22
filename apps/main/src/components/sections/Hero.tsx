import { motion } from "motion/react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { StatusDot } from "../ui/StatusDot";
import { CodeIcon } from "../ui/icons";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { HERO } from "../../content/home";
import { HeroViz } from "./HeroViz";

export function Hero() {
  return (
    <section id="home" className="relative scroll-mt-[var(--header-height)] pt-16 pb-[var(--section-pad)] sm:pt-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusDot status="online" pulse label={HERO.status} />
            <span className="text-technical text-dim">{HERO.kicker}</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-display mt-6 text-foreground text-balance"
          >
            {HERO.headline.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-accent">
              {HERO.headline.split(" ").slice(-1)}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-technical mt-4 text-accent-secondary"
          >
            {HERO.philosophy}
          </motion.p>

          <motion.p variants={fadeUp} className="text-body mt-6 max-w-[56ch] text-muted">
            {HERO.lead}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#contact"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-background transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get Security Assessment
            </a>
            <a
              href="#services"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-transparent px-5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Explore Services
            </a>
            <a
              href={HERO.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-technical inline-flex items-center gap-1.5 rounded-sm text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon size="sm">
                <CodeIcon />
              </Icon>
              github/kcprajeesh
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </motion.div>

          <motion.ul variants={fadeUp} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {HERO.facts.map((fact) => (
              <li key={fact} className="text-caption flex items-center gap-2">
                <span aria-hidden className="h-px w-4 bg-accent-line" />
                {fact}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <HeroViz />
        </motion.div>
      </Container>
    </section>
  );
}
