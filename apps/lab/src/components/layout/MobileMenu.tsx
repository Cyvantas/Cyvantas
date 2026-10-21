import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { ArrowUpRightIcon } from "../ui/icons";
import { cn } from "../../lib/cn";
import { duration, easing } from "../../lib/motion";
import { PRIMARY_NAV, MAIN_SITE } from "../../config/site";
import { Logo } from "./Logo";

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return window.matchMedia(motionQuery).matches;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" strokeLinecap="round">
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  /** Focus is returned here when the menu closes. */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

const itemClass =
  "flex items-center justify-between rounded-md px-3 py-3 text-base font-medium " +
  "text-foreground transition-colors hover:bg-surface-elevated " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function MobileMenu({ open, onClose, returnFocusRef }: MobileMenuProps) {
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => true);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Keep the latest onClose without making it an effect dependency, so the
  // effects below run only when `open` actually changes.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // The portal remains interactive while the underlying page is inert.
  // Restore both page interaction and scrolling on close/unmount.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (appRoot) appRoot.inert = true;
    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
    };
  }, [open]);

  // Escape closes; Tab is trapped within the panel; manage focus on open/close.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    firstLinkRef.current?.focus({ preventScroll: true });

    const returnFocusEl = returnFocusRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Resizing to desktop hides the toggle; restore focus to the brand link.
      const focusTarget = returnFocusEl?.getClientRects().length
        ? returnFocusEl
        : returnFocusEl?.closest("nav")?.querySelector<HTMLAnchorElement>("a[href]");
      focusTarget?.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  // A body portal keeps the viewport overlay outside the filtered sticky header.
  // Remove it immediately on close so focus cannot land in an exiting dialog.
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[var(--z-overlay)] lg:hidden"
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
    >
      {/* Backdrop */}
      <motion.button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        transition={{ duration: reducedMotion ? 0 : duration.micro, ease: easing.out }}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        className={cn(
          "absolute inset-x-0 top-0 flex max-h-dvh flex-col border-b border-border",
          "bg-surface/95 backdrop-blur-md",
        )}
        variants={{
          hidden: { opacity: 0, y: reducedMotion ? 0 : -12 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: reducedMotion ? 0 : duration.base, ease: easing.out }}
      >
        <Container className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-4 border-b border-border">
          <Logo />
          <h2 id="mobile-menu-title" className="sr-only">Security Lab navigation</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-accent transition-colors hover:border-accent-line hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Icon><CloseIcon /></Icon>
          </button>
        </Container>
        <Container className="min-h-0 overflow-y-auto overscroll-contain pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item, i) => (
              <li key={item.to}>
                <NavLink
                  ref={i === 0 ? firstLinkRef : undefined}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onClose}
                  className={({ isActive }) => cn(itemClass, isActive && "text-accent")}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a
                href={MAIN_SITE.href}
                rel="noopener noreferrer"
                onClick={onClose}
                className={cn(itemClass, "text-accent")}
              >
                {MAIN_SITE.label}
                <Icon size="sm">
                  <ArrowUpRightIcon />
                </Icon>
              </a>
            </li>
          </ul>
        </Container>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
