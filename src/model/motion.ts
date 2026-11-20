// Movement of the photographer and the persons. Two separate effects:
//  - shake: the photographer's body moving makes the camera wobble (see shake.ts), and
//  - movement blur: something crossing the frame during the exposure smears sideways.
// All movement is assumed sideways across the frame (the worst case), and photographer and
// persons move in the same direction: walking next to a walking person keeps them sharp, while
// the (static) background smears with the photographer's own speed.

import { circleOfConfusionMm } from './optics';
import type { Motion, Sensor } from './types';

export const MOTIONS: Motion[] = ['frozen', 'still', 'walk', 'run', 'drive'];

/** Travel speed in m/s. Driving: 50 km/h in town. */
export const MOTION_SPEED_MS: Record<Motion, number> = {
  frozen: 0,
  still: 0,
  walk: 1.4,
  run: 4,
  drive: 14,
};

/**
 * A person standing still still sways and breathes – a few cm/s in no fixed direction, so it
 * isn't cancelled by the photographer's movement. This is why portraits want ~1/60 s even on a tripod.
 */
export const STILL_SWAY_MS = 0.03;

/** Speed of a person relative to the photographer, across the frame, in m/s. */
export function relativeSpeedMs(subject: Motion, photographer: Motion): number {
  const sway = subject === 'still' ? STILL_SWAY_MS : 0;
  return Math.abs(MOTION_SPEED_MS[subject] - MOTION_SPEED_MS[photographer]) + sway;
}

/** Length of the smear on the sensor in mm: distance travelled during the exposure, times the magnification. */
export function movementBlurMm(speedMs: number, shutterS: number, focalMm: number, distanceM: number): number {
  const distanceMm = distanceM * 1000;
  return (speedMs * shutterS * 1000 * focalMm) / Math.max(distanceMm - focalMm, focalMm);
}

/** Smear relative to the circle of confusion: ≤ 1 counts as sharp, like the defocus blur. */
export function relativeMovementBlur(
  speedMs: number,
  shutterS: number,
  focalMm: number,
  distanceM: number,
  sensor: Sensor,
): number {
  return movementBlurMm(speedMs, shutterS, focalMm, distanceM) / circleOfConfusionMm(sensor);
}

/** Smear as a fraction of the image width (for rendering). */
export function movementBlurFractionOfWidth(
  speedMs: number,
  shutterS: number,
  focalMm: number,
  distanceM: number,
  sensor: Sensor,
): number {
  return movementBlurMm(speedMs, shutterS, focalMm, distanceM) / sensor.widthMm;
}

export type MovementClass = 'sharp' | 'slight' | 'visible' | 'strong';

/** Smear in multiples of the circle of confusion: ≤ 1 sharp, ≤ 2 slightly, ≤ 4 visibly, beyond that strongly smeared. */
export function classifyMovement(relativeBlur: number): MovementClass {
  if (relativeBlur <= 1) return 'sharp';
  if (relativeBlur <= 2) return 'slight';
  if (relativeBlur <= 4) return 'visible';
  return 'strong';
}
