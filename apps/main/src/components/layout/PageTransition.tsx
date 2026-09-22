import type { ReactNode } from "react";
import { motion } from "motion/react";
import { pageTransition } from "../../lib/motion";

/**
 * Wraps route content in a subtle fade + short vertical rise for page
 * transitions. Paired with `<AnimatePresence mode="wait">` around the
 * router outlet. Reduced motion is handled globally by the app-level
 * `<MotionConfig reducedMotion="user">`, which collapses the y transform.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
