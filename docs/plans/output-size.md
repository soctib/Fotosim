# Output size: screens and prints

**Blocked by:** effective-resolution (needs effective MP). **Works with:** digital-zoom (cropped
pixels and noise feed in automatically).

## Goal

Answer "how big can I show this?" – a list of screens and print sizes with ✓ / ~ / ✗.

## Model

The eye resolves about **1 arcminute** (≈ 0.29 mrad). At viewing distance D the finest visible
detail is D × 0.00029; an image needs about one effective pixel per such detail across its height.

Two viewing situations:

- **Up close (30 cm)** – photo book, looking at a print in your hands, pixel peeping. Required pixels grow with print size.
- **Normal distance (≈ the image diagonal)** – you step back to see the whole picture. Required
  pixels are then nearly **independent of size** (≈ 3400 px along the diagonal, ≈ 6–8 MP at 3:2).
  This is the key lesson: a poster seen from across the room needs no more than an A4 in your hand.

Screens are viewed at normal distance and can't show more than their own pixels: requirement =
the screen's pixel count fitted to the photo's aspect ratio.

### Verdict levels (consistent with the existing "sharp" threshold)

- ✓ **perfectly sharp**: effective resolution meets the eye's limit.
- ~ **acceptable**: meets the classic CoC standard the graph uses (diagonal/1500) – the same standard as "sharp" in the graph, so the two never disagree.
- ✗ **soft**: below that.

### Noise

The noise verdict is defined for normal viewing size. Viewing larger than that (close-up prints)
enlarges grain: add 2·log2(enlargement relative to normal size) to the noise index. If noise is
"high" there, the target drops a level with the reason "körnig".

## Targets

Screens: phone, Full HD, 4K. Prints: 10×15, 13×18, A4, A3, 50×70 cm, 100×150 cm – each up close and
at normal distance (the large ones may only make sense at normal distance).

## Derived output

Per target: verdict and limiting reason (resolution or noise). Plus two summary values: largest
print that is ✓ up close, and the same at normal distance.

## UI

- First version: a section in the resolution bar's infobox – a compact table.
- Possibly later its own foldable box "Wie groß kann ich das zeigen?".
- One-line summary under the bar or in the caption: "Scharf bis A4 aus der Nähe".
