# Perspective (face proportions)

**Blocked by:** nothing. **Works with:** digital-zoom (crop vs. stepping back shows that perspective
depends on distance only).

## Goal

The "wide angle makes faces ugly" lesson, stated correctly: proportions depend only on the
**distance** to the camera. A wide angle just tempts you to go close; a long lens makes you step
back. That's why portraits are shot at ≈ 85 mm.

## Model

Magnification is proportional to 1/distance. Parts of a face at different depths are magnified
differently: relative to the eyes, a part at depth offset Δ is scaled by d / (d + Δ).

- At 0.5 m: nose tip (−3 cm) ≈ 6 % larger, ears (+9 cm) ≈ 15 % smaller, head outline noticeably narrower.
- At 3 m: everything within ≈ 3 % – a "flat", flattering face.

Pure geometry, no lens data. The depth offsets live in `ui/face.ts` (`FACE_DEPTH_M`), shared by the
graph and the camera image's part filters; this plan adds the depth of the head's sides
(cheeks/outline) so the face can narrow.

## Current state

The figurine (`ui/sim/figurine.ts`) is drawn in three depth groups – ears, face/body, nose – that the
camera image already blurs by their own depth, but all with one scale (from the eye distance). The
head is one Personas outline (head, neck and ear bumps); the ears are separate paths cut from its ear
bumps. The graph's profile heads already sit at true distances.

## Rendering

Each depth group is scaled around the head axis by its own factor (a transform per group, so the
existing per-group blur filters stay as they are); the head outline gets a horizontal scale for its
sides' depth so it narrows up close, and the ears move in with it. The body stays at the eye-distance scale (it's mostly
out of frame at such distances anyway). Only the person drawing changes.

## UI

No new control. Infobox text (on the focal length or on the persons): distance makes the
perspective, focal length only the framing; "für Porträts zurücktreten und heranzoomen".
With digital-zoom: a crop doesn't change proportions – same position, same face.
