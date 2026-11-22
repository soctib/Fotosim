# Feature plans

Concept documents for planned features. No code – each describes the idea, the model, the data it
needs, what the UI shows and how it touches the other plans. They can be implemented in any order;
hard blockers are marked **Blocked by**, soft links **Works with**.

Common theme: show **why some gear costs more and what it changes in the picture** – and, just as
honestly, where it changes nothing (still subject, good light, small view: a phone is fine).

| Plan | One line | Blocked by | Works with |
|---|---|---|---|
| [effective-resolution](effective-resolution.md) | Effective megapixels from pixels, diffraction, lens, focus, motion, processing, film + scanner; names the bottleneck | – | all |
| [digital-zoom](digital-zoom.md) | Crop slider = smaller effective sensor; grain, blur and pixels get bigger | pixelation and system blur: effective-resolution | output-size, lens-flaws, perspective |
| [output-size](output-size.md) | Which screens and print sizes the photo still holds up on | effective-resolution | digital-zoom |
| [dynamic-range](dynamic-range.md) | Backlight, blown skies and crushed shadows; sensor size, generation, film latitude | – | lens-flaws (flare), cost-value |
| [lens-flaws](lens-flaws.md) | Vignetting, chromatic aberration, distortion, flare; in-camera correction and its cost | – (each part stands alone) | effective-resolution, dynamic-range, digital-zoom |
| [rolling-shutter](rolling-shutter.md) | Electronic shutter skews moving things; readout speed is what stacked sensors cost money for | – | – |
| [white-balance](white-balance.md) | Colour temperature, auto vs fixed WB, film, mixed light with flash | – | effective-resolution (scanner) |
| [perspective](perspective.md) | Face proportions depend on distance only, not on focal length | – | digital-zoom |
| [focus-beyond-infinity](focus-beyond-infinity.md) | Zooms focus past ∞: nothing is sharp, dramatic on long lenses; focus stored in diopters | – | effective-resolution |
| [ux-improvements](ux-improvements.md) | Graph scrollbar, layout overflow fix, scene icons, blue accent, livelier dolls, top-view camera panel | – | focus-beyond-infinity |
| [cost-value](cost-value.md) | The cost panel says what each item buys *in the current situation* | – | gets richer with every other plan |
| [webgl-renderer](webgl-renderer.md) | Camera image on the GPU – only if SVG filters get too slow (measure first; maybe never) | – | lens-flaws, dynamic-range, white-balance, rolling-shutter |

Suggested order (by how much it explains about price): effective-resolution → digital-zoom →
output-size → dynamic-range → lens-flaws → rolling-shutter → cost-value → white-balance → perspective → focus-beyond-infinity.

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
