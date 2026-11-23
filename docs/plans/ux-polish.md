# UX polish

**Blocked by:** nothing – each item stands alone. **Works with:** –

Three small fixes. Each can be done and committed on its own.

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

## Open questions

- Accent blue: which one, and does the curve colour change?
