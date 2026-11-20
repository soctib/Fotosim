# Digital zoom / crop

**Blocked by:** effective-resolution – only for pixelation, the system blur and the "MP after crop"
label. The zoom itself works without it. **Works with:** output-size, lens-flaws, perspective.

## Goal

A slider that crops into the photo around the subject in focus. Grain, blur and – far enough in –
pixels become visible. Lesson: digital zoom adds no detail; it enlarges what's there, flaws included.

## Core idea: a crop is a smaller sensor

Cropping by `z` and showing the crop at the same size is physically identical to a sensor `z` times
smaller with the same pixel pitch (so `z²` fewer pixels). `derive` applies the zoom as an
**effective sensor** (width and height ÷ z) before everything else, so the existing physics follows:

| Quantity | With zoom z |
|---|---|
| Crop factor, equivalent focal length | × z ("50 mm, 2× ≙ 100 mm KB") |
| Angle of view, framing | narrower – persons are drawn larger automatically (projection uses the effective frame) |
| CoC → depth of field | CoC ÷ z → **DOF band narrows** |
| Noise index | + 2·log2(z) |
| Handheld limit, movement smear | stricter (equivalent focal length × z, CoC ÷ z) |
| Exposure, flash | unchanged |
| Pixels | ÷ z² |
| Costs | unchanged – the lens choice uses the optical focal length |

### Why the DOF band narrows (decided: option A)

The lens doesn't change; the blur discs on the sensor stay exactly the same. What changes is **what
counts as blurry**: "sharp" means a blur disc that still looks like a point when the whole frame is
seen at normal size. A 2× crop shown at that size is enlarged twice as much, so the allowed blur on
the sensor halves and the zone that looks sharp shrinks. The image shows the same thing from the
other side: blur really looks bigger on screen.

The graph draws the **1× DOF band as a faint outline** behind the narrower band, so the change reads
as a lesson ("this was only 'sharp' at full-frame viewing size"). The infobox explains it in two sentences, including:
digital zoom keeps *more* DOF than optical zoom to the same framing (2× crop of 50 mm ≈ ½ the DOF,
100 mm optical ≈ ¼), but never more than the uncropped photo.

## Phones

Phones use digital zoom all the time – the iPhone's 28/35/48 mm settings are crops of the main
camera that `sensors.ts` currently leaves out; with this feature they're simply 24 mm × 1.2/1.5/2.
The focal length still picks the camera module; zoom crops within it. Optional hint: "Die 5×-Kamera
wäre hier schärfer" when the crop exceeds what the tele module would give.

## Rendering

- **Framing** comes for free from the effective sensor. The crop is **anchored on the subject in
  focus** (a person's face, or the scenery's AF target), clamped so it stays inside the uncropped frame.
- **Grain** gets coarser by z (overlay frequency ÷ z) and stronger via the higher noise index.
- **System blur** (from effective-resolution) is scaled to the cropped frame – softness appears.
- **Pixelation**: once one sensor pixel of the crop is larger than about 2 display pixels, an SVG
  pixelate filter (sample-and-tile trick) on the whole frame with that cell size. Fallback where
  the browser can't do it: blur only. No renderer rewrite – one more frame filter.

## UI

- Slider "Digitalzoom" in the lens panel under the focal length, log scale 1×–10×, label
  "2× (≙ 100 mm KB, 6 MP)".
- Not in simplified mode; entering it resets the zoom to 1×.
- Infobox text: what a crop does, the DOF explanation, "Zoom mit den Füßen".
