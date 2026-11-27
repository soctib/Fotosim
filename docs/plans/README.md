# Feature plans

Concept documents for planned features. No code – each describes the idea, the model, the data it
needs, what the UI shows and how it touches the other plans. They can be implemented in any order;
hard blockers are marked **Blocked by**, soft links **Works with**. Implemented plans are deleted;
their features (effective resolution, digital zoom, output size, dynamic range, the figurine, the camera panel) are described in SPEC.md.

Common theme: show **why some gear costs more and what it changes in the picture** – and, just as
honestly, where it changes nothing (still subject, good light, small view: a phone is fine).

| Plan | One line | Blocked by | Works with |
|---|---|---|---|
| [lens-flaws](lens-flaws.md) | Vignetting, chromatic aberration, distortion, flare; in-camera correction and its cost | – (each part stands alone) | effective-resolution, dynamic-range, digital-zoom |
| [rolling-shutter](rolling-shutter.md) | Electronic shutter skews moving things; readout speed is what stacked sensors cost money for | – | – |
| [white-balance](white-balance.md) | Colour temperature, auto vs fixed WB, film, mixed light with flash | – | effective-resolution (scanner) |
| [perspective](perspective.md) | Face proportions depend on distance only, not on focal length | – | digital-zoom |
| [focus-beyond-infinity](focus-beyond-infinity.md) | Zooms focus past ∞: nothing is sharp, dramatic on long lenses; focus stored in diopters | – | effective-resolution |
| [ux-polish](ux-polish.md) | Small fixes: linear-graph scrollbar, scene-matching background icon, blue accent | – | – |
| [hover-infobox](hover-infobox.md) | Infobox follows the mouse on hover; one shared helper replaces scattered listeners | – | – |
| [doll-life](doll-life.md) | Smile when in focus, side view when moving, wave at the long lens | – | – |
| [phone-mini-graph](phone-mini-graph.md) | Strip graph in the sticky phone preview once the real graph scrolls away | – | – |
| [simple-mode-keeps-camera](simple-mode-keeps-camera.md) | Simplified mode keeps body, lens and mode; sliders chosen per mode and camera | – | – |
| [cost-value](cost-value.md) | The cost panel says what each item buys *in the current situation* | – | gets richer with every other plan |
| [webgl-renderer](webgl-renderer.md) | Camera image on the GPU – only if SVG filters get too slow (measure first; maybe never) | – | lens-flaws, dynamic-range, white-balance, rolling-shutter |

Suggested order (by how much it explains about price): lens-flaws → rolling-shutter → cost-value → white-balance → perspective → focus-beyond-infinity.

## Rules every plan follows

- Physics in `src/model`, pure and unit-tested; the UI reads only `derive()`.
- On-screen text only in `texts.de.ts`; every new control or bar gets an infobox text.
- New controls stay hidden in simplified mode unless a plan says otherwise; simplified mode sets them to their neutral value.
- New settings are persisted like the existing ones.
- Rendering adds filters/overlays to the existing camera image – no rewrite of the renderer (webgl-renderer is the one exception, and only if needed).
- SPEC.md is updated when a plan is implemented; the plan file can then be deleted or marked done.

## Ideas, not planned yet

- **Sensor generation**: newer sensors (BSI, stacked, dual gain) are about one stop cleaner at the same size. Would split noise per body, not per format.
- **Autofocus hit rate**: sports bodies keep moving subjects in focus more reliably; today AF is always perfect.
- **Burst rate / buffer**: a price driver, but it doesn't show in a single image.
