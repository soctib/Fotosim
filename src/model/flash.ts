// Guide-number model: full power gives correct exposure at GN · sqrt(ISO/100) / N.
// Light falls off with the inverse square of distance (2 stops per doubling).
// TTL: the camera throttles flash power so the focused subject is exposed correctly,
// down to a minimum power (FLASH_MIN_POWER_STOPS below full).

import { addLightStops } from './exposure';

export const FLASH_MIN_POWER_STOPS = 7; // ≈ 1/128 power

export function flashIdealDistanceM(guideNumber: number, aperture: number, iso: number): number {
  return (guideNumber * Math.sqrt(iso / 100)) / aperture;
}

/** Full-power flash-only exposure offset in stops for an object at `distanceM`. */
export function flashFullOffsetStops(
  guideNumber: number,
  aperture: number,
  iso: number,
  distanceM: number,
): number {
  return 2 * Math.log2(flashIdealDistanceM(guideNumber, aperture, iso) / distanceM);
}

/**
 * TTL power reduction (stops below full, 0…FLASH_MIN_POWER_STOPS) the camera picks so that
 * ambient + flash at the subject is as close to 0 as possible.
 */
export function ttlPowerReductionStops(ambientStops: number, flashFullStops: number): number {
  if (ambientStops >= 0) return FLASH_MIN_POWER_STOPS; // already bright enough
  // Needed flash-only level so that 2^amb + 2^flash = 1
  const needed = Math.log2(1 - 2 ** ambientStops);
  const reduction = flashFullStops - needed;
  return Math.min(FLASH_MIN_POWER_STOPS, Math.max(0, reduction));
}

/** Exposure of an object lit by ambient light plus flash at the given power reduction. */
export function litOffsetStops(
  ambientStops: number,
  flashFullStops: number,
  powerReductionStops: number,
): number {
  return addLightStops(ambientStops, flashFullStops - powerReductionStops);
}

/** Closer than tooCloseM the subject is over by at least this much even at minimum power. */
export const FLASH_TOO_CLOSE_STOPS = 1;

/** Distances are for ambient + flash together; boundaries the ambient light alone already clears are Infinity. */
export interface FlashZone {
  /** Closer than this: overexposed even at minimum power. */
  tooCloseM: number;
  /** Up to here full power is enough for correct exposure. */
  maxRangeM: number;
  /** Farther than this: ≥ 1 stop underexposed. */
  slightUnderM: number;
  /** Farther than this: ≥ 2 stops under, the flash barely matters. */
  strongUnderM: number;
}

/**
 * Where the flash helps, given the ambient exposure of the scene (stops). Null when the ambient
 * light alone is enough: TTL then cuts the flash to minimum power and it changes nothing.
 */
export function flashZone(
  guideNumber: number,
  aperture: number,
  iso: number,
  ambientStops: number,
): FlashZone | null {
  if (ambientStops >= 0) return null;
  const ideal = flashIdealDistanceM(guideNumber, aperture, iso);
  // Distance at which ambient + flash (at `powerReduction` below full) reaches `totalStops`.
  const distanceFor = (totalStops: number, powerReduction: number): number => {
    const flashLinear = 2 ** totalStops - 2 ** ambientStops;
    if (flashLinear <= 0) return Infinity; // ambient alone is already brighter than that
    const fullNeeded = Math.log2(flashLinear) + powerReduction;
    return ideal / 2 ** (fullNeeded / 2);
  };
  return {
    tooCloseM: distanceFor(FLASH_TOO_CLOSE_STOPS, FLASH_MIN_POWER_STOPS),
    maxRangeM: distanceFor(0, 0),
    slightUnderM: distanceFor(-1, 0),
    strongUnderM: distanceFor(-2, 0),
  };
}
