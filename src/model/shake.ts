import type { Motion } from './types';

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

/**
 * How many stops faster than the standing handheld limit the shutter must be while the
 * photographer moves (rough field experience). Tripod: no shake at all. In a car it's the
 * engine and the road, roughly like walking.
 */
export const MOTION_SHAKE_STOPS: Record<Exclude<Motion, 'frozen'>, number> = {
  still: 0,
  walk: 2,
  run: 4,
  drive: 2,
};

/** Handheld limit for a moving photographer (Infinity on a tripod). */
export function motionHandheldLimitS(limitS: number, motion: Motion): number {
  return motion === 'frozen' ? Infinity : limitS / 2 ** MOTION_SHAKE_STOPS[motion];
}

export type ShakeClass = 'safe' | 'needsIS' | 'needsTripod';

export function classifyShake(
  shutterS: number,
  focalMm: number,
  crop: number,
  stabilized: boolean,
  motion: Motion = 'still',
): ShakeClass {
  if (shutterS <= motionHandheldLimitS(handheldLimitS(focalMm, crop), motion)) return 'safe';
  if (stabilized && shutterS <= motionHandheldLimitS(handheldLimitWithIsS(focalMm, crop), motion)) return 'needsIS';
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
  motion: Motion = 'still',
): number {
  const limit = stabilized ? handheldLimitWithIsS(focalMm, crop) : handheldLimitS(focalMm, crop);
  return shutterS / motionHandheldLimitS(limit, motion);
}
