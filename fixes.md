# Fixes from the 2026-11-19 review

Bugs and questionable assumptions found by reviewing the model and UI, with what was changed.
Every model change has a test (`tests/`), and `npm test`, `npm run typecheck` and `npm run build` pass.

## Bugs

### 1. Film in auto mode fired the flash in bright sun
`modes.ts` turned the flash on once the no-flash solution needed ISO ≥ 1600. That criterion is meant for ISO
the camera chose itself; for film the ISO is the loaded film. ISO 1600 film in sunlight got the flash, which
capped the shutter at 1/250 s and forced f/22: +2.1 stops over instead of a correct 1/2000 at f/8.
**Fix:** the ISO criterion only applies when ISO is an auto field. Test: `modes.test.ts`.

### 2. Distances at or below the focal length broke the optics
The minimum distance was a flat 0.3 m, but real focal lengths go up to 0.4 m (full frame 400 mm) and 0.83 m
(6×7 at 400 mm equivalent). A person at 0.3 m with a 300 mm lens gave an infinite frame fraction (NaN layout
in the camera image), and depth of field with far < near.
**Fix:** a near limit `max(0.3 m, 8 × focal length)` in `optics.ts` (`minDistanceM`), exposed via
`derive().minDistanceM`. The actions clamp focus and element distances to it, and choosing a longer lens pushes
anything closer out to the new limit, like a real lens that won't focus closer. The focus slider starts at the
limit and shows a hint; the distance inputs get it as `min`. Tests: `actions.test.ts`.

### 3. Hiding the tracked element left focus tracking on but inert
`applyAutofocus` fell back to the manual distance while the target stayed set: slider locked, hint said
"folgt Person 1", graph showed "AF", and the user couldn't refocus without switching tracking off.
**Fix:** hiding the tracked element switches tracking off and keeps the distance it was at (`setElementVisible`).
Tests: `actions.test.ts`.

### 4. Flash sync speed was applied to phones
Phones have a continuous LED, not a flash tube, yet the shutter was capped at 1/250 s (and ≥ 1/60 s in
auto-shutter modes) whenever the flash was on. A phone in P mode in sunlight with the flash on came out
+5.3 stops over.
**Fix:** `Sensor.ledFlash` on both phone presets; `modes.ts` skips the sync and slowest-time constraints for it.
Tests: `flash.test.ts`.

## Questionable assumptions

### 5. Noise verdict for small sensors at base ISO
A 2019 phone in sunlight at ISO 100 (index 5.3 ≈ ISO 3800 full-frame equivalent) read "verrauscht" with a
strong overlay; the modern phone read "leicht verrauscht". The crop² term is physically right for total light,
but the thresholds were tuned to full-frame pixel peeping, and beginners know sunny phone shots don't look noisy.
**Fix:** thresholds for normal viewing size: low < 4 (≈ ISO 1600 full frame), medium < 6, high < 8, else very
high. The overlay/bar amount starts at index 2 (≈ ISO 400 full frame) instead of 0. Now: 2019 phone in sun
"leicht verrauscht", modern phone "rauscharm", full frame ISO 3200 "leicht verrauscht", ISO 12800 "verrauscht".
Tests: `noise.test.ts`.

### 6. Lens price classes were matched on real focal length
The classes are full-frame lens names (kit 18–55, nifty 50, 70–200 …) but were matched on the real focal
length. MFT at 50 mm equivalent (25 mm real) highlighted the 16–35 wide zoom; 6×7 at 50 mm equivalent
(103 mm real) highlighted only "Telezoom 70–200 f/2.8, 1500–3000 €".
**Fix:** `lensPrices.ts` ranges are full-frame equivalents (`minEqMm`/`maxEqMm`) and `derive` matches on the
equivalent focal length, so "50 mm f/1.8" is the normal prime of any system. The list heading says
"Brennweiten ≙ KB"; medium format (crop < 0.9) gets a note that its lenses are another price league.
Tests: `derive.test.ts`.

### 7. Flash zone ignored ambient light
In sunlight with the flash on, the graph still shaded "Blitzreichweite" to 1.5 m and "Blitz zu schwach"
beyond 3 m although TTL had cut the flash to minimum power and it contributed nothing.
**Fix:** `flashZone(gn, N, iso, ambientStops)` computes the boundaries for ambient + flash: too close = over by
≥ 1 stop even at minimum power, range = full power reaches 0, slight/strong under = −1/−2 stops. Boundaries the
ambient light already clears are `Infinity` (the graph fades to the right edge and doesn't claim "zu schwach");
ambient ≥ 0 gives no zone at all (`Derived.flash.zone` is `null`). Tests: `flash.test.ts`.

## Minor

### 8. Exposure value and verdict could disagree
−0.97 stops displayed as "−1,0 Blendenstufen · passt" while −1.0 read "leicht unterbelichtet".
**Fix:** `classifyExposure` classifies the value rounded to one decimal, as displayed. Test: `exposure.test.ts`.

### 9. Locale mix in number formatting
Shutter times ("0.6 s") and short focal lengths ("4.2 mm") used a dot while metres and ISO used the German
comma. **Fix:** `formatShutter` and `formatFocal` take an optional locale; the UI passes `texts.locale`.
f-numbers keep the dot ("f/5.6") on purpose – that's how lens barrels and the lens list write them.
Tests: `focal.test.ts`.

### 10. Dead text
`info.equivalence` was never reachable (nothing set that info key). Its content moved into the sensor
explanation (the crop factor rule of thumb and the f/1.8 ≈ f/11 example); the key is gone.

### 11. Linear-mode graph hint
It omitted tap-to-focus and the tracking state. Now: "Antippen stellt scharf · Ziehen verschiebt · …" and,
with tracking on, "Personen ziehen – der Fokus folgt · …".

### 12. Aperture slider dead zone
The aperture slider always ran from f/1.4, so with a kit zoom the left part of the track was dead (the thumb
snapped back) and the hint "weiter geht dieses Objektiv nicht auf: f/5.6" appeared next to a thumb already at
f/5.6, which read like a tautology. **Fix:** the slider starts at the lens's widest aperture for the current
focal length (like the focus slider at the near limit), and the hint describes that limit whenever the lens
caps the range: "Objektiv öffnet bei dieser Brennweite nur bis f/5.6".

### 13. Test coverage
`flash.ts`, `noise.ts`, `shake.ts` and `focal.ts` had no tests of their own. They now have
`tests/flash.test.ts`, `noise.test.ts`, `shake.test.ts`, `focal.test.ts`; the store actions have
`tests/actions.test.ts`.
