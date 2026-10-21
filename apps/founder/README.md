# CYVANTAS founder

A single-viewport identity page for Prajeesh KC at https://founder.cyvantas.in/.
One cinematic background video, a transparent navbar, one introduction, two actions,
and three small social links. The existing React, Vite, TypeScript,
Tailwind CSS v4, Motion, DM Sans, and Space Grotesk setup is preserved.
No additional dependencies are required.

## Local preview

From the repository root, run npm --prefix apps/founder run dev -- --host 127.0.0.1
(normally port 5173). Run npm --prefix apps/founder run lint and
npm --prefix apps/founder run build to verify. After building, use
npm --prefix apps/founder run preview -- --host 127.0.0.1 (port 4173).

## Composition

- The supplied public/videos/founder-hero.mp4 is an eight-second, 1280 × 720
  H.264 video. It plays automatically, muted, looping, and inline at
  /videos/founder-hero.mp4. Its audio track is silenced with muted/defaultMuted
  and zero volume; no playback controls or picture-in-picture control appears.
  The source file is retained without modification.
- Video and the existing 1672 × 941 public/images/founder-hero.png poster share
  an absolute, full-viewport object-fit: cover layer. Centered landscape framing
  preserves the founder on the right and the negative space on the left.
  Wide screens align the media to the top to protect the founder's head.
  Portrait screens use 72% horizontal, top-aligned framing and a lower gradient
  for compact copy. Neither asset stretches, and no extra zoom is applied.
- The poster remains beneath the video and is the still-image fallback when
  reduced motion is requested, autoplay is rejected, or the media fails to load.
  Changing the motion preference stops and removes the video; enabling motion
  again allows playback unless it has already failed. The preference is checked
  before mounting the video, so reduced-motion visitors do not load the MP4.
- Media stays out of document flow at every breakpoint. A stable grid
  places copy in the left negative space on landscape and desktop. Portrait
  screens use a compact copy block over the lower media, with readable
  typography and side-by-side actions. Text no longer scales with a fitted photo.
- The navbar, video, copy, and socials all live inside the positioned hero.
  The navbar and socials are absolute overlays inside the same viewport.
  Hero padding reserves their safe areas so the copy and controls fit together.
- The root uses 100dvh with 100svh and 100vh fallbacks. Safe-area-aware insets
  protect controls around mobile notches. Short screens use compact spacing.
  The document does not use overflow hiding to conceal oversized content.
- No extra sections, menu, cards, decorative shapes, scrolling, or parallax remains.
- public/cyvantas-logo-light.png is copied from the existing company asset;
  the existing favicon, canonical, social metadata, and structured data remain.
- Established personal GitHub (kcprajeesh), Instagram, and X URLs are preserved
  as requested when existing profile URLs differ from supplied ones.
- Motion provides a brief entrance and restrained action feedback, respecting
  reduced motion. Social links have accessible labels and keyboard focus.

## Verification

Check 360 × 800, 390 × 844, 768 × 1024, 1024 × 768 (landscape), and 1440 × 900.
Also check 568 × 320 and 844 × 390 for short landscape screens. Verify the
founder's face, upper body, copy, navigation, actions, and social controls remain visible
and neither axis scrolls. Check keyboard focus and reduced-motion mode.
Also block the MP4 request and reject HTMLMediaElement.play() to check the
poster fallback; toggle reduced motion while playback is running.

For the video update, lint and the production build pass. MP4 container and
track metadata were inspected locally. Actual browser rendering, playback,
and viewport checks could not run: this Termux environment has no browser
executable or installed browser automation library. Those checks remain manual.
