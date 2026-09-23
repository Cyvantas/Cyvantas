/**
 * Inline stroke icons for the Lab UI. viewBox 0 0 24 24, 1.5px stroke,
 * `currentColor` so the parent controls color. Wrap in <Icon> for sizing/a11y.
 */
import type { ReactElement } from "react";

const svg = (children: ReactElement) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const ArrowRightIcon = () => svg(<path d="M4 12h15m-6-6 6 6-6 6" />);

export const ArrowUpRightIcon = () => svg(<path d="M7 17 17 7M8 7h9v9" />);

export const TargetIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>,
  );

export const BookIcon = () =>
  svg(
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M18 16H7a2 2 0 0 0-2 2" />
    </>,
  );

export const FlagIcon = () =>
  svg(
    <>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </>,
  );

export const WrenchIcon = () =>
  svg(
    <path d="M14 6a4 4 0 0 0-5.2 5.2L3 17v4h4l5.8-5.8A4 4 0 0 0 18 10l-3 3-2-2 3-3a4 4 0 0 0-2-2Z" />,
  );

export const ShieldIcon = () =>
  svg(
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>,
  );

export const KeyIcon = () =>
  svg(
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 8 8M16 16l2-2M19 19l2-2" />
    </>,
  );

export const GlobeIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>,
  );

export const PlugIcon = () =>
  svg(
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0V8Z" />
      <path d="M12 16v5" />
    </>,
  );

export const CrosshairIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>,
  );

export const CodeIcon = () => svg(<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" />);

export const BracesIcon = () =>
  svg(
    <>
      <path d="M8 4a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2" />
      <path d="M16 4a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2" />
    </>,
  );

export const FingerprintIcon = () =>
  svg(
    <>
      <path d="M6 11a6 6 0 0 1 11-3.4" />
      <path d="M9 20a10 10 0 0 1-2-3" />
      <path d="M9.5 11a2.5 2.5 0 0 1 5 0c0 2.5-.5 5-1.5 7" />
      <path d="M12 11v1c0 3-1 6-2.5 8" />
      <path d="M18 12c0 3-.5 5.5-1.5 7.5" />
    </>,
  );

export const HeadersIcon = () =>
  svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 13h9M8 16h6" />
    </>,
  );

export const RegexIcon = () =>
  svg(
    <>
      <path d="M12 4v9M8 6l8 5M16 6l-8 5" />
      <circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </>,
  );
