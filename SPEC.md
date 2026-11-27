# Fotosim – Specification

Interactive learning tool for photography beginners. German UI (English later), English code.
Ships as **one self-contained HTML file** (`npm run build` → `dist/index.html`), usable on desktop and mobile, offline.

## Goals

- Make the relationships between focal length, aperture, shutter, ISO, sensor size and light **visible**.
- Simple enough for a beginner, honest enough that the numbers are roughly right.
- Cartoonish visuals are fine; the physics underneath should not be.

## Output (what the user sees)

### 1. Sharpness graph (SVG)
- X: distance (m, unit at the axis arrow). Y: relative blur (blur disc / circle of confusion). Line at 1 = "sharp".
- Left margin: a photographer labelled "Kamera" (where distances are measured from); zoomed in (linear) to face scale it
  becomes a camera at the heads' eye level.
- **Details** toggle (default off): off shows only the DOF band, focus line and figures in a short graph; on adds the blur curve, "sharp" threshold line and y axis.
- Toggle **logarithmic** distance scale. Both toggles sit in the hint line under the graph. In linear mode: scroll/pan + zoom (pinch / wheel); in log mode no zoom.
- **Three draggable elements**: Person 1, Person 2, Background.
  - Persons: stick figures; once a head would be ≥ 36 px wide they become a profile head facing the camera, with nose,
    eye and ear at their true distances (nose tip −3 cm, ears +9 cm from the eyes; a person's distance is the eyes),
    each blurred by its own distance. Very large heads grow into the plot, drawn see-through. The heads wear the
    figurine's skin and hair (see camera image) with a collar in the person's graph colour.
- **Focus line**: vertical, draggable. Tapping an element focuses on it (simulated autofocus).
- **Depth-of-field band** (near/far limit) shaded.
- **Flash zone** shaded when the flash is on: too close / range / falling off / no effect. Computed for ambient + flash,
  so ambient light extends the range; hidden while the ambient light alone is enough (the flash then does nothing).

### 2. Scene panel
Light situation and a **"Gegenlicht"** (backlight) toggle, plus one compact row per element: visible toggle, movement (persons only), distance as number (read + edit), "focus here" button.

### 3. Bars (vertical; on phones ≤ 520 px a flat strip below the image)
- **Exposure**: offset in stops, markers at ±1 (slight) and ±2 (strong) under/over.
- **Noise**: noise index, with "≙ ISO X on full frame".
- **Movement**: smear of the subject in focus (tracked target, else the visible element nearest the focus distance),
  log scale ¼×–16× the sharpness limit with a line at 1×; sharp ≤ 1, slight ≤ 2, visible ≤ 4, else strong.
  Shows the relative speed in km/h. Hand shake is not included – the shutter slider's ranges show that.

### 3b. "Wofür reicht das Foto?" box (under the camera image, foldable, hidden in simplified mode)
- Headline: effective resolution of the subject in focus ("21 MP effektive Auflösung"), as a share of the
  medium's ceiling – what the sensor (colour filter included) or the film delivers with a perfect lens and
  technique ("57 % von dem, was der Sensor schafft: 37 MP"), and the file's pixels (after zoom: what's left;
  film: the scan's). Reaching the ceiling is never called a loss.
- A tip on the largest loss (none below 10 % total), then "Verlust durch": each other factor's share of the
  ceiling (b_i² / b²); with the share reached they sum to 100 %. Film: the scan is a loss.
  When the lens is the largest loss, the tip says what would help (model `lensBlurCause`): stop down
  (aperture aberrations ≥ 30 % of the lens blur²), zoom towards the middle (zoom-end penalty ≥ 20 %), or
  else only a sharper lens – kit → Profi-Zoom/prime, Profi-Zoom → prime; with the prime, the medium simply
  outresolves any lens. Phones: their lens is fixed, nothing to change.
- Table of screens and prints: verdict up close (30 cm) and at normal distance (✓ / ~ / ✗), and the effective MP
  needed for ✓ up close, with a one-sentence summary and a one-line symbol legend. All other explanation lives
  in the infobox: hovering (or tapping) the left half shows "Effektive Auflösung", the right half "Wofür reicht
  das Foto?". Infobox texts may contain paragraphs ("\n\n").
- Replaces an earlier resolution bar: a fill on a fixed 0.5–100 MP scale said little; the value is the ratio of
  detail to file pixels and what that is good for.

### 4. Camera image simulation ("killer feature")
Shown together with the bars as one foldable group. On phones (portrait) it sticks to the top while the
controls scroll; folded away, the sharpness graph sticks instead (only outside simplified mode, which keeps it open).
Layers: sky/ground, background scenery, persons – stacked by distance. The backdrop and scenery follow the light situation (sunny/cloudy/overcast/dusk garden with a house, office, living room, night street, candle-lit table), so a beginner sees what kind of light the preset means; indoor scenery still stands at the background distance. Background blur from `blurFractionOfWidth × imageWidthPx`;
persons blur per part (nose, face/body, ears at their own distances, SVG filters), so with a shallow depth of field the
nose can be sharp and the eyes not. Close persons drift to the image centre (the photographer aims at them).
**Persons** (`ui/sim/figurine.ts`, drawn in cm, 175 cm tall, eyes at −165 cm): a figurine whose head outline (head,
neck, ear bumps; 23 cm wide) and hair are based on Personas by Draftbit (CC BY 4.0, modified; credited in the README
and the camera image's info text). Person 1: skin `#e5a07e`, hair `#6c4545`, short combover; person 2: skin
`#b16a5b`, hair `#362c47`, bob. The face is a lighter tone than neck and ears, the ears have a small fold; our own
detailed eyes (±4.8 cm: iris texture, catchlight, lid – fine detail for judging sharpness), mouth and triangle nose
(flat shadow on its left half, fading from the tip up to the bridge; nostrils, freckles and a tip highlight close up).
Body: t-shirt (shoulders ±19.6 cm, neckline), short sleeves, bare forearms and hands, jeans with cuffs, sneakers.
The three depth groups are drawn without clip paths or masks (ears as their own paths, the nose fade as gradient
fills) – those cost noticeably in WebKit at high digital zoom; colours are inline and pre-mixed, since blend modes do
nothing inside a blurred group.
On top: `brightness()` per layer from its exposure offset (flash lights only near layers) – 2^(stops/2.2), since
the factor works on gamma-encoded sRGB; 2^stops would clip mid-tones to white at "leicht überbelichtet".
**Dynamic range**: each layer's brightness is a tone curve with a hard top and bottom (`tone` from derive): over the
last stop before the clip it fades to flat white (detail gone, not just bright), over the last stop above the floor to
a flat dark level. Sky and scenery do it with CSS functions only (`brightness(s/(1−a)) invert(1) brightness(1−a) invert(1)`
adds an intercept a; plain `brightness()` otherwise), persons with the intercept of their `feComponentTransfer`. A
crushed backdrop gets extra grain (the grain tile, screen-blended, above the sky layer). The drawn brightness is
`displayStops` – film and HDR phones squeeze overexposure into their headroom, so a held sky also looks held. The
caption names layers beyond the range ("Himmel und Hintergrund ausgebrannt", "Himmel abgesoffen"; indoors "Wand").
Measured in WebKit while dragging the focus slider: no difference in rAF intervals with and without clipping.
Noise overlay: a grey grain tile made once on a canvas, tiled crisp with an overlay blend (opacity from `noise.amount`) – an SVG `feTurbulence` filter would recompute every pixel on each repaint. The image redraws at most once per animation frame. Sizes and positions from a real perspective projection (`heightFractionPerM`).
Directional blur for camera shake when `shake.blurFactor > 1`; each layer also smears sideways by its own movement blur.
A whole-frame Gaussian from `resolution.systemBlurUm` (pixels, diffraction, lens, noise filter, film, scan) – below a
display pixel at normal size, visible only when zoomed in. **Digital zoom**: the layers draw the uncropped photo and
one SVG transform enlarges it z× around the subject in focus (clamped to stay inside the frame); once a file pixel
covers ≥ 1.5 display pixels an SVG pixelate filter (sample and dilate) shows the pixels. The grain overlay sits above
the filtered image, at the size of a file pixel once those exceed a display pixel.

### 5. Infobox
Shows the text for the **last clicked/tapped element**, filled with live values (`texts.info`, `fill()`).
Foldable in both modes (folded, the summary just reads "Hilfe"). Folded, it sinks below every open box in its column.

### 6. Costs (side panel / bottom sheet on mobile)
Rough price ranges (orders of magnitude) for the gear in use, from `derive().costs` (`model/costs.ts`, data in `data/prices.ts`):
- **Camera or phone** per camera type, with examples. Old phones and film cameras are marked as used.
- **Lens**: the lens type plus the full-frame-equivalent focal length pick a concrete lens (kit at 200 mm → budget
  70–300 mm; pro zoom at 135 mm → 70–200 f/2.8; prime beyond 135 mm → 300 mm f/2.8, beyond 330 mm → 400 mm f/2.8, as f/1.4 doesn't exist there).
  Full-frame new prices × a per-system factor (MFT/APS-C 0.6, film 35 mm used 0.3, digital MF 2, MF film used 0.6–0.8).
  Phones and the 1" compact have the lens built in.
- **Tripod** when the photographer's movement is "tripod or leaning" (phone: a small one).
- **Sum** of the minima and maxima. Notes: used prices, film running cost per roll and frame, MF film has hardly any zooms/fast lenses.

### 7. Camera panel ("Kamera | Regler")
A switch at the top of the controls column picks the **camera seen from above** (default) or the sliders; both edit
the same store through the same actions (`ui.controlView`, persisted). Hidden in simplified mode, which keeps its three
sliders (`CAMERA_PANEL_IN_SIMPLE_MODE` in `ui/camera/camera.ts`). In the camera view the sliders for what the drawing can
set are hidden (body classes `cam-covers-*`); type dropdowns, scan, digital zoom, stabiliser, movement and focus tracking stay.
The focal-length slider stays too (except for phones and compacts): it's what changes the lens, so it doesn't come and go
with the zoom ring; with a prime mounted the hint line says so.
- **Drawing** (`ui/camera/`, SVG in mm, built from `derive()` only): one body per camera type (`data/cameraBodies.ts`) and
  the concrete lens the cost list names (`data/lensShapes.ts`, per `LensKind`; other systems scaled by √(1/crop)). The body
  takes a fixed share of the panel width (deep bodies count by depth), the lens is to scale: zooms with an inner tube grow
  towards the long end (the 70–200/2.8 doesn't), the front is at least the entrance pupil `f / N_max` + 8 mm wide. Scale and
  panel height depend on the body only (`model/cameraPanel.ts`: `panelLayout`): the body sits at the bottom, with room for
  a lens of 1.3 × the body width above it, up to a height cap that grows with the panel width (`drawingMaxHeight`).
  Longer lenses scroll (the top edge fades while there's more above); the camera never moves while zooming or changing
  lenses. Under it: a line on what the dials do in this mode, a front view with the iris
  (pupil at the current aperture) to scale, and short messages.
- **Mirrorless/DSLR-style bodies**: mode dial (labels fixed on the dial, the dial turns to the index; tap to step, drag to
  turn), **seven-segment top display** (slight italic, faint unlit segments, printed "ISO"/"AUTO"; field sizes from the
  widest value so digits never change size; flash symbol; in M a light-meter bar −2…+2 from the exposure offset).
  **Front dial** (under the shutter button) and **rear dial**: Av = aperture, Tv = shutter, M = rear shutter / front
  aperture, P = rear dial shifts the program, A = nothing (`dialRole`). **ISO button**: the ISO blinks, the dials change
  it ("AUTO" below the lowest value where the mode has auto ISO), press again (or Esc) to end. Display values can be
  dragged too. Hot shoe: tap attaches or removes a speedlite (the flash switch). All bodies get a top display, even
  where the real one has none (`DRAW_TOP_DISPLAY_ALWAYS`; off, they'd show a rear-screen card).
- **Compact**: same display and dials (front = control ring at the lens base), pop-up flash, the telescoping lens is
  dragged to zoom. **Phones**: seen from the top edge with the camera bump; the screen is a card folded out below, laid
  out like a camera app's pro mode: shutter, aperture (fixed) and ISO – shutter and ISO are dragged sideways (locked
  where the mode leaves them to the camera), a light-meter bar in M – then the built-in cameras as "0,5× 1× 5×" buttons
  and a flash button. In the camera view the phone hides the shutter and ISO sliders.
- **Film bodies**: no mode dial and no display – a speed dial (whole stops, 6×6: a speed ring on the leaf-shutter lens),
  an aperture ring on the lens, both with an "A" position (both A = P, only the speed dial = Av, only the ring = Tv,
  neither = M; full auto shows as both on A), the film speed in the rewind crank's window and a finder readout card.
- **Rings**: zoom ring (real mm marks, 100° over the lens's range) and focus ring (from the lens's near limit to ∞,
  √-spaced, 150°) are drawn as turning cylinders; dragged sideways, the scale moves with the finger (dθ = dx / R).
  Zooming past the lens's end swaps in the next lens of the type (message names it). Focus tracking locks the focus ring.
- **Interaction**: Pointer Events (mouse and touch; vertical swipes still scroll), a click per 4 mm (dials), 5 mm
  (display, film dials) or 7 mm (mode dial) of drag. A changeable display value shows a thin underline on mouse hover;
  values the mode leaves to the camera get the `not-allowed` cursor and a short warning ("In Av wählt die Kamera die
  Zeit."). While a control is held, its underline and cursor stay until release. Every control is focusable
  (slider/button roles with value texts), arrow keys turn, Enter/Space tap. Touching a part shows its infobox text.

## Inputs

Grouped like the real thing: a **camera** panel (type, mode, aperture, shutter, ISO, flash – modern bodies set the
aperture) and a **lens** panel (type, focal length, stabiliser, photographer's movement, focus tracking, focus), each starting with its type
dropdown. Light and element distances live in the scene panel.

| Control | Values |
|---|---|
| Camera type (= sensor/film size) | iPhone XR, iPhone 15 Pro Max, Fairphone 5, 1" compact, MFT, APS-C, full frame digital mid-range and high-end (same sensor; high-end has a 1/8000 s shutter and costs more), 35 mm film, MF digital 44×33, MF 645, 6×6, 6×7 (film) |
| Focal length | Steps are common full-frame-equivalent focal lengths; shown as **real + equivalent**, e.g. "50 mm (≙ 76 mm KB)". Phones: only their built-in back cameras (XR: 26 mm; 15 Pro Max: 13/24/120 mm; Fairphone 5: 13/25 mm), each with its own sensor size and fixed aperture – the focal length picks the camera (`activeSensor()`). |
| Scan (film cameras only) | Lab scan (default, ≈ 6 MP from 35 mm), flatbed, film scanner, camera scan (24 MP), drum scanner (`data/scanners.ts`) |
| Digital zoom (lens panel, not in simplified mode – entering it resets 1×) | 1× … 20×, log scale; label "2× (≙ 100 mm KB, 6 MP)". Phones: hint when a longer built-in camera covers the framing |
| Lens | Kit zoom f/3.5–5.6 (default), pro zoom f/2.8, fast prime f/1.4 – limits the widest aperture (phones: built in, control locked) |
| Aperture | 1.4 … 22 in ⅓ stops, limited by the lens (phones: fixed, control locked) |
| Shutter | 30 s … 1/4000 (mechanical, high-end full frame 1/8000; phones 1/16000 electronic), with markers **"hand"** (1/(2·f·crop)) and **"hand + IS"** (+2 stops) that move with focal length |
| ISO | 100 … 12800 in ⅓ stops, optional auto ISO (P/Av/Tv). Film: fixed by the loaded film in every mode, no auto ISO |
| Light | Sun 15, cloudy 13, shade 12, dusk 9, office 8, living room 6, night street 4, candle 3 (EV100, light on the subject). Each also has a front-light contrast for the backdrop and the scenery (sky +1 sun, +1.5 cloudy/dusk, +2 shade; dusk garden −1; living-room walls −1; night sky −4, candle-lit walls −3) |
| Gegenlicht (scene panel, not in simplified mode) | Off (default) / on: the subject stands in its own shadow, 3 stops darker; the background keeps its light, so it is 3 stops brighter relative to the subject (sunny sky ≈ +4) |
| Mode | **A** (full auto), **P**, **Av** (Nikon/Sony: A), **Tv** (Nikon/Sony: S), **M** – each with a short explanation. P has a program shift (camera panel's rear dial; reset by a mode change) |
| Flash | Checkbox in P/Av/Tv/M; in A the camera switches it on/off itself. Phones have an LED: no sync speed |
| Stabiliser | Checkbox |
| Focus | Slider + focus line + tap-to-focus, all synced. Can't go closer than the lens's near limit (≈ 8× focal length, at least 0.3 m); element distances share that limit and are pushed out when a longer lens is chosen |
| Focus tracking ("Fokus nachführen", AF-C) | Off (default) or tracking Person 1 / Person 2 / background, switched on only via its dropdown. While on, focus follows the target, the focus slider and line are display-only, and graph taps do nothing. Tapping an object in the camera image is tap-to-focus (one shot) when tracking is off, or moves the tracked target when it's on. Off keeps the last distance. Hiding the tracked element switches tracking off (keeping the distance). |

Modes grey out and set the controls they own (`autoFields`).

## Simplified mode

The app opens in a simplified mode for beginners; the header switch "Alle Einstellungen" leaves it.
Entering applies a fixed setup (`applySimple` in `src/state/actions.ts`): sun, person 1 and the background
(person 2 hidden), full frame with the pro zoom, Av, auto ISO, no flash, stabiliser on, no focus tracking,
focus on person 1, no backlight. The angle of view (nearest full-frame step) and the aperture carry over.
Only the graph, the camera image (no fold heading; the line under it gets a darker/brighter stepper for the
light situation, so the shutter time can become a problem) and three sliders remain: aperture, shutter (set by the
camera, shown as an indicator of the handheld ranges) and focal length, plus the infobox above the controls. Leaving keeps the setup and shows
everything again.

## Model (src/model, pure functions, unit-tested)

All formulas use mm for focal length/sensor, m for distances, s for shutter.

- **Crop factor** = 43.27 mm / sensor diagonal. **CoC** = diagonal / 1500.
- **Blur disc** `b = f² / (N (s − f)) · |d − s| / d` (object at d, focus at s; d = ∞ allowed). Thin-lens formulas, so
  distances stay ≥ the **near limit** `max(0.3 m, 8·f)` – the UI clamps focus and elements to it.
- **Hyperfocal** `H = f² / (N c) + f`; DOF near/far from H.
- **Exposure**: `EV_settings = log2(N²/t) − log2(ISO/100)`; offset = `EV_scene − EV_settings` (+ = over).
  Sensor size does **not** affect exposure (light per area), only noise and DOF. Classified (±1 slight, ±2 strong) on
  the value rounded to one decimal, as displayed.
- **Noise index** (stops) = `log2(ISO/100) + 2·log2(crop) + underexposure`. Equivalent ISO = ISO · crop².
  Verdict for normal viewing size: low < 4 (≈ ISO 1600 full frame), medium < 6, high < 8, else very high; the overlay
  starts at index 2 (≈ ISO 400 full frame).
- **Shake**: handheld limit `1/(2·f·crop)` (the classic 1/f rule is too lax for modern sensors), IS adds 2 stops (rated 4–5, reliable 2–3).
  The photographer's movement shifts it: walking/driving −2 stops, running −4, tripod/leaning = no limit.
- **Movement** (`motion.ts`): photographer and persons each frozen / standing / walking (1.4 m/s) / running (4) / driving (14).
  Everything moves sideways in the same direction, so a person's speed counts relative to the photographer's
  (walking alongside = sharp; the static background smears with the photographer's speed). A standing person
  adds 0.03 m/s of sway that nothing cancels. Smear on the sensor = `v·t·f/(d−f)`; relative to the CoC like
  defocus (> 1 = visibly smeared, named in the shutter hint). The modes ignore movement on purpose:
  real cameras can't see it either.
- **Flash**: guide number model, full power correct at `GN·√(ISO/100)/N`, −2 stops per doubled distance.
  TTL: camera throttles power (0…7 stops) so the focused subject is correct; other elements get the same power.
  Built-in flash syncs at max 1/250 s (and ≥ 1/60 s in auto-shutter modes); a phone LED has no such limits.
  Zone from ambient + flash: too close = over by ≥ 1 stop even at minimum power; range = full power reaches 0;
  slight/strong under = −1/−2 stops. Boundaries the ambient light already clears are ∞; ambient ≥ 0 → no zone.
- **Lens limit** (`lens.ts`): widest aperture log-interpolated over the equivalent focal range (kit: f/3.5 at ≤ 28 mm to f/5.6 at ≥ 85 mm), rounded to the next list value that isn't faster. All modes clamp to it.
- **Modes** (`modes.ts`): brute-force search over the discrete value lists, minimising
  `10·|subject offset| + shake penalties + aperture preference (P) + ISO preference (auto ISO)`.
  Auto mode fires the flash if it'd otherwise be ≥ 1 stop under, slower than the plain handheld limit, (auto ISO
  only – a fast film doesn't count) need ISO ≥ 1600, or blow out the background (backlight). Without flash the
  modes expose for the subject, whatever the background does. With flash they add `6 · stops` the brightest visible
  background layer would sit in its fade to white (balanced fill flash): the flash keeps the subject lit and the
  ambient exposure drops for the sky – limited by the sync speed, so in bright sun a built-in flash only rescues
  close subjects.
- **Dynamic range** (`dynamicRange.ts`): every layer (backdrop = sky or walls, scenery, persons) has a brightness in
  stops relative to correct exposure: ambient + its contrast to the subject (preset, backlight), plus flash at its
  distance (none for the backdrop). **Clip**: digital +3 stops; colour negative film +5 (its latitude; the ISO stands
  for the film); phones add their `multiFrameStops` (HDR bursts are exposed shorter to protect the highlights).
  **Floor**: clip minus the dynamic range – per sensor at base ISO (phone frame ≈ 10 per module, 1"/MFT 12, APS-C 13.5,
  full frame 14, MF 15), one stop less per ISO stop above 100, at least 4; phones' floor stays a single frame's (the
  merge's lower noise is in the noise index); film a fixed 9 (floor −4). A layer is clipped at ≥ clip, crushed at
  ≤ floor, and fades over the stop before each (`highlight`/`shadow` 0…1). `displayStops` squeezes stops above 0 by
  3/clip for drawing. derive reports clip, floor, range, the backdrop's tone and the visible clipped/crushed layers.
  Digital zoom doesn't change the range (simplification).
- **Program shift** (`modes.ts`, `programShift`): in P each click trades ⅓ stop of aperture for ⅓ stop of time from
  the solved program (same exposure), stopping where the aperture or shutter list ends (flash: the sync window).
- **Camera panel mechanics** (`cameraPanel.ts`): lens outline and scale, fitting, ring angles and marks, dial roles per
  mode, ISO and film-dial steps, film "A" positions → mode – pure, so the panel only draws.
- **Focus tracking** (`autofocus.ts`): applied before mode resolution (auto modes and flash use the focus distance).
- **Effective resolution** (`resolution.ts`): every factor is a blur width on the sensor (µm), combined as a root
  sum of squares into b; effective MP = frame area / b² (≤ the file's pixels), so one CoC of blur leaves 1500 px
  along the diagonal – the graph's "sharp" standard. Factors: pixel pitch × 1.1 (Bayer; phones: their saved,
  binned pixel count); diffraction 0.45 · 2.44 · λ · N; lens per class (residual at the sweet spot + aberrations
  ∝ (wide open/N)², zooms +25 % at the ends, scaled to the format; phones per module); the subject's defocus disc
  and movement smear; shake = shake factor · ¼ CoC; noise reduction above noise index 5 (phones 3) growing per
  stop; film ≈ 65 lp/mm at ISO 400, ∝ ISO^−¼; the scan's pitch and optics as one "scan" factor. Calibration
  targets are the tests (24 MP + prime at f/5.6 ≈ 14 MP, f/22 ≈ 4; diffraction takes over at f/11 on 24 MP and f/8
  on 45 MP; 35 mm ISO 400: lab scan ≈ 4 MP, film scanner ≈ 7).
- **Digital zoom**: a crop by z is a sensor z times smaller with the same pixels (`croppedSensor()`): derive uses it
  for everything about the photo as shown – framing, CoC (DOF narrows), noise (+2·log2 z), handheld limit, movement,
  resolution (pixels ÷ z²; noise reduction runs on the uncropped frame) – and the real sensor for the lens (widest
  aperture, lens sharpness), the modes, costs and the equivalent focal length/aperture. The graph draws the
  uncropped DOF band as a dashed outline.
- **Output size** (`outputSize.ts`): the eye resolves 1′, so an image of diagonal G seen from D needs
  G/(D·tan 1′) effective pixels along its diagonal – ≈ 3400 at normal distance (D ≈ G) for any size, more for big
  prints up close (30 cm). Screens need at most their own pixels; they have a size (6.1″ phone, 24″ Full HD, 27″ 4K) and are judged at
  both distances – the phone only from 30 cm, how it is held. The close-up summary names prints only. ✓ meets
  the eye's limit, ~ the CoC standard (1500 px diagonal at normal distance, scaled alike – the graph's "sharp"),
  else ✗. Viewing closer than normal adds 2·log2(enlargement) to the noise index; "high" noise drops a level.
  Each result also carries the effective MP needed for ✓ (`sharpMp`).
- **derive.ts**: one function `(settings, scene) → Derived`. Everything the UI renders comes from here.

## Architecture

```
src/model    pure physics + mode logic (no DOM)
src/data     sensors, light presets, prices, texts.de.ts
src/state    store: state → derive() → listeners
src/ui       graph/, bars/, controls/, camera/, sim/, infobox/, quality/, costs/
src/assets   SVGs, imported with ?raw and inlined
```

Unidirectional: input → `store.update()` → `resolveMode()` → `derive()` → all UI parts render from the same `Derived`.

## Layout

- **Desktop**: graph top left, simulation + bars below it, then the scene panel (light situation + one row per element);
  camera controls in the next column. Wide screens (≥ 1400 px): third column with the infobox on top and the cost
  list (open) below; while the list is folded, the lens panel moves into the third column under the infobox.
  Narrower: infobox above the controls, cost list collapsible below them. While the camera panel is shown, the
  controls column widens (up to 520 px on medium screens, up to 640 px on wide ones) so the drawing is big enough to
  operate.
- **Mobile**: graph, simulation + bars (pinned at the top while scrolling the rest), "Wofür reicht das Foto?" box, scene panel, controls, infobox, cost list (collapsible).
- Pointer Events everywhere (mouse + touch identical).

## Milestones

1. ✅ Scaffold, model, tests
2. ✅ Graph: scales (lin/log), drag elements, focus line, DOF band, flash zone, profile heads when zoomed in
3. ✅ Controls, modes, element panels, bars, lens choice, focus tracking
4. ✅ Camera image simulation
5. Infobox ✅, cost list ✅, mobile polish (control tabs on phones: open)
6. English texts

## Open questions

- Show movement blur in the graph too (it falls with 1/distance)?
