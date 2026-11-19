# CLAUDE.md

Photography learning simulator, built into a single HTML file. Read `SPEC.md` first.

## Conventions

- **Code, comments, commit messages: English.** **All on-screen text: German**, only in `src/data/texts.de.ts` – never hard-code UI strings. An English `texts.en.ts` will follow (`satisfies Texts`).
- README is German, SPEC/CLAUDE.md English.
- No UI framework. Vanilla TS, one store (`src/state/store.ts`), render functions per UI module.
- `src/model` stays pure (no DOM, no state) and every change there gets a Vitest test. Units: mm for focal length/sensor, m for distances, s for shutter.
- The UI reads **only** from `derive()`'s result – never recompute physics in UI code.
- Assets are SVG, imported with `?raw` so they get inlined. No external requests, no CDN fonts – the build must work offline as one file.
- Pointer Events for all interaction (mouse + touch). Test on a narrow viewport.

## Commands

- `npm run dev` – dev server
- `npm test` – unit tests
- `npm run typecheck`
- `npm run build` – `dist/index.html`
