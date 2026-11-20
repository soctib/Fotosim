import type { Sensor } from './types';

/** Diagonal of the 36×24 mm full-frame format. */
export const FULL_FRAME_DIAGONAL_MM = Math.hypot(36, 24);

/** Distance range the simulator deals with (metres). The lower end moves up with the focal length, see minDistanceM(). */
export const MIN_DISTANCE_M = 0.3;
export const MAX_DISTANCE_M = 1000;
/** Rule of thumb for a lens's near limit: about 8× its focal length (50 mm → 0.4 m, 400 mm → 3.2 m). */
export const MIN_FOCUS_FOCAL_FACTOR = 8;

/**
 * Closest distance for focus and elements with this lens. Real lenses can't focus closer than
 * a few times their focal length, and the thin-lens formulas below only hold for distances
 * well beyond f – at d ≤ f there is no real image at all.
 */
export function minDistanceM(focalMm: number): number {
  return Math.max(MIN_DISTANCE_M, (MIN_FOCUS_FOCAL_FACTOR * focalMm) / 1000);
}

/** Digital zoom goes up to 20× (phones offer up to 25×) – far enough for the pixels to show. */
export const MAX_DIGITAL_ZOOM = 20;

/**
 * Cropping by z and showing the crop at the same size is the same as a sensor z times smaller (with
 * the same pixels): crop factor × z, circle of confusion ÷ z, angle of view and framing narrower.
 */
export function croppedSensor<S extends Sensor>(sensor: S, zoom: number): S {
  if (zoom === 1) return sensor;
  return { ...sensor, widthMm: sensor.widthMm / zoom, heightMm: sensor.heightMm / zoom };
}

export function sensorDiagonalMm(sensor: Sensor): number {
  return Math.hypot(sensor.widthMm, sensor.heightMm);
}

export function cropFactor(sensor: Sensor): number {
  return FULL_FRAME_DIAGONAL_MM / sensorDiagonalMm(sensor);
}

/** Acceptable circle of confusion (classic d/1500 rule, ≈0.029 mm for full frame). */
export function circleOfConfusionMm(sensor: Sensor): number {
  return sensorDiagonalMm(sensor) / 1500;
}

export function equivalentFocalLengthMm(focalMm: number, sensor: Sensor): number {
  return focalMm * cropFactor(sensor);
}

/** Aperture giving the same depth of field (and total light) on full frame. */
export function equivalentAperture(aperture: number, sensor: Sensor): number {
  return aperture * cropFactor(sensor);
}

/**
 * Diameter of the blur disc on the sensor (mm) for an object at `objectM`
 * when focused at `focusM`. `objectM = Infinity` is allowed.
 */
export function blurDiscMm(
  focalMm: number,
  aperture: number,
  focusM: number,
  objectM: number,
): number {
  const f = focalMm;
  const s = Math.max(focusM * 1000, f * 1.001);
  const d = objectM * 1000;
  const k = (f * f) / (aperture * (s - f));
  if (!Number.isFinite(d)) return k;
  if (d <= f) return Infinity;
  return (k * Math.abs(d - s)) / d;
}

/** Blur relative to the circle of confusion: ≤ 1 means "acceptably sharp". */
export function relativeBlur(
  focalMm: number,
  aperture: number,
  focusM: number,
  objectM: number,
  sensor: Sensor,
): number {
  return blurDiscMm(focalMm, aperture, focusM, objectM) / circleOfConfusionMm(sensor);
}

/** Blur as a fraction of the image width – sensor independent, used for rendering. */
export function blurFractionOfWidth(
  focalMm: number,
  aperture: number,
  focusM: number,
  objectM: number,
  sensor: Sensor,
): number {
  return blurDiscMm(focalMm, aperture, focusM, objectM) / sensor.widthMm;
}

export function hyperfocalDistanceM(focalMm: number, aperture: number, sensor: Sensor): number {
  const c = circleOfConfusionMm(sensor);
  return ((focalMm * focalMm) / (aperture * c) + focalMm) / 1000;
}

export interface DepthOfField {
  nearM: number;
  farM: number; // may be Infinity
  totalM: number;
}

export function depthOfField(
  focalMm: number,
  aperture: number,
  focusM: number,
  sensor: Sensor,
): DepthOfField {
  const H = hyperfocalDistanceM(focalMm, aperture, sensor);
  const f = focalMm / 1000;
  const s = focusM;
  const nearM = (s * (H - f)) / (H + s - 2 * f);
  const farM = s < H ? (s * (H - f)) / (H - s) : Infinity;
  return { nearM, farM, totalM: farM - nearM };
}

/** Horizontal angle of view in degrees. */
export function horizontalAngleOfViewDeg(focalMm: number, sensor: Sensor): number {
  return (2 * Math.atan(sensor.widthMm / (2 * focalMm)) * 180) / Math.PI;
}

/** Fraction of the image height covered by an object of `objectHeightM` at `distanceM`. */
export function frameHeightFraction(
  focalMm: number,
  objectHeightM: number,
  distanceM: number,
  sensor: Sensor,
): number {
  const f = focalMm / 1000;
  if (distanceM <= f) return Infinity;
  const imageHeightMm = ((objectHeightM * f) / (distanceM - f)) * 1000;
  return imageHeightMm / sensor.heightMm;
}
