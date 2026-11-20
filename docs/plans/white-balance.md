# White balance

**Blocked by:** nothing. **Works with:** flash (mixed light), effective-resolution (the film
scanner can correct colour negatives).

## Goal

Colour temperature with a simple model: auto WB vs fixed settings, film as fixed daylight, and the
classic mixed-light case with flash. Not much about price – all cameras do this fine – but a common
beginner surprise.

## Model

- **Light colour temperature** per light preset: sun 5500 K, cloudy 6500 K, shade 7500 K, dusk
  ≈ 3500 K (golden light), office ≈ 4000 K, living room ≈ 2800 K, night street ≈ 2000 K (sodium;
  modern LED would be ≈ 4000 K), candle ≈ 1900 K. Flash ≈ 5500 K, phone LED ≈ 5000–6000 K.
- **WB setting**: Auto, or fixed Tageslicht / Bewölkt / Schatten / Kunstlicht / Leuchtstoff / Blitz.
- **Mismatch in mired** (10⁶ / K, roughly perceptually even): light minus setting; positive = too warm, negative = too blue.
- **Auto WB** corrects fully only inside ≈ 3000–7000 K and partly beyond, deliberately leaving some
  warmth in candlelight. Phones correct a bit more aggressively than cameras. Auto targets the subject.
- **Mixed light**: each layer's light is a mix of ambient and flash, weighted by their shares
  (derive already knows both per layer). With flash indoors, the near person is 5500 K and the
  room 2800 K – auto WB can only make one of them neutral.
- **Film**: daylight-balanced, fixed. Colour negative scanned in a lab gets partly corrected (an
  auto WB with less range) – if effective-resolution's scanner choice exists, the lab scan corrects,
  a "neutral" film scan doesn't.
- Optional: correcting very warm light amplifies the blue channel → a small noise penalty.
  Sodium light is nearly monochromatic and can't be corrected to natural colours at all.

## Rendering

Mismatch → RGB channel gains via a blackbody approximation → a colour matrix in each layer's
existing filter chain.

## UI

- WB dropdown in the camera panel; film cameras show it locked with a note. Simplified mode: Auto, hidden.
- Short caption note when the cast is strong ("deutlich orange").
- Infobox: colour temperature, why the shade looks blue, why auto WB kills sunset mood, mixed light.

## Lessons it shows

Mixed light with flash; auto WB "correcting away" dusk light while "Tageslicht" keeps it; blue
shade with daylight WB or film.
