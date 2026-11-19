# Fotosim – Specification

Interactive learning tool for photography beginners. German UI (English later), English code.
Ships as **one self-contained HTML file** (`npm run build` → `dist/index.html`), usable on desktop and mobile, offline.

## Goals

- Make the relationships between focal length, aperture, shutter, ISO, sensor size and light **visible**.
- Simple enough for a beginner, honest enough that the numbers are roughly right.
- Cartoonish visuals are fine; the physics underneath should not be.

## Output (what the user sees)

### 1. Sharpness graph (SVG)
- X: distance (m). Y: relative blur (blur disc / circle of confusion). Line at 1 = "sharp".
- **Details** toggle (default off): off shows only the DOF band, focus line and figures in a short graph; on adds the blur curve, "sharp" threshold line and y axis.
- Toggle **logarithmic** distance scale. Both toggles sit in the hint line under the graph. In linear mode: scroll/pan + zoom (pinch / wheel); in log mode no zoom.
- **Three draggable elements**: Person 1, Person 2, Background.
  - Persons: stick figures; once zoomed in far enough (rendered size above a threshold) they become simple faces looking at the camera.
- **Focus line**: vertical, draggable. Tapping an element focuses on it (simulated autofocus).
- **Depth-of-field band** (near/far limit) shaded.
- **Flash zone** shaded when the flash is on: too close / range / falling off / no effect.

### 2. Element panels
One compact row per element: visible toggle, distance as number (read + edit), "focus here" button.

### 3. Bars (vertical)
- **Exposure**: offset in stops, markers at ±1 (slight) and ±2 (strong) under/over.
- **Noise**: noise index, with "≙ ISO X on full frame".

### 4. Camera image simulation ("killer feature")
Shown together with the bars as one foldable group.
Layers: background, person 2, person 1 – each with its own CSS `filter: blur()` from `blurFractionOfWidth × imageWidthPx`.
On top: `brightness()` per layer from its exposure offset (flash lights only near layers),
SVG `feTurbulence` overlay for noise (opacity from `noise.amount`), `transform: scale()` for framing (angle of view, `frameHeightFraction`).
Optional: directional blur for camera shake when `shake.blurFactor > 1`.

### 5. Infobox
Shows the text for the **last clicked/tapped element**, filled with live values (`texts.info`, `fill()`).

### 6. Lens & phone list (side panel / bottom sheet on mobile)
- Rough lens prices (orders of magnitude), highlighting classes that match the current real focal length + aperture.
- Phone classes (2019 basic/tele, current basic/pro/zoom flagship) and what they can do. Note that phone background blur is mostly software.

## Inputs

| Control | Values |
|---|---|
| Sensor / film | Phone 2019, phone current (Pro), 1", MFT, APS-C, full frame, MF digital 44×33, MF 645, 6×6, 6×7 (film) |
| Focal length | Steps are common full-frame-equivalent focal lengths; shown as **real + equivalent**, e.g. "50 mm (≙ 76 mm KB)". Phones: native lenses vs. digital crop marked. |
| Lens | Kit zoom f/3.5–5.6 (default), pro zoom f/2.8, fast prime f/1.4 – limits the widest aperture (phones: built in, control locked) |
| Aperture | 1.4 … 22, limited by the lens (phones: fixed, control locked) |
| Shutter | 30 s … 1/4000, with markers **"hand"** (1/(f·crop)) and **"hand + IS"** (+3 stops) that move with focal length |
| ISO | 100 … 12800, optional auto ISO |
| Light | Sun 15, cloudy 13, shade 12, dusk 9, office 8, living room 6, night street 4, candle 3 (EV100) |
| Mode | **A** (full auto), **P**, **Av** (Nikon/Sony: A), **Tv** (Nikon/Sony: S), **M** – each with a short explanation |
| Flash | Checkbox in P/Av/Tv/M; in A the camera switches it on/off itself |
| Stabiliser | Checkbox |
| Focus | Slider + focus line + tap-to-focus, all synced |

Modes grey out and set the controls they own (`autoFields`).

## Model (src/model, pure functions, unit-tested)

All formulas use mm for focal length/sensor, m for distances, s for shutter.

- **Crop factor** = 43.27 mm / sensor diagonal. **CoC** = diagonal / 1500.
- **Blur disc** `b = f² / (N (s − f)) · |d − s| / d` (object at d, focus at s; d = ∞ allowed).
- **Hyperfocal** `H = f² / (N c) + f`; DOF near/far from H.
- **Exposure**: `EV_settings = log2(N²/t) − log2(ISO/100)`; offset = `EV_scene − EV_settings` (+ = over).
  Sensor size does **not** affect exposure (light per area), only noise and DOF.
- **Noise index** (stops) = `log2(ISO/100) + 2·log2(crop) + underexposure`. Equivalent ISO = ISO · crop².
- **Shake**: handheld limit `1/(f·crop)`, IS adds 3 stops.
- **Flash**: guide number model, full power correct at `GN·√(ISO/100)/N`, −2 stops per doubled distance.
  TTL: camera throttles power (0…7 stops) so the focused subject is correct; other elements get the same power.
  Built-in flash syncs at max 1/250 s.
- **Lens limit** (`lens.ts`): widest aperture log-interpolated over the equivalent focal range (kit: f/3.5 at ≤ 28 mm to f/5.6 at ≥ 85 mm), rounded to the next list value that isn't faster. All modes clamp to it.
- **Modes** (`modes.ts`): brute-force search over the discrete value lists, minimising
  `10·|subject offset| + shake penalties + aperture preference (P) + ISO preference (auto ISO)`.
  Auto mode fires the flash if it'd otherwise be ≥ 1 stop under, slower than the plain handheld limit, or need ISO ≥ 1600.
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

- **Desktop**: graph top left, simulation + bars below it; controls and infobox in a right column.
  Lens/phone list: own third column (open) on wide screens (≥ 1400 px), otherwise collapsible under the infobox.
- **Mobile**: graph first, then simulation + bars (pinned at the top while scrolling the rest), element panels, controls in tabs (Kamera / Licht / Modus), lens list collapsible.
- Pointer Events everywhere (mouse + touch identical).

## Milestones

1. ✅ Scaffold, model, tests
2. Graph: scales (lin/log), drag elements, focus line, DOF band, flash zone
3. Controls, modes, element panels, bars
4. Camera image simulation
5. Infobox, lens/phone list, mobile polish
6. English texts

## Open questions

- Subject motion (people moving) as an extra warning separate from camera shake?
- Exact threshold for stick figure → face.
