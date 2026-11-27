# Rolling shutter

**Blocked by:** nothing. **Works with:** the existing movement model; cost-value (explains the
mid-range vs high-end full frame price gap).

## Goal

Today the two full-frame tiers differ only by their fastest shutter. In reality the high-end body
pays for a **fast-reading (stacked) sensor**: no skewed moving subjects with the silent electronic
shutter. Phones always read out electronically.

## Model

- **Readout time** per sensor (whole frame, top to bottom): phones ≈ 1/30–1/60 s, mid-range full
  frame ≈ 1/15–1/20 s, APS-C/MFT ≈ 1/25–1/40 s, stacked high-end ≈ 1/250 s or faster, mechanical
  shutter (curtain travel) ≈ 1/250 s, film: mechanical only. The 6×6's leaf shutter opens the whole
  frame at once – no skew at all (a nice contrast).
- **Shutter type**: mechanical or electronic. Electronic allows the fastest times and is silent but
  uses the readout time. Flash only works with the mechanical shutter (except phones' LED).
- **Skew**: during the readout an element moving sideways at relative speed v (from the movement
  model) shifts by v·T·f/(d−f) on the sensor between top and bottom row → a slant angle per layer.
  The background skews when the photographer moves (driving).
- Optional: **banding** with electronic shutter under pulsing light (office, LED street) at short
  shutter times.

## Rendering

A horizontal skew transform per layer – cheap, fits the per-layer movement smear already there.
Banding: a faint stripe overlay.

## UI

- Shutter type "Mechanisch / Elektronisch" for digital cameras, in both control views: a switch in
  the slider view's "Kamera" section, and in the top-view camera panel a field on the top display
  (`ui/camera/lcd.ts`) or a small lever on the body. Phones fixed electronic, film fixed mechanical.
  Not in simplified mode (mechanical there).
- With electronic shutter the fastest-shutter limit rises (e.g. 1/16000), so it's also the way to
  shoot f/1.4 in sunlight.
- Movement bar or caption mentions visible skew; infobox explains readout and stacked sensors.

## Data

Readout time per sensor and phone module; electronic fastest shutter per camera type.
