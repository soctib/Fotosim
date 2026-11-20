/**
 * Noise index in stops relative to ISO 100 on full frame.
 * Smaller sensors collect less total light: crop² ≙ the same factor in ISO.
 * Underexposure that is brightened later adds noise as well. Phones merge several frames, which
 * takes `multiFrameStops` off again.
 */
export function noiseIndexStops(iso: number, crop: number, exposureOffsetStops = 0, multiFrameStops = 0): number {
  const underexposure = Math.max(0, -exposureOffsetStops);
  return Math.log2(iso / 100) + 2 * Math.log2(crop) + underexposure - multiFrameStops;
}

/** "Full-frame equivalent ISO" – a more intuitive way to show the same thing (multi-frame merging included). */
export function equivalentIso(iso: number, crop: number, multiFrameStops = 0): number {
  return (iso * crop * crop) / 2 ** multiFrameStops;
}

export type NoiseClass = 'low' | 'medium' | 'high' | 'veryHigh';

/**
 * Verdict at normal viewing size (screen, small print), not pixel peeping: a current full-frame
 * camera at ISO 1600 is still clean, a 2019 phone at ISO 100 (≈ ISO 3800 equivalent) shows
 * some grain, ISO 6400 on full frame is clearly noisy.
 */
export function classifyNoise(indexStops: number): NoiseClass {
  if (indexStops < 4) return 'low'; // < ISO 1600 on full frame
  if (indexStops < 6) return 'medium'; // < ISO 6400
  if (indexStops < 8) return 'high'; // < ISO 25600
  return 'veryHigh';
}

/** Below this index (≈ ISO 400 on full frame) nothing is visible at normal viewing size. */
export const NOISE_VISIBLE_STOPS = 2;

/** 0…1 for rendering (noise overlay opacity, bar height): invisible up to NOISE_VISIBLE_STOPS, full at 8 stops above. */
export function noiseAmount(indexStops: number): number {
  return Math.min(1, Math.max(0, (indexStops - NOISE_VISIBLE_STOPS) / 8));
}
