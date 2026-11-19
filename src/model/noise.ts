/**
 * Noise index in stops relative to ISO 100 on full frame.
 * Smaller sensors collect less total light: crop² ≙ the same factor in ISO.
 * Underexposure that is brightened later adds noise as well.
 */
export function noiseIndexStops(iso: number, crop: number, exposureOffsetStops = 0): number {
  const underexposure = Math.max(0, -exposureOffsetStops);
  return Math.log2(iso / 100) + 2 * Math.log2(crop) + underexposure;
}

/** "Full-frame equivalent ISO" – a more intuitive way to show the same thing. */
export function equivalentIso(iso: number, crop: number): number {
  return iso * crop * crop;
}

export type NoiseClass = 'low' | 'medium' | 'high' | 'veryHigh';

export function classifyNoise(indexStops: number): NoiseClass {
  if (indexStops < 3) return 'low'; // < ISO 800 on full frame
  if (indexStops < 5) return 'medium'; // < ISO 3200
  if (indexStops < 7) return 'high'; // < ISO 12800
  return 'veryHigh';
}

/** 0…1 for rendering (noise overlay opacity, bar height). */
export function noiseAmount(indexStops: number): number {
  return Math.min(1, Math.max(0, indexStops / 9));
}
