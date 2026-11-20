/**
 * Gain of image stabilisation in stops you can rely on. Makers rate 4–5 stops (CIPA),
 * in practice 2–3 hold reliably.
 */
export const IS_STOPS = 2;

/**
 * Safety factor on the classic 1/(equivalent focal length) rule. That rule dates from small film
 * prints; today's high-resolution sensors show shake sooner, so twice as fast is the usual advice.
 */
export const HANDHELD_SAFETY = 2;

/** Slowest handheld shutter ≈ 1 / (2 · equivalent focal length). */
export function handheldLimitS(focalMm: number, crop: number): number {
  return 1 / (HANDHELD_SAFETY * focalMm * crop);
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
