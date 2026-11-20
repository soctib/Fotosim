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
    each blurred by its own distance. Very large heads grow into the plot, drawn see-through.
- **Focus line**: vertical, draggable. Tapping an element focuses on it (simulated autofocus).
- **Depth-of-field band** (near/far limit) shaded.
- **Flash zone** shaded when the flash is on: too close / range / falling off / no effect. Computed for ambient + flash,
  so ambient light extends the range; hidden while the ambient light alone is enough (the flash then does nothing).

### 2. Scene panel
Light situation, plus one compact row per element: visible toggle, distance as number (read + edit), "focus here" button.

### 3. Bars (vertical)
- **Exposure**: offset in stops, markers at ±1 (slight) and ±2 (strong) under/over.
- **Noise**: noise index, with "≙ ISO X on full frame".

### 4. Camera image simulation ("killer feature")
Shown together with the bars as one foldable group.
Layers: sky/ground, background scenery, persons – stacked by distance. The backdrop and scenery follow the light situation (sunny/cloudy/overcast/dusk garden with a house, office, living room, night street, candle-lit table), so a beginner sees what kind of light the preset means; indoor scenery still stands at the background distance. Background blur from `blurFractionOfWidth × imageWidthPx`;
persons blur per part (nose, face/body, ears at their own distances, SVG filters), so with a shallow depth of field the
nose can be sharp and the eyes not. Close persons drift to the image centre (the photographer aims at them).
On top: `brightness()` per layer from its exposure offset (flash lights only near layers),
SVG `feTurbulence` overlay for noise (opacity from `noise.amount`); sizes and positions from a real perspective projection (`heightFractionPerM`).
Optional: directional blur for camera shake when `shake.blurFactor > 1`.

### 5. Infobox
Shows the text for the **last clicked/tapped element**, filled with live values (`texts.info`, `fill()`).
Foldable in both modes (folded, the summary just reads "Hilfe"). Folded, it sinks below every open box in its column.

### 6. Lens & phone list (side panel / bottom sheet on mobile)
- Rough lens prices (orders of magnitude), highlighting classes that match the current framing (full-frame-equivalent
  focal length) + aperture, so a "50 mm f/1.8" is the normal prime of any system. Medium format gets a note that its
  lenses are another price league.
- Phone classes (2019 basic/tele, current basic/pro/zoom flagship) and what they can do. Note that phone background blur is mostly software.

## Inputs

Grouped like the real thing: a **camera** panel (type, mode, aperture, shutter, ISO, flash – modern bodies set the
aperture) and a **lens** panel (type, focal length, stabiliser, focus tracking, focus), each starting with its type
dropdown. Light and element distances live in the scene panel.

| Control | Values |
|---|---|
| Camera type (= sensor/film size) | iPhone XR, iPhone 15 Pro Max, 1" compact, MFT, APS-C, full frame digital, 35 mm film, MF digital 44×33, MF 645, 6×6, 6×7 (film) |
| Focal length | Steps are common full-frame-equivalent focal lengths; shown as **real + equivalent**, e.g. "50 mm (≙ 76 mm KB)". Phones: only their built-in back cameras (XR: 26 mm; 15 Pro Max: 13/24/120 mm), each with its own sensor size and fixed aperture – the focal length picks the camera (`activeSensor()`). |
| Lens | Kit zoom f/3.5–5.6 (default), pro zoom f/2.8, fast prime f/1.4 – limits the widest aperture (phones: built in, control locked) |
| Aperture | 1.4 … 22 in ⅓ stops, limited by the lens (phones: fixed, control locked) |
| Shutter | 30 s … 1/4000 (mechanical; phones 1/16000 electronic), with markers **"hand"** (1/(2·f·crop)) and **"hand + IS"** (+2 stops) that move with focal length |
| ISO | 100 … 12800 in ⅓ stops, optional auto ISO (P/Av/Tv). Film: fixed by the loaded film in every mode, no auto ISO |
| Light | Sun 15, cloudy 13, shade 12, dusk 9, office 8, living room 6, night street 4, candle 3 (EV100) |
| Mode | **A** (full auto), **P**, **Av** (Nikon/Sony: A), **Tv** (Nikon/Sony: S), **M** – each with a short explanation |
| Flash | Checkbox in P/Av/Tv/M; in A the camera switches it on/off itself. Phones have an LED: no sync speed |
| Stabiliser | Checkbox |
| Focus | Slider + focus line + tap-to-focus, all synced. Can't go closer than the lens's near limit (≈ 8× focal length, at least 0.3 m); element distances share that limit and are pushed out when a longer lens is chosen |
| Focus tracking ("Fokus nachführen", AF-C) | Off (default) or tracking Person 1 / Person 2 / background, switched on only via its dropdown. While on, focus follows the target, the focus slider and line are display-only, and graph taps do nothing. Tapping an object in the camera image is tap-to-focus (one shot) when tracking is off, or moves the tracked target when it's on. Off keeps the last distance. Hiding the tracked element switches tracking off (keeping the distance). |

Modes grey out and set the controls they own (`autoFields`).

## Simplified mode

The app opens in a simplified mode for beginners; the header switch "Alle Einstellungen" leaves it.
Entering applies a fixed setup (`applySimple` in `src/state/actions.ts`): sun, person 1 and the background
(person 2 hidden), full frame with the pro zoom, Av, auto ISO, no flash, stabiliser on, no focus tracking,
focus on person 1. The angle of view (nearest full-frame step) and the aperture carry over.
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
- **Flash**: guide number model, full power correct at `GN·√(ISO/100)/N`, −2 stops per doubled distance.
  TTL: camera throttles power (0…7 stops) so the focused subject is correct; other elements get the same power.
  Built-in flash syncs at max 1/250 s (and ≥ 1/60 s in auto-shutter modes); a phone LED has no such limits.
  Zone from ambient + flash: too close = over by ≥ 1 stop even at minimum power; range = full power reaches 0;
  slight/strong under = −1/−2 stops. Boundaries the ambient light already clears are ∞; ambient ≥ 0 → no zone.
- **Lens limit** (`lens.ts`): widest aperture log-interpolated over the equivalent focal range (kit: f/3.5 at ≤ 28 mm to f/5.6 at ≥ 85 mm), rounded to the next list value that isn't faster. All modes clamp to it.
- **Modes** (`modes.ts`): brute-force search over the discrete value lists, minimising
  `10·|subject offset| + shake penalties + aperture preference (P) + ISO preference (auto ISO)`.
  Auto mode fires the flash if it'd otherwise be ≥ 1 stop under, slower than the plain handheld limit, or (auto ISO
  only – a fast film doesn't count) need ISO ≥ 1600.
- **Focus tracking** (`autofocus.ts`): applied before mode resolution (auto modes and flash use the focus distance).
- **derive.ts**: one function `(settings, scene) → Derived`. Everything the UI renders comes from here.

## Architecture

```
src/model    pure physics + mode logic (no DOM)
src/data     sensors, light presets, lens prices, phones, texts.de.ts
src/state    store: state → derive() → listeners
src/ui       graph/, bars/, controls/, sim/, infobox/   (to do)
src/assets   SVGs, imported with ?raw and inlined
```

Unidirectional: input → `store.update()` → `resolveMode()` → `derive()` → all UI parts render from the same `Derived`.

## Layout

- **Desktop**: graph top left, simulation + bars below it, then the scene panel (light situation + one row per element);
  camera controls in the next column. Wide screens (≥ 1400 px): third column with the infobox on top and the lens/phone
  list (open) below; while the list is folded, the lens panel moves into the third column under the infobox.
  Narrower: infobox above the controls, lens list collapsible below them.
- **Mobile**: graph, simulation + bars (pinned at the top while scrolling the rest), scene panel, controls, infobox, lens list (collapsible).
- Pointer Events everywhere (mouse + touch identical).

## Milestones

1. ✅ Scaffold, model, tests
2. ✅ Graph: scales (lin/log), drag elements, focus line, DOF band, flash zone, profile heads when zoomed in
3. ✅ Controls, modes, element panels, bars, lens choice, focus tracking
4. ✅ Camera image simulation
5. Infobox ✅, lens/phone list ✅, mobile polish (control tabs on phones: open)
6. English texts

## Open questions

- Subject motion (people moving) as an extra warning separate from camera shake?
