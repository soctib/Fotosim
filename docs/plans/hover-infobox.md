# Infobox reacts on hover

**Blocked by:** nothing. **Works with:** camera-panel (tapping a part may show its infobox text).

## Problem

The infobox explains whatever was last clicked, pressed or focused. To read about a control you
have to touch it – and clicking a bar or a slider can change it as a side effect. The "Wofür reicht
das Foto?" box already switches on hover (`pointerenter` in `ui/quality/quality.ts`); everything
else doesn't.

## Idea

With a mouse, hovering is enough to show the matching text; touch keeps tap, keyboard keeps focus.

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

## Open questions

- Keep the last hovered text when the pointer leaves, or fall back to the last clicked one? Delay
  before switching, and how long?
- Infobox out of view: should hover (or tap) show the text near the pointer instead, e.g. a popover,
  when the infobox isn't visible?
