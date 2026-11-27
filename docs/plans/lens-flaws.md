# Lens flaws

**Blocked by:** nothing – each part stands alone. **Works with:** effective-resolution (corner
resolution, cost of correction), dynamic range (flare uses the existing backlight switch, `scene.backlight`), digital-zoom
(a centre crop hides most flaws).

## Goal

Show what expensive lenses buy beyond aperture: fewer flaws. And show what modern cameras and
phones do about the flaws – correct them in software, which isn't free.

## The flaws

| Flaw | Model | Rendering |
|---|---|---|
| **Vignetting** | Corner darkening in stops per lens class, strongest wide open and at the wide end, gone ≈ 2–3 stops down. Phones: strong but always corrected. | Radial darkening overlay. |
| **Chromatic aberration** (lateral) | Colour fringes growing towards the edges, per lens class and focal length; cheap zooms worst. | Radial per-channel scaling (same displacement machinery as distortion). |
| **Distortion** | Barrel at the wide end, pincushion at the long end of zooms, little in primes, strong in phone ultra-wides. In percent per lens class and focal length. | Radial displacement filter on the whole frame. The scenery needs a few straight lines near the edges (house, horizon, window frames, lamp posts) to show it. |
| **Flare / veiling glare** | With backlight (`scene.backlight`) contrast drops; cheaper coatings drop it more. | Haze overlay. |

All strengths grow with the distance from the image centre, so they're evaluated over the visible
frame: with digital zoom the crop only reaches 1/z of the radius and flaws mostly vanish.

## In-camera correction

Switch "Objektivkorrektur" (cameras: on by default, can be turned off; phones: always on; film: none).

- **Off**: you see the flaws.
- **On**: flaws mostly removed, with costs:
  - vignetting correction brightens the corners → corner noise goes up by the corrected stops;
  - distortion correction stretches the corners → lower corner resolution, slight crop;
  - CA correction is nearly free.

That's the "digital processing" lesson: cheap lenses plus software look fine in the middle and pay at the edges.

## Data

Per lens class (and per phone module): vignetting, CA and distortion as functions of focal length
and aperture; flare susceptibility.

## Derived output

Per flaw a strength for rendering; corner noise penalty and corner resolution (feeds
effective-resolution's report as a "Ecken" value next to the centre value).

## UI

- Correction switch in the lens panel (not in simplified mode; there it's on).
- Infobox text per flaw – reached by tapping the image corners, or one text for all.
