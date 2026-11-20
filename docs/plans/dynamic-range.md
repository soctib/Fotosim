# Dynamic range

**Blocked by:** nothing. **Works with:** lens-flaws (flare uses the backlight switch), cost-value,
flash (fill flash is the classic fix).

## Goal

Show the biggest visible difference between a phone and a camera besides noise: a person in front
of a bright sky – either the sky is white or the face is black. Lessons: bigger and newer sensors
hold more contrast; phones fake it with HDR bursts; negative film forgives overexposure; fill flash
rescues backlit portraits.

## Model

- **Highlight clip**: a fixed number of stops above correct exposure (digital ≈ +3; colour
  negative film ≈ +5 – its famous latitude; ISO stands for the film, assume colour negative).
- **Shadow floor**: clip minus the usable dynamic range.
- **Dynamic range** per sensor at base ISO (rough: phone single frame ≈ 10, 1" ≈ 12, MFT ≈ 12,
  APS-C ≈ 13.5, full frame ≈ 14, MF ≈ 15 stops), falling about one stop per ISO stop above base
  (it shares its cause with the noise index – could be derived from it). Phones add their
  multi-frame gain (as with `multiFrameStops`, HDR merging extends the range).
- **Scene contrast**: each light preset gets brightness offsets for sky/background relative to the
  subject (sun front light: sky ≈ +2; overcast ≈ +2; indoor with window ≈ +5; night street: lamps
  ≈ +8, shadows ≈ −4). A **"Gegenlicht" switch** in the scene panel puts the subject in shade with
  the bright sky behind (≈ +4…+5).
- Each layer already has its own exposure offset; now it also gets a **clipped / crushed** state
  from where its brightness falls relative to clip and floor.
- The modes keep exposing for the subject (current behaviour) – so with backlight the subject is
  fine and the sky blows out, the honest beginner experience. Flash lifts the subject, which lets
  the camera expose for the sky – fill flash falls out of the existing flash model.

## Rendering

The per-layer brightness becomes a tone curve with a hard top and bottom: clipped layers go flat
white (detail gone, not just bright), crushed layers flat dark with extra noise. Filter change per
layer, no new layers.

## UI

- Switch "Gegenlicht" in the scene panel (simplified mode: off).
- The exposure bar marks other layers that clip ("Himmel ausgebrannt") or a short line in the caption.
- Infobox: what dynamic range is, why phones do HDR, fill flash.

## Data

DR per sensor (and per phone module), clip headroom digital vs film, scene contrast per light
preset, backlight offsets.
