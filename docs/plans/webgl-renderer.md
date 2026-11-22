# WebGL renderer (maybe never)

**Blocked by:** nothing. **Works with:** lens-flaws (distortion and CA are its main reason),
dynamic-range, white-balance, rolling-shutter, digital-zoom. Only worth doing if the SVG/CSS
renderer gets too slow once those plans land. **Measure first** (see "When").

## Goal

Same camera image, same physics, drawn on a GPU. All whole-frame effects become cheap shader passes
instead of SVG filters, which Safari and Firefox mostly run on the CPU. Nothing a user sees changes,
except that it stays smooth on a phone while a slider is dragged.

## Why SVG/CSS might stop being enough

Measured in Playwright WebKit, 390 px wide, DPR 2, dragging the focus slider (Nov 2026):

| State | Frame time |
|---|---|
| 1×, any ISO | ≈ 17 ms (60 fps) |
| 20× zoom, person out of focus | ≈ 100–130 ms |
| 20× zoom, person sharp | ≈ 17 ms |

What costs the time is the **per-part person blur** (`feGaussianBlur` on ears, body and nose, two
persons): turning those filters off brings 20× back to fast frames. Turning off pixelation, grain or
the frame-wide blur changes almost nothing. The cost grows with the blur radius in display pixels,
and at high zoom a defocused person reaches the 60 px cap. Headless WebKit renders in software, so
treat these as relative numbers, not phone numbers.

How the planned effects map onto SVG:

| Effect | SVG/CSS | Cost there |
|---|---|---|
| Vignetting, flare haze | gradient overlay | cheap |
| Rolling-shutter skew | transform per layer | cheap |
| White balance, tone curve (DR) | `feColorMatrix` / `feComponentTransfer` per layer | moderate |
| Distortion | `feDisplacementMap` over the frame | expensive, per pixel on the CPU |
| Chromatic aberration | 3× displacement + merge | most expensive |

## Cheaper steps first

Try these before rewriting anything:

1. Render at most once per animation frame. *Done.*
2. Grain from a tile made once, not `feTurbulence`. *Done.*
3. Person blur: one filter instead of three when the parts' sigmas are nearly equal (always the
   case at the cap), and filter regions limited to each part's bounding box plus 3σ, intersected
   with the visible crop.
4. While a slider is being dragged, skip the expensive filters (distortion, CA, pixelation, maybe
   use a lower blur cap) and draw them on release. A blurry or straight-lined frame during a drag is
   hardly noticed.

## When

Do this plan only if, after step 3–4 and with lens-flaws in place, a mid-range phone (or WebKit at
4× CPU throttling) stays under ~30 fps while dragging in a normal situation. Not for edge cases
like 20× zoom with everything out of focus.

## Design

A hybrid that keeps the DOM layers and runs a shader over them doesn't work: a shader can't read
the composited DOM. It's a full switch of the camera image (not of the rest of the UI).

### Pipeline

1. **Rasterize** each layer (sky/ground, scenery, each person part: ears, body, nose) into a
   texture: serialize the existing SVG string → `Blob` → `createImageBitmap` (or `Image` +
   `drawImage` into an `OffscreenCanvas`). It's async, but only needed when something in the drawing
   changes (scenery, sizes, positions, zoom, frame width), not when only blur, light or noise
   change. The existing `scenery.ts` and `drawPerson` stay the source of the shapes.
   Rasterize at the size the layer is shown, with the zoom transform included, so zoomed detail stays
   sharp; re-rasterize after zoom changes (throttled, keep showing the old texture scaled meanwhile).
2. **Per-layer pass** (into a framebuffer each): brightness gain (in sRGB, as now), later the
   tone curve and white balance; then defocus blur and movement smear, as separable Gaussians
   (horizontal and vertical can differ, as the smear does now). Large sigmas: downsample by 2–4
   first, blur, then upsample, so the cost stays flat.
3. **Composite** the layers far to near (premultiplied alpha), in the same order as now.
4. **Frame pass**, one shader: distortion and CA (radial remap of the texture coordinate, per channel
   for CA), shake (directional blur), system blur, pixelation (snap the coordinate to cell centres),
   vignetting, flare haze, grain (hash noise per file pixel, so it's aligned with the cells for free),
   rolling-shutter skew.
5. Uniforms come straight from `derive()`, so the UI still doesn't do physics. The mapping from
   derived values to pixels (sigmas, gains, cell size) moves out of `sim.ts` into a small pure
   function both renderers could share, with tests.

### What has to be rebuilt

- **Hit-testing** for tap-to-focus: today the browser finds the tapped SVG shape. Instead, keep
  each layer's alpha (read back once per rasterization, or test against the person's bounding
  shapes in JS).
- **AF frame and caption** stay DOM on top of the canvas – no change.
- **Accessibility**: the canvas keeps `role="img"` and the same label.
- **Resize**: the canvas backing store follows the frame size × `devicePixelRatio`; re-rasterize on
  resize (the `ResizeObserver` is already there).
- **Context loss** (phones drop WebGL contexts in the background): listen for
  `webglcontextlost`/`restored` and rebuild textures.

### Fallback

Keep the SVG renderer behind the same `render(d, scenery)` interface. Use WebGL when
`canvas.getContext('webgl2')` works, else SVG (without the new effects, or with their slow SVG
versions). One flag in the URL (`?renderer=svg`) to compare both.

### Constraints that still hold

- One offline HTML file: shaders are strings in TS, no libraries. WebGL2 is in every current
  browser, including iOS Safari ≥ 15.
- No external requests – nothing changes there.
- Plain WebGL2, no three.js/regl: the pipeline is a handful of full-screen quads.

## Cost

Roughly the size of `sim.ts` again, plus shaders: rasterization cache, 3–4 shader programs,
framebuffer management, hit-testing, fallback switch. The physics, data, texts and the rest of the
UI don't change.

## Risks

- Text-like fine detail (eyes, iris rays) depends on rasterizing at the right scale; zooming
  between re-rasterizations looks soft for a moment.
- Two renderers to keep in sync while the fallback exists.
- GPU differences in blending/precision; test WebKit (iOS) first, as for the SVG renderer.
