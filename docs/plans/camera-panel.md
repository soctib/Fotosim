# Camera panel (ambitious)

**Blocked by:** nothing. **Works with:** focus-beyond-infinity (the focus ring shows ∞ and beyond),
lens-flaws (lens size per class), hover-infobox (tapping a part shows its text).

A **camera seen from above that you operate directly** – a second view of the controls, not just a
picture of them. Prototype (approved look and interaction):
https://claude.ai/artifact/Hjp2ND6xP7VHcJFNhxrLL6 – source in `docs/prototypes/camera-panel.html` (a sketch to port, not code to copy).

**Layout: two views, one place.** The controls column gets a switch "Kamera | Regler". Both views
edit the same store, so switching is free. The body is always drawn at the same on-screen size, so
the display and dials stay readable; the lens is drawn to scale relative to the body. Very long
lenses: first scale the whole drawing down (to about 75 %), then shorten only the plain barrel
sections between the rings, with a break mark (≈) and the true length written on it – body,
display and rings never shrink further.

**Body (top view):**
- Body per camera class with real-ish proportions (mm, one scale); phones from the top edge with
  the camera bump, screen readout as a card folded out below.
- Mode dial A/P/Av/Tv/M: labels at fixed places on the dial, the whole dial turns to the index.
  Tap to step, drag to turn.
- **Top display in seven-segment digits** (slight italic, faint unlit segments, printed "ISO"
  label). Field sizes come from the widest value ("1/8000", "F5.6", "12800"), so digits never change
  size. Flash symbol; in M a light-meter bar (−2…+2 EV).
- **Front dial** (under the shutter button) and **rear dial** (back edge), dragged sideways:
  Av = aperture, Tv = shutter, M = rear shutter / front aperture, P = rear dial shifts the program,
  A = no function. **ISO button**: value blinks, a dial changes it, press again to end.
- Hot shoe / speedlite: tap to attach or remove the flash.

**Lens (top view):** length from focal length, zooms extend at the long end (internal zooms such as
the 70–200/2.8 don't); front diameter ≥ entrance pupil `f / N_max` plus margin. Zoom ring (real mm
marks) and focus ring (0.3 m … ∞, √-spaced) drawn as cylinders – **drag them sideways and the scale
moves with the finger**. Front view with the entrance pupil as an iris at the same scale.

**Interaction rules:**
- A value you can change shows a thin underline on hover (mouse only); values the mode leaves to
  the camera get the `not-allowed` cursor, and on touch a short warning
  ("In Av wählt die Kamera die Zeit.").
- While a control is held, its underline and cursor stay until release, wherever the pointer goes;
  nothing else reacts to hover meanwhile.
- The camera fills in what the mode leaves to it from `derive()` (exposure), as the sliders do.

**Data:** body sizes per camera class and lens length/diameter per lens kind (rough, like
`prices.ts`; the prototype's tables are the starting point).

**Rules:** SVG built from `derive()` only; all labels in `texts.de.ts`. Tapping a part may also show
the matching infobox text.

**Lesson:** connects the abstract sliders to the physical camera – which dial does what in which
mode – and makes it obvious why a 400 mm f/2.8 costs and weighs what it does.

## Open questions

- Focus scale always 0.3 m … ∞, or from each lens's real minimum (the 400/2.8 starts at ~2.7 m)?
- "A" for full auto means aperture priority on Nikon/Sony – keep it?
- Film bodies: realistic (speed dial, aperture ring, no display) or the generic body with mode dial?
- Entry-level bodies really have no top display – draw one anyway?
- Shown in simplified mode?

