# Simplified mode keeps your camera

**Blocked by:** nothing. **Works with:** –

## Problem

Entering simplified mode always applies the fixed setup (`applySimple` in `state/actions.ts`):
full frame, pro zoom, Av, auto ISO, sun. Someone who picked a phone or a kit zoom, or switched to
Tv or M, in "Alle Einstellungen" and then goes back to the simple view loses all of that – and the
three sliders (aperture, shutter as indicator, focal length) may not even fit what they were trying.

## Idea

The fixed setup only applies on the first start (no saved state). Switching back from "Alle
Einstellungen" keeps camera body, lens and mode, and the simple view shows the sliders that make
sense for them.

- **Sliders by mode** (each one the existing control, just shown or hidden):
  - Av: aperture slider, shutter as indicator (as today).
  - Tv: shutter slider, aperture as indicator.
  - P: both as indicators – the camera decides; maybe show only focal length plus the light
    stepper, or switch P to Av on entering. TBD.
  - M: aperture and shutter sliders, plus ISO (only if auto ISO is off – otherwise the camera still
    sets ISO and the exposure stays right).
- **By camera and lens:**
  - Phone: no aperture slider (fixed aperture); the focal slider steps through its back cameras,
    and is hidden for a single camera (iPhone XR). In Av, which a phone doesn't really have, the
    shutter indicator is enough.
  - Film: ISO is the film's – never a slider, even in M.
  - Kit zoom / prime: focal slider as now (primes stand for every focal length).
- **What still resets:** anything that changes the picture but has no control in the simple view,
  so nothing is set by an invisible switch: flash off, person 2 hidden, persons standing still,
  photographer still, digital zoom 1×, no focus tracking, focus on person 1. Light situation: keep it
  (the stepper is there).
- **Rule:** one function decides which controls the simple view shows, from the settings (pure,
  in `src/state` or `src/model`, with a test); CSS hides the rest as today (`.simple` rules in
  `style.css`), driven by data attributes instead of a fixed list.
- SPEC "Simplified mode" changes with it; infobox texts may need a line for Tv/M in the simple
  view.

## Open questions

- P: show only indicators, or switch to Av on entering?
