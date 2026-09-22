/**
 * Inline stroke icons for the CYVANTAS UI. viewBox 0 0 24 24, 1.5px stroke,
 * `currentColor` so the parent controls color. Wrap in <Icon> for sizing/a11y.
 * Service glyphs are keyed by `IconKey` for data-driven rendering.
 */
import type { ReactElement } from "react";
import type { IconKey } from "../../content/home";

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

export const TargetIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
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

export const NetworkIcon = () =>
  svg(
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-2h12v2" />
    </>,
  );

export const PhoneIcon = () =>
  svg(
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>,
  );

export const CloudIcon = () =>
  svg(<path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 9.2 3.5 3.5 0 0 1 17 18H7Z" />);

export const CrosshairIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>,
  );

export const SlidersIcon = () =>
  svg(
    <>
      <path d="M5 4v16M12 4v16M19 4v16" />
      <circle cx="5" cy="9" r="2" />
      <circle cx="12" cy="15" r="2" />
      <circle cx="19" cy="8" r="2" />
    </>,
  );

export const EyeIcon = () =>
  svg(
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>,
  );

export const ChatIcon = () =>
  svg(<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9Z" />);

export const GearIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>,
  );

export const BookIcon = () =>
  svg(
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M18 16H7a2 2 0 0 0-2 2" />
    </>,
  );

export const MailIcon = () =>
  svg(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>,
  );

export const ArrowRightIcon = () => svg(<path d="M4 12h15m-6-6 6 6-6 6" />);

export const ArrowUpRightIcon = () => svg(<path d="M7 17 17 7M8 7h9v9" />);

export const CodeIcon = () => svg(<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" />);

export const ShieldIcon = () =>
  svg(
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>,
  );

export const AlertIcon = () =>
  svg(
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </>,
  );

export const LayersIcon = () =>
  svg(<path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" />);

export const BeakerIcon = () =>
  svg(
    <>
      <path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7.5 14h9" />
    </>,
  );

/** Map from a service/capability `IconKey` to its glyph component. */
export const SERVICE_ICONS: Record<IconKey, () => ReactElement> = {
  target: TargetIcon,
  globe: GlobeIcon,
  plug: PlugIcon,
  network: NetworkIcon,
  phone: PhoneIcon,
  cloud: CloudIcon,
  crosshair: CrosshairIcon,
  sliders: SlidersIcon,
  eye: EyeIcon,
  chat: ChatIcon,
  gear: GearIcon,
  book: BookIcon,
};
