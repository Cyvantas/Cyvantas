# CYVANTAS attack-surface model review

The main homepage's “Attack-surface model” label is rendered by
`apps/main/src/components/sections/HeroViz.tsx`, embedded by `Hero.tsx`.
The deployed homepage JavaScript contained the same SVG/core/label as this source.
The later `AttackSurface.tsx` coverage section is separate.

Latest scope (2026-10-23): the supplied 3D logo now replaces only the geometric
center emblem. The radar and controls retain the implementation documented
below. The final section records targeted verification and the user's positive
mobile/desktop-style screenshot assessment, alongside agent checks and browser
limitations. Earlier vector-only scope describes the preceding task.

Visual authority: `~/downloads/stitch_cinematic_attack_surface_visualization_section.zip`.
Its model screenshot/HTML show an orthographic seven-node radar, cyan links,
emerald entry points, concentric rings, hexagon/chevron core and technical legend.
The separate shader and emblem are optional references; the model export itself
uses SVG. Existing tilted 3D variants reduce mobile label readability.

Stitch refinement: [Refined Hero Attack-Surface Model](https://stitch.withgoogle.com/projects/1216269126357685542),
screen `bd799ef33c364d578e024c6611bf0dbc`, generated with `generate_variants`
from `1fc405505253473ead9f7922f1df937f` on 2026-10-23.
Actual HTML and screenshot were downloaded and reviewed.

Adopt the flat radar and framed panel within the existing hero placement.
Use fixed-size native node buttons, a docked descriptive briefing and pause
control, with keyboard/touch selection, Escape to clear and static reduced motion.
API and identity remain illustrative entry points. Use neutral scope descriptions;
omit the export's fabricated scan counts and security posture claims.

Website scope: `HeroViz.tsx` and its dedicated `HeroViz.css`. Reuse existing fonts,
colors and layout; leave other components, global styles and dependencies alone.
No WebGL, raster logo replacement, external UI runtime, 3D toggle or production
configuration is required.

Validation results and remaining environment limitations are recorded in
`CYVANTAS_STITCH_PROGRESS.md`.

## Final implementation and verification — 2026-10-23

Implemented the refined flat model locally in HeroViz.tsx and its dedicated CSS:
seven domain buttons, layered vector core, radar sweep/flow, educational briefing,
legend, motion pause/resume and static reduced-motion mode. Node labels retain
11px text independent of SVG scaling. Controls have 44px minimum width and 48px
minimum height. Narrow-container header/briefing/footer can wrap.

Verified after the final geometry adjustment:

- Main app lint and production build pass; 483 modules, 1.08s build.
- Native CSS parser and existing theme-token references pass.
- DOM harness passes every domain click, focus, mouse hover, touch-hover guard,
  Escape reset, pause/resume, ARIA references and independent instances/unique IDs.
- Analytical node geometry passes all required widths: 320, 375, 390, 414, 768,
  1024, 1280, 1440 and 1920px. Smallest panel is 288px; no clipped/overlapping
  control bounds under the checked typography and existing hero-grid assumptions.
- Local Vite production preview serves the homepage and compiled model assets.
- Diff check/scope assertions pass. Surrounding hero, homepage, later coverage,
  global styles and package manifest match HEAD. Existing lockfile changes remain.

Environment limitation: no Chromium/Firefox/browser MCP is available. DOM and
analytical geometry checks do not replace browser screenshots, computed layout,
real touch/keyboard activation or assistive-technology testing. A browser visual
pass remains recommended before publishing. Production was not changed; no commit,
push, deployment or production settings were performed.

## Visual QA follow-up — 2026-10-23

Read the progress tracker and this report before reviewing the unchanged component.
Repository/branch/status match the completed implementation. Component, dedicated
CSS and pre-existing lockfile SHA256 hashes were checked before/after this review;
no implementation changes were made.

No browser automation MCP, Chromium/Firefox executable, Playwright/Puppeteer package
or browser download cache is available. Android screencap exists, but no browser
control/ADB or verified screen-capture access is available; it cannot establish an
image of this local page at requested viewports. Stitch screenshots were retrieved
read-only and show design outputs, not screenshots of the local implementation.
No local browser screenshot was produced. Rendered visual QA remains unverified.

A dev-server launch on port 5173 failed because an existing listener occupied it.
That listener served the current main app and was preserved. A separate QA server
was started on `http://127.0.0.1:5174/` with:

```sh
cd ~/cyvantas/apps/main
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

The QA server, homepage, current HeroViz module and dedicated CSS returned HTTP200.
The QA listener was left running for phone preview. If Termux or the process stops,
restart it with the command above. No production configuration was changed.

| Check | Evidence from this review | Rendered status |
| --- | --- | --- |
| Reference direction | Original ZIP screenshot and existing refined Stitch screenshot reviewed; flat rings, hexagon/chevron core, cyan/emerald nodes, legend and docked briefing | Local comparison unavailable |
| Radar alignment | SVG480×400 matches6:5 container; button dot's3px padding+9px radius offsets the12px translation, matching spoke endpoint coordinates | Browser pivot/scaling unverified |
| Seven labels | WEB, OSINT, API, IDENTITY, CLOUD, MOBILE, NETWORK exist in source; 11px HTML labels do not scale with SVG | Font rendering/readability unverified |
| Clipping and spacing | Wrapping header/footer, narrow-container rules and docked briefing present; prior nine-width analytical bounds passed | Actual layout/briefing height unverified |
| Animation | Source has16s linear sweep,2.4s flow and pause/resume rules | Smoothness and visual layering unverified |
| Reduced motion | Scoped media query disables sweep/flow/transitions and hides pause control; main layout uses reducedMotion=user | Actual Android/browser media preference unverified |

No genuine rendered visual defect was confirmed. No fix is proposed or applied
without evidence. If the manual preview reveals a defect, record viewport,
orientation, selected domain, motion preference and screenshot, then propose the
smallest component/CSS change before applying it. Do not mark this table as a
visual pass on the strength of HTTP, source, DOM or analytical checks.

### Exact Android preview steps

1. Open Chrome on the same Android phone running Termux and type
   `http://127.0.0.1:5174/` in the address bar. This is the current local app.
   If it does not load, run the command above in Termux and leave it running.
2. In Chrome's menu, turn **Desktop site** off. Scroll to **ATTACK-SURFACE MODEL**.
   Check portrait and landscape: all seven labels, centered core/rings, aligned
   connection endpoints, readable text, complete frame/legend and no horizontal
   clipping. Tap each domain and check the briefing stays inside its panel.
3. Observe at least one full16-second radar sweep. Tap **Pause motion**: sweep and
   dashed flow should stop; **Resume motion** should continue them.
4. In Android Settings, search **Remove animations** or **Reduce motion** (often
   under Accessibility → Color and motion). Enable it, return to Chrome and reload.
   The model should be static and the pause control absent. All domain selections
   should still work. Restore your preference after checking.
5. Use Chrome's **Desktop site** option for an approximate desktop layout preview.
   This does not establish exact1280/1440px viewport QA. For exact desktop sizes,
   use a real desktop browser with its responsive device toolbar at1280×900 and
   1440×900. Mobile review targets are320/375/390/414px widths when emulation is
   available; a physical phone uses its actual CSS viewport.
6. Optional manual launch from a separate Termux session:
   `termux-open-url http://127.0.0.1:5174/`. Android's standard Power+VolumeDown
   screenshot shortcut can capture the model for a later evidence-based review.

Only the progress tracker and this report changed during this QA follow-up.
Production, implementation, existing lockfile and unrelated sections are unchanged.

## 3D logo integration — 2026-10-23

Replaced only the central SVG polygons/chevron/dot and their unused gradient/styles
with a stable CYVANTAS image. Rings, sweep, seven connecting spokes, cross-links,
WEB/API/CLOUD/NETWORK/MOBILE/IDENTITY/OSINT controls, descriptions, selection,
legend and pause/resume remain intact. The selected spoke retains opacity 1 and
1.75px stroke; the animated sweep beam remains opacity 0.25. No radar redesign.

Source archive:
`/data/data/com.termux/files/home/downloads/stitch_cinematic_attack_surface_visualization_section.zip`.
Inventory and CRC were checked before extracting. The requested member,
`stitch_cinematic_attack_surface_visualization_section/cyvantas_attack_surface_model_with_radar_sweep_pulse/screen.png`,
is a 942×1600 RGB full-page screenshot with the geometric emblem, not the 3D logo.
The actual matching logo is the verified member
`stitch_cinematic_attack_surface_visualization_section/cyvantas_isometric_cybersecurity_company_emblem_logo_on_a_pure_solid_deep_black/screen.png`:
1024×1024 RGB, white faces, blue edges, glowing cyan circuitry, near-black ambient
background. This path correction follows the user's explicit 3D-logo objective
and was disclosed. Both originals are preserved unchanged under
`apps/main/public/assets/attack-surface-radar/sources/`.

Generated `apps/main/public/assets/attack-surface-radar/cyvantas-3d-logo-transparent.png`
is a cropped 512×512 RGBA derivative (375,662 bytes). Soft background matting and
premultiplied area resampling preserve illuminated edges and circuit details;
alpha clears the rectangular background and central opening. A symmetric crop
preserves the original center. Asset README records exact processing and hashes.
Source/derivative composites on dark/light backgrounds and a grid were inspected;
the dark composition and small-size previews show retained 3D form and glow with
no rectangular background. Original archive and copied source hashes match.

CSS uses `top/left: 50%`, `translate(-50%, -50%)`, width 17.5% of the radar, a
120px cap and automatic height. At 320px viewport the logo is about 50px; at
1280/1440px it is about 84px; the widest stacked panel uses the 120px cap.
This stays close to the previous 62×72 SVG-unit emblem while preserving aspect
ratio. The 512px image supplies at least 4× density at its maximum size.
No logo animation, filter or tint is applied. `pointer-events: none`, disabled
dragging and `user-select: none` prevent interference. `alt="CYVANTAS"` names the
brand inside the model. Existing reduced-motion behavior remains intact.

Files changed in this task: `HeroViz.tsx`, `HeroViz.css`, this report,
`CYVANTAS_STITCH_PROGRESS.md`, and the asset directory (two original `screen.png`
copies, derivative, provenance README). Prior radar edits and the user's existing
`apps/main/package-lock.json` changes were preserved byte-for-byte outside the
targeted logo edits. No dependencies, surrounding sections or production settings
were changed; no commit, push or deploy was performed.

Validation:

- `npm run lint` and `npm run build` from `apps/main` exit 0. Build: Vite 8.3.5,
  483 modules, 1.28s; no errors or warnings.
- Existing DOM harness passes all seven domain selections/descriptions, focus,
  mouse hover, touch-hover guard, Escape, pause/resume, ARIA and independent IDs.
- Native CSS parser passes. Source checks confirm a stable, pointer-transparent
  image and retained selected/sweep distinction and reduced-motion rules.
- Analytical geometry at 320/375/390/414/768/1024/1280/1440/1920px (including panel
  borders) passes centered logo, node/target-caption clearance and source density.
- PNG checks pass transparent perimeter/opening, opaque surfaces, partial-alpha
  glow, preserved source/archive bytes and exact derivative copied into `dist`.
- Production preview at `http://127.0.0.1:5175/` returns HTTP200 for homepage,
  compiled CSS/JS and the PNG (correct image/png MIME and exact derivative bytes).
  Preview session71598 is retained for manual inspection. Restart if needed:
  `npm run preview -- --host 127.0.0.1 --port 5175 --strictPort` in `apps/main`.
- `git diff --check` exits 0; Git status contains only the existing lockfile/model
  edits, both task records and the new scoped asset directory. Incremental diff
  against the initial working tree confirms only the targeted core replacement.

Browser limitation: no Chromium, Firefox or browser automation tool is available.
Actual mobile/desktop screenshots, computed layout, touch activation, visual sweep
quality, effective reduced motion and browser-console errors remain unverified.
Asset composites, DOM and geometry checks do not establish a browser visual pass.
The former 5174 QA listener is no longer running; use the current 5175 preview
above or restart the development server using the earlier instructions.

## Final targeted verification — 2026-10-23

The user reports that the latest mobile and desktop-style screenshots show the
3D logo integrated at the radar center and that “The visual result looks good.”
This is user-reported visual evidence. No screenshots, exact viewport dimensions
or browser/device metadata were attached to this request for agent inspection.
Earlier browser-unavailable entries are historical; the positive user assessment
is now recorded alongside the independently repeatable checks below.

| Check | Actual evidence and result |
| --- | --- |
| Correct asset / background | Component references `/assets/attack-surface-radar/cyvantas-3d-logo-transparent.png`. Unchanged SHA256, 512×512 RGBA; transparent perimeter/opening,108697 fully transparent pixels,50054 partial-alpha glow pixels and103393 opaque pixels. Source/archive bytes preserved; exact derivative in build and preview HTTP200 with image/png MIME. No rectangular background matte. |
| Mobile / desktop centering | Existing50%/50% with translate(-50%,-50%) equals SVG240/200 in the6:5 radar. Native CSS parsing and analytical geometry pass320/375/390/414/768/1024/1280/1440/1920px; no logo/node/target overlap. About50px at320px and84px at1280/1440px,120px cap. User's screenshots look good; agent has no exact-width rendered-layout evidence. |
| Seven domains | DOM harness passes WEB,API,CLOUD,NETWORK,MOBILE,IDENTITY,OSINT: exact configured title/description, one pressed button and one highlighted spoke for every selection. Focus/mouse/touch-hover guard, Escape, ARIA and independent instances also pass. |
| Pause / resume | DOM state, aria-pressed and Pause/Resume copy toggle; CSS emulation applies animation-play-state:paused to both sweep and flow, then removes it on resume. Selection remains usable while paused and toggling motion retains the briefing. Logo stays unanimated and pointer-transparent. |
| Reduced motion | CSS emulation passes no-preference → reduce → no-preference. Sweep/flow animation:none; node/spoke transition:none; pause control hidden; all seven selections/descriptions still pass. Restoring preference restores animation declarations and control visibility. Actual device/browser animation frames are not tested. |
| Sweep / selection independence | Each selection retains the same sweep DOM element/markup and16s linear infinite declaration. The continuous decorative sweep does not steer toward, synchronize with or restart for the selected domain. Selection is separately shown by the spoke/button/briefing; selected opacity1/stroke1.75 differs from sweep-beam opacity0.25. |
| Required commands | `npm run lint` and `npm run build` from apps/main exit0; Vite8.3.5,483 modules,1.67s, no errors/warnings. HTML1.56kB/CSS37.23kB/JS463.35kB. `git diff --check` exit0; Git status file set unchanged; baseline hashes confirm only the two task records changed. |

The repeated DOM/CSS test is
`node /data/data/com.termux/files/usr/tmp/cyvantas-logo-final-qa/check-final.mjs`;
logo geometry/CSS checks use the existing temporary `check-logo.mjs` harness.
Happy-dom caches ancestor selector matches after a parent class change, so CSS
emulation uses fresh snapshots of the actual React DOM state. This verifies
declarations and cascade for current states without claiming real browser timing.
Temporary harness corrections did not change the visualization or dependencies.

No implementation or asset defect was found that requires a change. Only this
report and `CYVANTAS_STITCH_PROGRESS.md` are edited for final verification; the
radar, assets, existing lockfile and unrelated files remain untouched.

Final status: main...origin/main; existing modified package-lock.json/HeroViz.tsx,
untracked model CSS/asset directory and two task records. Lockfile diff stays84/84.
All353 baseline files checked; only the two authorized documents changed, no new
repository files, no missing files. Document whitespace checks pass.

Remaining agent QA limits: no Chromium/Firefox/browser automation. Exact-width
computed/rendered layouts, native touch/keyboard/assistive technology, effective
Android reduced motion, animation timing and browser-console errors are not
independently verified. The user's reported visual pass does not claim those
interactive checks. No commit, push, deploy or production changes.
