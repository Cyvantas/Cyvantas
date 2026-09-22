/**
 * Keyboard skip link. Visually hidden until focused, then reveals a pill in
 * the top-left so keyboard users can jump straight to main content.
 */
export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={
        "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 " +
        "focus-visible:z-[var(--z-skiplink)] focus-visible:rounded-md focus-visible:border " +
        "focus-visible:border-accent-line focus-visible:bg-surface-elevated focus-visible:px-4 " +
        "focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-foreground"
      }
    >
      Skip to main content
    </a>
  );
}
