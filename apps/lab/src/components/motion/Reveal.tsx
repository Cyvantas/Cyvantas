/**
 * Scroll-reveal helpers built on Motion for React. `<MotionConfig
 * reducedMotion="user">` (set in RootLayout) collapses these transforms to
 * opacity-only for users who request reduced motion, so no per-component
 * guard is needed here.
 */
import type { ElementType, HTMLAttributes } from "react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { fadeUp, staggerContainer, viewportOnce } from "../../lib/motion";

type MotionTag = "div" | "section" | "ol" | "ul" | "li" | "article" | "span";

interface RevealProps extends HTMLAttributes<HTMLElement> {
  as?: MotionTag;
  variants?: Variants;
}

export function Reveal({ as = "div", variants = fadeUp, ...props }: RevealProps) {
  const Tag = motion[as] as ElementType;
  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
      {...props}
    />
  );
}

export function Stagger({ as = "div", variants = staggerContainer, ...props }: RevealProps) {
  const Tag = motion[as] as ElementType;
  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
      {...props}
    />
  );
}

export function StaggerItem({ as = "div", variants = fadeUp, ...props }: RevealProps) {
  const Tag = motion[as] as ElementType;
  return <Tag variants={variants} {...props} />;
}
