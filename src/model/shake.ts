/** Typical gain of image stabilisation in stops. */
export const IS_STOPS = 3;

/** Rule of thumb: slowest handheld shutter ≈ 1 / (equivalent focal length). */
export function handheldLimitS(focalMm: number, crop: number): number {
  return 1 / (focalMm * crop);
}

export function handheldLimitWithIsS(focalMm: number, crop: number, isStops = IS_STOPS): number {
  return handheldLimitS(focalMm, crop) * 2 ** isStops;
}

export type ShakeClass = 'safe' | 'needsIS' | 'needsTripod';

export function classifyShake(
  shutterS: number,
  focalMm: number,
  crop: number,
  stabilized: boolean,
): ShakeClass {
  if (shutterS <= handheldLimitS(focalMm, crop)) return 'safe';
  if (stabilized && shutterS <= handheldLimitWithIsS(focalMm, crop)) return 'needsIS';
  return 'needsTripod';
}

/**
 * Relative shake blur: ≤ 1 is fine, 2 ≈ visibly soft, grows linearly with time.
 * Used to drive a directional blur in the simulation.
 */
export function shakeBlurFactor(
  shutterS: number,
  focalMm: number,
  crop: number,
  stabilized: boolean,
): number {
  const limit = stabilized ? handheldLimitWithIsS(focalMm, crop) : handheldLimitS(focalMm, crop);
  return shutterS / limit;
}
