/**
 * Minimal class-name joiner. Filters falsy values and joins with a space.
 * Kept dependency-free (no clsx/tailwind-merge) per the minimal-deps rule.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}
