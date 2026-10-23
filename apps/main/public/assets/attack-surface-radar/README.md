# Attack-surface radar logo assets

Source archive (unchanged):
`/data/data/com.termux/files/home/downloads/stitch_cinematic_attack_surface_visualization_section.zip`

Archive SHA256:
`6a1d1ba627f35cba3d05f9cadf7c6d03e1d15c9dc7f782e7c23c91c5d61a810e`

Verified members, relative to `stitch_cinematic_attack_surface_visualization_section/`:

| Archive member | Project copy | Contents |
| --- | --- | --- |
| `cyvantas_attack_surface_model_with_radar_sweep_pulse/screen.png` | `sources/radar-reference/screen.png` | 942×1600 RGB full-page reference with geometric center emblem |
| `cyvantas_isometric_cybersecurity_company_emblem_logo_on_a_pure_solid_deep_black/screen.png` | `sources/3d-logo/screen.png` | 1024×1024 RGB 3D cyan/blue/white logo on a near-black background |

Both `screen.png` copies are byte-for-byte originals. Only
`cyvantas-3d-logo-transparent.png` is rendered by HeroViz.

The derivative is 512×512 RGBA, 375,662 bytes. Preparation uses a soft matte
against the measured background RGB `(0, 5, 11)`: signal is the maximum channel
difference from that background; alpha is smoothstep from signal 14 to 80.
Fully opaque pixels retain their RGB. Translucent pixels are unmatted against
the measured background; below-threshold ambient noise becomes transparent.
This preserves visible cyan glow, white surfaces, blue edges and circuit details
without a hard binary color key, tint, blend mode or added glow filter.

The nonzero alpha bounds are `(62, 40)`–`(978, 943)` in the original image
(exclusive right/bottom). A symmetric crop `(36, 36)`–`(988, 988)` keeps the
original center and all nonzero glow with a minimum 4px guard. The 952×952 crop
is area-resampled to 512×512 in premultiplied RGBA to prevent dark edge fringes.
Adaptive PNG row filters and zlib compression optimize storage losslessly.

SHA256:

- Radar source: `b6bcbdc74de83220bc0d235e0fed9c181ea1a13d99ba3371ac3c226468d101b0`
- Logo source: `b4acd10eaf2791556d26b087e348abb71bf6140434837c562a965d114f8a2241`
- Transparent derivative: `dfd9c3a84cd9b53893f0be714f6fc766eab598dc143a72e51f0fff3c44ef82fc`

Source and derivative were visually compared on dark/light backgrounds and a
fine grid. Dark-background composites at small radar sizes retained the 3D
silhouette and glow without a rectangular backdrop. These asset inspections
are not screenshots of the local website; browser visual QA remains pending.
