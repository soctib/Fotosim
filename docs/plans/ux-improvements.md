# UX improvements

**Blocked by:** nothing – each item stands alone. **Works with:** focus-beyond-infinity (the camera
panel's focus ring shows ∞ and beyond), lens-flaws (camera panel: lens size per class).

A collection of smaller fixes plus two bigger ideas, roughly from small to large. Each item can be
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

## 2. Layout overflow in the three-column view

**Problem:** at some window widths the right column (infobox, costs) is cut off at the screen edge
(screenshot: the infobox and cost panel run past the right edge, next to the controls).

**To investigate:** the wide layout (`@media (min-width: 1400px)` in `style.css`) needs at least
stage + 300 px + 340 px + gaps + page padding. Suspects:

- the stage doesn't shrink below its content: the resizable camera image (`--sim-width`, saved by
  `ui/sim/resize.ts`) plus the bars beside it can be wider than the space left;
- the 1400 px breakpoint doesn't include the page padding or a visible scrollbar;
- the lens panel moving into the info column while the cost list is folded (`main.ts`).

**Fix direction:** reproduce with Playwright at 1400–1500 px with a large saved sim width; then
clamp the sim width to the available stage width (`resize.ts` already has `maxWidth()`, it may
just not be re-applied on window resize) and/or raise the breakpoint. Check for horizontal
scroll at every breakpoint.

Edit by Human: This is a misundersanding. The gap between boxes is uneven, nothing overflows.

## 3. Background icon matching the scene

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

## 4. Blue as the accent colour

**Problem:** `--accent` (orange, `#d9480f` / dark `#ff8a4c`) is almost the same as `--warn`
(`#e8590c`). Active mode button, slider fill and the focus marker look like warnings.

**Idea:** blue accent; orange and red stay reserved for warnings (shake zones, exposure, noise).

- `--curve` (the blur curve) is already blue (`#1c5d99` / `#74b0ec`). Either give the accent a
  clearly different blue (brighter, more saturated) or move the curve to a neutral grey-blue – TBD
  (see open questions); compare both in light and dark mode.
- Check every use of `--accent`: mode buttons, `accent-color` on inputs, focus outlines, the focus
  marker in the graph, the infobox border.
- Check contrast (text on the accent, accent on the panel background) in both themes.

## 5. Livelier dolls

Small touches that also teach something.

- **Smile when in focus:** a person smiles only while in focus, otherwise a neutral mouth. Gives a
  playful "you got it" cue. What "in focus" means is TBD (see open questions).
  Same in the graph's profile heads when they're big enough.
- **Side view when moving:** persons that walk or run are drawn from the side, in a stride pose
  (walking: one leg forward; running: longer stride, bent arms, leaning forward). Facing the
  direction of movement. Standing persons stay front-on.
  - Per-part blur changes: in profile, nose, eye and ear sit side by side at almost the same
    distance, so the depth-based part blur mostly disappears – the motion smear is what matters then.
  - "Driving": TBD (see open questions).
- No physics change; rendering only (`ui/sim/sim.ts`, graph heads in `ui/graph/graph.ts`).

## 6. Infobox reacts on hover

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

## 7. Camera panel (ambitious)

A foldable panel (like infobox and costs, fold state persisted) with a **generic, simplified
camera seen from above**, showing the current settings the way a real camera would.

**Body (top view):**
- Mode dial with A/P/Av/Tv/M, the current mode at the index mark.
- Top display (LCD) with shutter, aperture, ISO and flash symbol, like real top displays.
- Shutter button; flash in the hot shoe when the flash is on.
- Body width roughly by camera class (compact system camera vs full-frame body); phones get a phone
  seen from the back edge instead, with the camera bump.

**Lens (top view, attached to the front):**
- **Size from the settings:** length grows with the focal length; the front diameter is at least the entrance
  pupil `f / N_max` (why fast teles are huge) plus a barrel margin. Zooms extend at the long end;
  primes are drawn at the focal length they stand for.
- **Zoom ring** with focal-length marks (real mm), index at the current focal length.
- **Focus ring** with a distance scale (0.3 m … ∞), index at the focus distance; with
  focus-beyond-infinity, the travel past ∞.
- Aperture shown by the size of the opening on the front view.

**Data:** typical lens length/diameter per lens class and focal length (rough, like `prices.ts`),
body widths per camera class.

**Rules:** SVG built from `derive()` only; all labels in `texts.de.ts`. Placement and simplified
mode: TBD (see open questions). Tapping a part (dial, ring) shows the matching infobox text.

**Lesson:** connects the abstract sliders to the physical camera – and makes it obvious why a
400 mm f/2.8 costs and weighs what it does.

## Open questions (all TBD)

- Smile cue: eyes inside the depth of field, or "is the current subject"?
- Camera panel: where does it go in the layout (under the camera image, or in the info column), and
  is it shown in simplified mode?
- Accent blue: which one, and does the curve colour change?
- "Driving" persons: how to draw them – a car or bike outline, or simply the running pose?
- Hover infobox: keep the last hovered text when the pointer leaves, or fall back to the last
  clicked one? Delay before switching, and how long?
- Infobox out of view: should hover (or tap) show the text near the pointer instead, e.g. a popover,
  when the infobox isn't visible?
