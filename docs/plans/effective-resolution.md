# Effective resolution

**Blocked by:** nothing. **Works with:** digital-zoom (system blur, pixelation, MP after crop),
output-size (needs the effective MP), lens-flaws (corner resolution, correction cost), cost-value.

## Goal

One honest number – **effective megapixels** – that says how much real detail the photo of the
subject in focus contains, and **which factor limits it** ("Beugung", "Fokus", "Verwacklung",
"Objektiv", "Sensor", "Rauschunterdrückung", "Scan"). Lesson: the megapixel figure on the box is an
upper bound; aperture, lens, focus, motion and processing all take their share.

## Model

Every factor becomes a **blur width on the sensor (µm)**. They combine as a root sum of squares
(standard approximation of multiplying MTFs), giving one total blur `b`. From that:
resolvable line pairs per picture height ≈ sensor height / (2·b), and effective MP from that line
count and the aspect ratio – never more than the pixels the file actually has.

Contributions:

| Factor | Concept |
|---|---|
| **Pixels** | Pixel pitch from sensor area and pixel count. A Bayer sensor resolves about 0.7–0.8 of its pixel grid (demosaicing). Phones: the **output** pixel count counts – 48/50 MP quad-Bayer sensors bin to 12–24 MP. |
| **Diffraction** | Airy disc ≈ 2.44·λ·N with λ = 0.55 µm; only a fraction of the disc counts as blur (calibrate, see below). Independent of sensor size in µm, so small pixels hit it first. |
| **Lens** | Per lens class: a best-case blur at its sweet spot (≈ 2 stops down) plus an aberration term that is largest wide open and falls when stopping down. Zooms are a bit worse at the ends of their range. Phones: one fixed quality per camera module. |
| **Defocus** | The subject's blur disc, already in `derive` (`relativeBlur` × CoC). |
| **Motion / shake** | The subject's movement smear and the shake smear, already in `derive`, as lengths on the sensor. Directional, but RSS is good enough. |
| **Processing** | Noise reduction eats fine detail: zero below a noise-index threshold, growing above it. Phones start earlier and smear harder ("watercolour" in low light). Sharpening adds contrast, not detail – mentioned in the text, not modelled. |
| **Film** | Resolving power of the film falls with speed (ISO stands for the film, no stock dropdown). Grain stays in the existing noise index. |
| **Scanner** (film only) | A new dropdown on film cameras: lab scan (fixed pixel count, ≈ 6 MP for 35 mm), flatbed, film scanner, digital camera scan, drum scan. Each is a pixel count / effective dpi with its own blur. Often the bottleneck – that's the lesson. |

The **bottleneck** is the largest contribution. All contributions are reported, so the infobox can
show them as shares.

### Calibration targets (become tests)

*Implemented; the root sum of squares made a few of the first guesses unreachable, so the tests use
the values in brackets.*

- Full frame 24 MP, prime at f/5.6, in focus, tripod: ≈ 15–20 effective MP, limited by pixels. [12–18]
- Same at f/22: clearly lower (≈ 5–8), limited by diffraction. [3–6] Diffraction starts to show around f/11 at 24 MP and around f/8 at 45 MP.
- Kit zoom wide open: noticeably below the prime at the same aperture; ≈ equal two stops down.
- iPhone XR in daylight: ≈ 5–8 of its 12 MP. [4–7] iPhone 15 Pro Max tele (f/2.8, 1.12 µm): diffraction-limited.
- 35 mm ISO 400 film, lab scan: scan-limited at ≈ 5–6 MP; with a film scanner film-limited at ≈ 10–14. [3–5 of the scan's 6.3 MP; 6–10]
- 6×7 film with a film scanner: well above any 35 mm result.
- Night street, phone, high noise index: processing becomes the bottleneck.

## Data

- Pixel count per sensor and per phone camera module (plus output pixel count where binned); one
  representative body per camera type (the price list's example cameras).
- Lens sharpness per lens class (sweet-spot blur, wide-open aberration) and for each phone module.
- Film resolving power vs speed; scanner table (pixels or effective dpi, blur, rough price for cost-value).

## Derived output

`resolution`: effective MP, nominal MP, line pairs per picture height, bottleneck, list of contributions.
For rendering also the **system blur** as a fraction of the image width (pixels + diffraction + lens +
processing – defocus and motion are already drawn per layer).

## UI

- **Bar "Auflösung"** next to exposure/noise/movement: effective MP on a log scale (≈ 0.5–100), the
  nominal MP as a mark, label with the bottleneck.
- **Infobox**: the contributions in plain words ("Beugung bei f/16 kostet hier am meisten"), plus output-size's table once that exists.
- **Scanner dropdown** in the camera panel, only for film cameras.
- Simplified mode: the bar may show (no control involved) – decide during implementation.

## Rendering

A whole-frame Gaussian blur from the system blur. At normal size it stays below one display pixel
and invisible; it becomes visible with digital zoom. Without it, the vector drawing would stay
razor-sharp at any zoom.

## Notes

- The model's "sharp" threshold (CoC = diagonal/1500) is a viewing standard; effective resolution is
  a property of the file. output-size connects the two.
- Reporting resolution for the subject only (not the frame average) is deliberate: the graph already shows what else is out of focus.
