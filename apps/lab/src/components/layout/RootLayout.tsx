import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Background } from "../background/Background";
import { SkipLink } from "../ui/SkipLink";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

/**
 * Application shell: skip link, decorative background, header, main landmark,
 * and footer. `MotionConfig reducedMotion="user"` makes every Motion
 * animation reduced-motion-aware without per-component guards.
 */
export function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <Background />
      <SkipLink />

      <div className="relative flex min-h-dvh flex-col">
        <Navbar />

        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>

        <Footer />
      </div>
    </MotionConfig>
  );
}
