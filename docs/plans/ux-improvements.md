# UX improvements

**Blocked by:** nothing – each item stands alone. **Works with:** focus-beyond-infinity (the camera
panel's focus ring shows ∞ and beyond), lens-flaws (camera panel: lens size per class).

A collection of smaller fixes plus a few bigger ideas, roughly from small to large. Each item can be
done and committed on its own.

## 1. Scrollbar for the linear graph

**Problem:** in linear mode (log off) the graph only moves by dragging, the wheel or pinch zoom.
Reaching the 50 m background from a 0–3 m view takes many drags.

**Idea:** a thin pseudo-scrollbar under the axis, linear mode only.

- The track stands for the whole range `MIN_DISTANCE_M … MAX_DISTANCE_M`, on a **log scale** – on
  a linear track 0–15 m would be a sliver next to 1000 m. The thumb shows the current view
  (`linearView` in `ui/graph/graph.ts`); its width follows the zoom.
- Dragging the thumb pans (keeps the span); tapping the track jumps there. Pointer Events, same
  as the existing pan gesture, so it works on touch.
- Small tick marks on the track for the visible elements and the focus, so you can jump to them.
- Hidden in log mode (everything fits there anyway).

## 2. Background icon matching the scene

**Problem:** the draggable background marker in the graph is always mountains + sun
(`drawElement` in `ui/graph/graph.ts`), also indoors and at night.

**Idea:** each scenery in `ui/sim/scenery.ts` names its graph icon, and the graph draws it:

| Light presets | Icon |
|---|---|
| sun, cloudy, shade | house with tree (what the image shows) |
| dusk | house, moon instead of sun |
| office, livingRoom, candle | wall (with a window or picture frame) |
| nightStreet | city skyline |

The graph gets the scenery via the store state (`lightPresetId`), not from the sim module directly –
a small `graphIcon` field on `Scenery` and a lookup are enough.

## 3. Blue as the accent colour

**Problem:** `--accent` (orange, `#d9480f` / dark `#ff8a4c`) is almost the same as `--warn`
(`#e8590c`). Active mode button, slider fill and the focus marker look like warnings.

**Idea:** blue accent; orange and red stay reserved for warnings (shake zones, exposure, noise).

- `--curve` (the blur curve) is already blue (`#1c5d99` / `#74b0ec`). Either give the accent a
  clearly different blue (brighter, more saturated) or move the curve to a neutral grey-blue – TBD
  (see open questions); compare both in light and dark mode.
- Check every use of `--accent`: mode buttons, `accent-color` on inputs, focus outlines, the focus
  marker in the graph, the infobox border.
- Check contrast (text on the accent, accent on the panel background) in both themes.

## 4. Livelier dolls

Small touches that also teach something.

- **New figurine first** (do this before smile and wave, they build on it). Approved prototype:
  https://claude.ai/artifact/RctcVX6H2yqo7fsNYG9DDH – source in `docs/prototypes/doll-redesign.html`.
  - **Head:** the Personas outline (head, neck and ear bumps in one shape; 23 cm wide, eye line at
    −165 cm), face in a lighter skin tone than neck and ears, small fold inside each ear. Ears stay
    their own depth group (clipped off the outline).
  - **Hair:** Personas shapes with pre-mixed highlight colours (blend modes do nothing inside a
    blurred group). Person 1 `shortCombover`, person 2 `bobCut` (others in the prototype gallery).
  - **Colours:** Personas palette – person 1 skin `#e5a07e`, hair `#6c4545`; person 2 skin
    `#b16a5b`, hair `#362c47`. Shirts stay ours.
  - **Kept from our doll:** the detailed eyes (now at ±4.8 cm) and the mouth.
  - **Nose:** our triangle with a flat shadow on its left half; the whole nose fades from the tip up
    to the bridge (vertical opacity mask). Nostrils flat, tilted outward and clipped to the nose
    outline; freckles and tip highlight for close-ups. No shadow under the tip.
  - **Body "C":** t-shirt with rounded shoulders (±19.6 cm) and a neckline showing the neck, short
    sleeves, bare forearms and hands, jeans with cuffs, sneakers with white soles.
  - **Licence:** Personas by Draftbit is CC BY 4.0 – add a credit line ("based on Personas by
    Draftbit, modified") to the README and the about/infobox text.

- **Smile when in focus:** a person smiles only while in focus, otherwise a neutral mouth. Gives a
  playful "you got it" cue. What "in focus" means is TBD (see open questions).
  Same in the graph's profile heads when they're big enough.
- **Side view when moving:** persons that walk or run are drawn from the side, in a stride pose
  (walking: one leg forward; running: longer stride, bent arms, leaning forward). Facing the
  direction of movement. Standing persons stay front-on.
  - Per-part blur changes: in profile, nose, eye and ear sit side by side at almost the same
    distance, so the depth-based part blur mostly disappears – the motion smear is what matters then.
  - "Driving": TBD (see open questions).
- **Wave at the long lens (easter egg):** with a long lens (`equivalentFocalMm` ≥ ~200) and a person
  big enough to see (`frameHeightFraction` ≥ ~0.3, from `derive()`), the person waves at you after
  ~10 s without pointer movement. One raised arm swinging for a few seconds, then back to rest;
  any pointer move, key or store change cancels it and restarts the timer.
  - Only standing persons that are visible and roughly in focus (same test as the smile, so both
    cues agree); if several qualify, the biggest one waves.
  - Rendering only: an idle timer in `ui/sim/sim.ts` plus an arm angle in the doll drawing. No
    infobox text, no hint – it's meant to be found. Respect `prefers-reduced-motion` (skip it).
  - Quiet lesson: the long lens is what makes someone far away feel close enough to wave at.
- No physics change; rendering only (`ui/sim/sim.ts`, graph heads in `ui/graph/graph.ts`).

## 5. Infobox reacts on hover

**Problem:** the infobox explains whatever was last clicked, pressed or focused. To read about a
control you have to touch it – and clicking a bar or a slider can change it as a side effect. The
"Wofür reicht das Foto?" box already switches on hover (`pointerenter` in `ui/quality/quality.ts`);
everything else doesn't.

**Idea:** with a mouse, hovering is enough to show the matching text; touch keeps tap, keyboard
keeps focus.

- One shared helper (e.g. `explainOn(el, store, key)` in `ui/`) that wires `pointerenter`
  (mouse/pen only), `pointerdown` and `focus`. It replaces the scattered `setInfo` listeners in
  `controls/controls.ts` (`data-info`), `bars/bars.ts`, `graph/graph.ts`, `elements/elements.ts`,
  `lightStepper.ts` and `quality/quality.ts`.
- Graph: the key depends on what's under the pointer (focus line, AF marker, curve), so it needs
  `pointermove` over the graph rather than one `pointerenter`.
- On the way to a control the mouse sweeps over others and the text flickers through them – a short
  delay before switching (≈ 150 ms) may help. TBD (see open questions).
- The infobox keeps its fixed height, so changing texts on hover never shifts the layout.
- Doesn't solve the infobox being out of view (scrolled away, or below the controls on narrower
  layouts) – see open questions.

## 6. Mini graph above the preview (phone only)

**Problem:** on a phone the camera image sticks to the top while you scroll to the controls, but
the sharpness graph scrolls away. Moving focus, aperture or a person, you see the picture change
but no longer *where* the sharp zone lies.

**Idea:** a minimal strip version of the graph, a few lines tall (≈ 28–36 px), shown inside the
sticky preview, above the camera image, only once the real graph is out of view.

- **Content:** the distance axis without labels (log scale, like the full graph's default), the
  DOF band, the focus line and a small marker per visible element (person heads, background) at
  its distance – coloured sharp/blurred as in the full graph. No curve, no y axis, no flash zone,
  no profile heads. One short figure at most (e.g. the DOF range in m), only if it fits.
- **When:** narrow layout with the sticky preview (same media query as `.preview[open]` sticky)
  and the graph scrolled out of view, detected with an `IntersectionObserver` on the graph.
  Fades or slides in, so the sticky header doesn't jump. With `prefers-reduced-motion`, it just
  appears.
- **Interaction:** read-only at first – tapping it scrolls back to the full graph (and shows the
  graph's infobox text). Dragging focus or elements in the strip is tempting, but too fiddly at
  this height on touch; TBD (see open questions).
- **Rules:** built from `derive()` only, like the full graph; reuses the graph's scale code
  (`ui/graph/scale.ts`) so positions match exactly. Not on desktop/tablet layouts, where the graph
  stays visible next to the image. Simplified mode: shown too – it's where the graph matters most.
- Keep the sticky block short: the strip plus the image must still leave room for the controls
  on small phones (≈ 560 px tall, the sticky query's lower bound).

## 7. Simplified mode keeps your camera

**Problem:** entering simplified mode always applies the fixed setup (`applySimple` in
`state/actions.ts`): full frame, pro zoom, Av, auto ISO, sun. Someone who picked a phone or a kit
zoom, or switched to Tv or M, in "Alle Einstellungen" and then goes back to the simple view loses
all of that – and the three sliders (aperture, shutter as indicator, focal length) may not even
fit what they were trying.

**Idea:** the fixed setup only applies on the first start (no saved state). Switching back from
"Alle Einstellungen" keeps camera body, lens and mode, and the simple view shows the sliders that
make sense for them.

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

## 8. Camera panel (ambitious)

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

**Still open (camera panel):**
- Focus scale always 0.3 m … ∞, or from each lens's real minimum (the 400/2.8 starts at ~2.7 m)?
- "A" for full auto means aperture priority on Nikon/Sony – keep it?
- Film bodies: realistic (speed dial, aperture ring, no display) or the generic body with mode dial?
- Entry-level bodies really have no top display – draw one anyway?
- Shown in simplified mode?

## Open questions (all TBD)

- Smile cue: eyes inside the depth of field, or "is the current subject"?
- Accent blue: which one, and does the curve colour change?
- "Driving" persons: how to draw them – a car or bike outline, or simply the running pose?
- Hover infobox: keep the last hovered text when the pointer leaves, or fall back to the last
  clicked one? Delay before switching, and how long?
- Mini graph: read-only, or can focus and elements be dragged in the strip? Show a DOF figure?
- Simplified mode with P: show only indicators, or switch to Av on entering?
- Infobox out of view: should hover (or tap) show the text near the pointer instead, e.g. a popover,
  when the infobox isn't visible?
