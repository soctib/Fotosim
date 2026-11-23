# Livelier dolls

**Blocked by:** [figurine](figurine.md). **Works with:** –

Small touches that also teach something. No physics change; rendering only (`ui/sim/sim.ts`, graph
heads in `ui/graph/graph.ts`). Each item can be done on its own.

## 1. Smile when in focus

A person smiles only while in focus, otherwise a neutral mouth. Gives a playful "you got it" cue.
What "in focus" means is TBD (see open questions). Same in the graph's profile heads when they're
big enough.

## 2. Side view when moving

Persons that walk or run are drawn from the side, in a stride pose (walking: one leg forward;
running: longer stride, bent arms, leaning forward). Facing the direction of movement. Standing
persons stay front-on.

- Per-part blur changes: in profile, nose, eye and ear sit side by side at almost the same
  distance, so the depth-based part blur mostly disappears – the motion smear is what matters then.
- "Driving": TBD (see open questions).

## 3. Wave at the long lens (easter egg)

With a long lens (`equivalentFocalMm` ≥ ~200) and a person big enough to see
(`frameHeightFraction` ≥ ~0.3, from `derive()`), the person waves at you after ~10 s without
pointer movement. One raised arm swinging for a few seconds, then back to rest; any pointer move,
key or store change cancels it and restarts the timer.

- Only standing persons that are visible and roughly in focus (same test as the smile, so both
  cues agree); if several qualify, the biggest one waves.
- Rendering only: an idle timer in `ui/sim/sim.ts` plus an arm angle in the doll drawing. No
  infobox text, no hint – it's meant to be found. Respect `prefers-reduced-motion` (skip it).
- Quiet lesson: the long lens is what makes someone far away feel close enough to wave at.

## Open questions

- Smile cue: eyes inside the depth of field, or "is the current subject"?
- "Driving" persons: how to draw them – a car or bike outline, or simply the running pose?
