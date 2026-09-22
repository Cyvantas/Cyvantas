import { useEffect, useRef, type RefObject } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Container } from "../ui/Container";
import { Icon } from "../ui/Icon";
import { cn } from "../../lib/cn";
import { duration, easing } from "../../lib/motion";
import { PRIMARY_NAV, LAB_NAV } from "../../config/site";

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

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  );
}

export function MobileMenu({ open, onClose, returnFocusRef }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Escape closes; lock body scroll while open; manage focus on open/close.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    firstLinkRef.current?.focus();

    const returnFocusEl = returnFocusRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnFocusEl?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[var(--z-overlay)] md:hidden"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: duration.micro, ease: easing.out }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className={cn(
              "absolute inset-x-0 top-[var(--header-height)] border-b border-border",
              "bg-surface/95 backdrop-blur-md",
            )}
            variants={{
              hidden: { opacity: 0, y: -12 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: duration.base, ease: easing.out }}
          >
            <Container className="py-4">
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
                    href={LAB_NAV.href}
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className={cn(itemClass, "text-accent")}
                  >
                    {LAB_NAV.label}
                    <Icon size="sm">
                      <ArrowUpRight />
                    </Icon>
                  </a>
                </li>
              </ul>
            </Container>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
