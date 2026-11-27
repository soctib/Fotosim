# Cost panel: what the money buys here

**Blocked by:** nothing – works today with noise, DOF, shake, effective resolution and dynamic range
(backlight). **Works with:** every other plan; each one adds a dimension (lens flaws, rolling shutter).

## Goal

The cost panel shows prices. This adds *what each item changes in the current situation* – and
says honestly when it changes nothing ("In diesem Licht reicht auch ein Handy").

## Model

`derive` is a pure function, so alternatives are cheap: run it again with the gear swapped and
compare.

- **Camera**: compare with a reference – the cheapest option in the list (a phone) or the next
  cheaper camera type. Same framing (same equivalent focal length), same light and scene, the
  current mode decides the rest (phones keep their fixed aperture).
- **Lens**: compare with the kit zoom at the same focal length.
- **Tripod**: compare with handheld.
- Compute differences in the dimensions that exist: noise index, shake/movement verdict,
  achievable DOF, plus effective MP, dynamic range, corner quality, skew where those plans exist.
- Pick the 1–3 **largest differences** that cross a verdict boundary; if none do, say "kaum Unterschied".

## UI

Under each cost item, one short line: "+3 Blenden weniger Rauschen als ein Handy", "f/1.4 statt
f/5.6: Hintergrund unscharf", "Hier kaum Unterschied". All texts in `texts.de.ts` with placeholders.

## Lesson

Expensive gear pays off in specific situations – low light, motion, backlight, big prints, wide
apertures – and the panel makes that visible as the user changes the scene.
