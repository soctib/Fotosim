/**
 * Exposure value of a camera setting, normalised to ISO 100.
 * Correct exposure when this equals the scene's EV100.
 */
export function settingsEv100(aperture: number, shutterS: number, iso: number): number {
  return Math.log2((aperture * aperture) / shutterS) - Math.log2(iso / 100);
}

/**
 * Exposure offset in stops: positive = overexposed, negative = underexposed.
 * Note: sensor size has no influence here – exposure is light per area.
 */
export function exposureOffsetStops(
  sceneEv100: number,
  aperture: number,
  shutterS: number,
  iso: number,
): number {
  return sceneEv100 - settingsEv100(aperture, shutterS, iso);
}

/** Combine two light contributions given as stop offsets (linear addition). */
export function addLightStops(a: number, b: number): number {
  return Math.log2(2 ** a + 2 ** b);
}

export type ExposureClass = 'strongUnder' | 'slightUnder' | 'ok' | 'slightOver' | 'strongOver';

/** UI markers: ±1 stop = slight, ±2 stops = strong. */
export const EXPOSURE_SLIGHT = 1;
export const EXPOSURE_STRONG = 2;

export function classifyExposure(offsetStops: number): ExposureClass {
  if (offsetStops <= -EXPOSURE_STRONG) return 'strongUnder';
  if (offsetStops <= -EXPOSURE_SLIGHT) return 'slightUnder';
  if (offsetStops >= EXPOSURE_STRONG) return 'strongOver';
  if (offsetStops >= EXPOSURE_SLIGHT) return 'slightOver';
  return 'ok';
}
