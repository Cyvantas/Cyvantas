import type { Variants, Transition } from "motion/react";

/**
 * Centralized Motion presets for CYVANTAS. Timing per CLAUDE.md:
 * micro-interactions 150-250ms, larger transitions 300-600ms.
 * Reduced-motion is handled globally by <MotionConfig reducedMotion="user">.
 */

export const duration = {
  micro: 0.2,
  base: 0.4,
  large: 0.56,
} as const;

export const easing = {
  standard: [0.22, 1, 0.36, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
} as const;

const baseTransition: Transition = {
  duration: duration.base,
  ease: easing.standard,
};

/** Fade in with a small upward rise. Default reveal for sections. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

/** Opacity-only fade. Use when position should not shift. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base, ease: easing.out } },
};

/** Subtle scale-up reveal for cards / media. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: baseTransition },
};

/**
 * Container that staggers its children. Pair child elements with a
 * `variants` prop (e.g. `fadeUp`) and this on the parent.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** Hover-lift for interactive cards. Use with `whileHover="hover"`. */
export const hoverLift: Variants = {
  rest: { y: 0 },
  hover: {
    y: -4,
    transition: { duration: duration.micro, ease: easing.out },
  },
};

/** Route/page transition variants for use with AnimatePresence. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.out },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.micro, ease: easing.in },
  },
};

/** Shared viewport config for scroll-triggered reveals. */
export const viewportOnce = { once: true, amount: 0.25 } as const;
