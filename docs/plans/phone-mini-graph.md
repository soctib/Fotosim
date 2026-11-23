# Mini graph above the preview (phone only)

**Blocked by:** nothing. **Works with:** –

## Problem

On a phone the camera image sticks to the top while you scroll to the controls, but the sharpness
graph scrolls away. Moving focus, aperture or a person, you see the picture change but no longer
*where* the sharp zone lies.

## Idea

A minimal strip version of the graph, a few lines tall (≈ 28–36 px), shown inside the sticky
preview, above the camera image, only once the real graph is out of view.

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

## Open questions

- Read-only, or can focus and elements be dragged in the strip? Show a DOF figure?
