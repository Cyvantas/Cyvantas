import { useState } from "react";
import { Icon } from "../ui/Icon";
import { cn } from "../../lib/cn";

interface CopyButtonProps {
  /** Text placed on the clipboard when pressed. */
  value: string;
  /** Accessible description of what is copied (e.g. "decoded output"). */
  label?: string;
  className?: string;
}

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 5 5 9-11" />
  </svg>
);

const CopyGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
);

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated " +
  "px-2.5 py-1.5 text-xs font-medium text-muted transition-colors " +
  "hover:border-accent-line hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-50 disabled:pointer-events-none";

/** Copies `value` to the clipboard, briefly confirming with a checkmark. */
export function CopyButton({ value, label = "result", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* Clipboard unavailable (e.g. denied permission) — no-op. */
      });
  };

  return (
    <button
      type="button"
      onClick={copy}
      disabled={value.length === 0}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      className={cn(buttonClass, className)}
    >
      <Icon size="sm" className={copied ? "text-accent-secondary" : undefined}>
        {copied ? <CheckIcon /> : <CopyGlyph />}
      </Icon>
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
