// How big can the photo be shown? Screens and prints, judged by the eye's resolution.
//
// The eye resolves about one arcminute. Seen from distance D, an image of diagonal G then needs about
// G / (D · tan 1′) pixels of real detail along its diagonal. Two ways to look at a print:
//  - up close (30 cm): photo book, a print in your hands – the requirement grows with the size;
//  - at normal distance (≈ the diagonal, to take in the whole picture): ≈ 3400 px whatever the size.
// Screens are seen at normal distance and can't show more than their own pixels.
//
// Verdicts: "sharp" meets the eye's limit; "ok" meets the classic circle-of-confusion standard
// (diagonal/1500, the graph's "sharp") scaled the same way; below that "soft". Noise is judged at
// normal viewing size; looking closer enlarges it, and a noisy result drops a level ("grainy").

import { classifyNoise } from './noise';

/** One arcminute in radians. */
export const EYE_RESOLUTION_RAD = Math.PI / (180 * 60);
/** Close viewing distance (mm). */
export const CLOSE_VIEW_MM = 300;
/** The circle-of-confusion standard: 1500 blur discs across the diagonal at normal viewing distance. */
export const COC_STANDARD_PX = 1500;

export type OutputTargetId = 'phone' | 'fullHd' | 'uhd' | 'p10x15' | 'p13x18' | 'a4' | 'a3' | 'p50x70' | 'p100x150';
export type OutputView = 'close' | 'normal';
export type OutputVerdict = 'sharp' | 'ok' | 'soft';

interface ScreenTarget {
  id: OutputTargetId;
  kind: 'screen';
  /** Landscape pixels. */
  px: [number, number];
}
interface PrintTarget {
  id: OutputTargetId;
  kind: 'print';
  /** Long × short side (mm). */
  mm: [number, number];
}
export type OutputTarget = ScreenTarget | PrintTarget;

export const OUTPUT_TARGETS: OutputTarget[] = [
  { id: 'phone', kind: 'screen', px: [2532, 1170] },
  { id: 'fullHd', kind: 'screen', px: [1920, 1080] },
  { id: 'uhd', kind: 'screen', px: [3840, 2160] },
  { id: 'p10x15', kind: 'print', mm: [150, 100] },
  { id: 'p13x18', kind: 'print', mm: [180, 130] },
  { id: 'a4', kind: 'print', mm: [297, 210] },
  { id: 'a3', kind: 'print', mm: [420, 297] },
  { id: 'p50x70', kind: 'print', mm: [700, 500] },
  { id: 'p100x150', kind: 'print', mm: [1500, 1000] },
];

export interface OutputResult {
  id: OutputTargetId;
  view: OutputView;
  verdict: OutputVerdict;
  /** What pulled the verdict down; null when sharp. */
  reason: 'resolution' | 'noise' | null;
  /** Effective megapixels needed to look sharp here (noise aside). */
  sharpMp: number;
}

export interface OutputSize {
  results: OutputResult[];
  /** Largest print that is sharp up close, else the largest that's ok, else null. */
  close: { id: OutputTargetId; verdict: OutputVerdict } | null;
  /** The verdict at normal distance (the same for every print size, see above) – the largest print's. */
  normal: OutputResult;
}

/** Effective pixels along the diagonal of a photo with this many effective MP and aspect ratio (width/height). */
export function diagonalPixels(effectiveMp: number, aspect: number): number {
  return Math.sqrt(effectiveMp * 1e6 * (aspect + 1 / aspect));
}

/** Pixels along the diagonal the eye can tell apart on an image of this diagonal seen from this distance. */
export function eyeLimitPixels(diagonalMm: number, viewMm: number): number {
  return diagonalMm / (viewMm * Math.tan(EYE_RESOLUTION_RAD));
}

/** Inverse of diagonalPixels(). */
export function megapixelsForDiagonal(diagonalPx: number, aspect: number): number {
  return diagonalPx ** 2 / (aspect + 1 / aspect) / 1e6;
}

const LEVELS: OutputVerdict[] = ['sharp', 'ok', 'soft'];

function judge(have: number, sharpPx: number, okPx: number, noiseStops: number): Pick<OutputResult, 'verdict' | 'reason'> {
  let level = have >= sharpPx ? 0 : have >= okPx ? 1 : 2;
  let reason: OutputResult['reason'] = level > 0 ? 'resolution' : null;
  const noise = classifyNoise(noiseStops);
  if ((noise === 'high' || noise === 'veryHigh') && level < 2) {
    level++;
    reason = 'noise';
  }
  return { verdict: LEVELS[level], reason };
}

/**
 * Verdict per screen and print size. `noiseIndexStops` is the noise index at normal viewing size
 * (see noise.ts); viewing an image larger than that adds 2·log2(enlargement).
 */
export function outputSize(effectiveMp: number, aspect: number, noiseIndexStops: number): OutputSize {
  const have = diagonalPixels(effectiveMp, aspect);
  const results: OutputResult[] = [];
  for (const target of OUTPUT_TARGETS) {
    if (target.kind === 'screen') {
      // The photo fitted into the screen.
      const [sw, sh] = target.px;
      const w = Math.min(sw, sh * aspect);
      const screenPx = Math.hypot(w, w / aspect);
      const sharpPx = Math.min(screenPx, eyeLimitPixels(1, 1));
      results.push({
        id: target.id,
        view: 'normal',
        sharpMp: megapixelsForDiagonal(sharpPx, aspect),
        ...judge(have, sharpPx, Math.min(screenPx, COC_STANDARD_PX), noiseIndexStops),
      });
      continue;
    }
    const diagonal = Math.hypot(...target.mm);
    for (const view of ['close', 'normal'] as const) {
      const viewMm = view === 'close' ? CLOSE_VIEW_MM : diagonal;
      // Relative to normal viewing (distance = diagonal): > 1 means enlarged, which shows more noise.
      const enlargement = diagonal / viewMm;
      const noise = noiseIndexStops + 2 * Math.log2(Math.max(1, enlargement));
      const sharpPx = eyeLimitPixels(diagonal, viewMm);
      results.push({
        id: target.id,
        view,
        sharpMp: megapixelsForDiagonal(sharpPx, aspect),
        ...judge(have, sharpPx, COC_STANDARD_PX * enlargement, noise),
      });
    }
  }
  const closePrints = results.filter((r) => r.view === 'close');
  const largest = (v: OutputVerdict) => closePrints.filter((r) => r.verdict === v).pop();
  const best = largest('sharp') ?? largest('ok');
  return {
    results,
    close: best ? { id: best.id, verdict: best.verdict } : null,
    normal: results.filter((r) => r.view === 'normal').pop()!,
  };
}
