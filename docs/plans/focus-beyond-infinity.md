# Focus beyond infinity

**Blocked by:** nothing. **Works with:** cost-value (a lens quirk, not a price point),
effective-resolution (focus error is one of its blur sources).

## Goal

Many lenses let you turn the focus past ∞. There, *nothing* is sharp: distant things are the least
blurred, close things more. Lessons: "∞ at the end stop" isn't a given; the effect is tiny on a
normal lens and dramatic on a telephoto – which is why people discover it with long lenses.

## Why lenses do this

Focusing moves the optics relative to the sensor; at ∞ the distance equals the focal length. Most
autofocus lenses, especially telephotos, can move a little further. That margin makes sure they
still reach a sharp ∞ when the glass and barrel expand with heat, or the parts sit slightly off
(manufacturing tolerances). Older manual primes usually have a hard stop at ∞.

## Model

Store the focus as **vergence** in diopters (`focusDpt = 1 / focus distance in m`) instead of metres.
∞ is 0 dpt; beyond ∞ is a small negative value. Nothing else needs special cases.

- Blur disc on the sensor, for an object at distance `d` (m):
  `c ≈ f² / N · |focusDpt − 1/d| / 1000` (mm, f in mm), with the existing `(s − f)` correction for
  close focus kept as it is. With `focusDpt < 0` every distance gets `|·| > 0`, so nothing reaches
  the CoC once the overshoot is large enough.
- Blur at ∞ grows with the square of the focal length – the core of the lesson:

  | Lens | Overshoot | Blur at ∞ vs CoC |
  |---|---|---|
  | 200 mm f/2.8, full frame | 0.05 dpt | ≈ 24× – mush |
  | 50 mm f/1.8, full frame | 0.05 dpt | ≈ 2× – slightly soft |

- **Depth of field**: past ∞, the near limit moves away from the camera and the far limit vanishes. Once the
  blur at ∞ exceeds the CoC there's no sharp zone at all; `dof` reports that (e.g. `null` / "nichts scharf").
- **Hyperfocal, flash TTL, autofocus**: use `max(0, focusDpt)` where a real distance is needed (flash
  meters at ∞). Autofocus and tap-to-focus never go beyond ∞ – only manual focusing does.

## Data

Per lens a maximum overshoot in diopters. Realistic, not exaggerated:

| Lens | Overshoot |
|---|---|
| Kit zoom, pro zoom | ≈ 0.05 dpt (real lenses: roughly 0.02–0.1) |
| Fast prime | 0 – hard stop at ∞, as a contrast |
| Phones | 0 – fixed focus range, no manual travel past ∞ |

`CameraLens` gets `focusOvershootDpt`; phones are 0 regardless of the lens setting.

## UI

- **Focus slider**: slider position maps to diopters. Past the far end of the distance range comes an
  "∞" mark, then a short extra section for the overshoot (only for lenses that have one). Output:
  "∞" at the mark, "hinter ∞" beyond.
- **Graph**: the focus marker sits at the right edge, labelled "hinter ∞"; the blur curve never drops
  below the threshold line, and no DOF band is drawn when nothing is sharp.
- **Camera image**: needs nothing new – every layer already takes its blur from `derive()`.
- **Infobox**: a text for the "hinter ∞" state, explaining the heat/tolerance margin and why long
  lenses show it so much more.
- **Simplified mode**: the focus slider isn't shown, so no change there.

## Migration

The persisted `focusDistanceM` becomes `focusDpt` (`1 / m`). The loader converts old saved settings;
invalid values fall back to the default as today.

## Tests

- Blur formula in diopters matches the current metre-based one for all positive focus distances.
- With a negative `focusDpt` nothing is sharp beyond the limits above; blur at ∞ scales with f².
- Focus is clamped to `[−overshoot, 1/near limit]` per lens; switching to the prime snaps back to ∞.
- AF and tap-to-focus never produce a negative `focusDpt`.
- Old persisted state with `focusDistanceM` loads correctly.
