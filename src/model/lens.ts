import { APERTURES } from './stops';
import type { CameraLens } from './types';

/** Widest aperture the lens offers at this equivalent focal length (exact, may be between list values). */
export function lensMaxApertureRaw(lens: CameraLens, equivalentFocalMm: number): number {
  const { wideEqMm: w, teleEqMm: t, maxApertureWide: a, maxApertureTele: b } = lens;
  if (equivalentFocalMm <= w) return a;
  if (equivalentFocalMm >= t) return b;
  const k = Math.log(equivalentFocalMm / w) / Math.log(t / w);
  return a * (b / a) ** k;
}

/** Widest selectable aperture: the raw value rounded to the next list value that isn't faster. */
export function lensMaxAperture(lens: CameraLens, equivalentFocalMm: number): number {
  const raw = lensMaxApertureRaw(lens, equivalentFocalMm);
  return APERTURES.find((n) => n >= raw * 0.98) ?? APERTURES[APERTURES.length - 1];
}
