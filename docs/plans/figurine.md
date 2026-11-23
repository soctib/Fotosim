# New figurine

**Blocked by:** nothing. **Works with:** doll-life (smile, side view and wave build on it).

## Goal

Replace the doll with a friendlier, more detailed figurine. Approved prototype:
https://claude.ai/artifact/RctcVX6H2yqo7fsNYG9DDH – source in `docs/prototypes/doll-redesign.html`.
No physics change; rendering only (`ui/sim/sim.ts`, graph heads in `ui/graph/graph.ts`).

## Design

- **Head:** the Personas outline (head, neck and ear bumps in one shape; 23 cm wide, eye line at
  −165 cm), face in a lighter skin tone than neck and ears, small fold inside each ear. Ears stay
  their own depth group (clipped off the outline).
- **Hair:** Personas shapes with pre-mixed highlight colours (blend modes do nothing inside a
  blurred group). Person 1 `shortCombover`, person 2 `bobCut` (others in the prototype gallery).
- **Colours:** Personas palette – person 1 skin `#e5a07e`, hair `#6c4545`; person 2 skin
  `#b16a5b`, hair `#362c47`. Shirts stay ours.
- **Kept from our doll:** the detailed eyes (now at ±4.8 cm) and the mouth.
- **Nose:** our triangle with a flat shadow on its left half; the whole nose fades from the tip up
  to the bridge (vertical opacity mask). Nostrils flat, tilted outward and clipped to the nose
  outline; freckles and tip highlight for close-ups. No shadow under the tip.
- **Body "C":** t-shirt with rounded shoulders (±19.6 cm) and a neckline showing the neck, short
  sleeves, bare forearms and hands, jeans with cuffs, sneakers with white soles.
- **Licence:** Personas by Draftbit is CC BY 4.0 – add a credit line ("based on Personas by
  Draftbit, modified") to the README and the about/infobox text.
