import { EQUIVALENT_FOCAL_STEPS_MM } from '../data/sensors';
import { cropFactor } from './optics';
import type { CameraLens, Sensor } from './types';

export interface FocalOption {
  realMm: number;
  equivalentMm: number;
}

/**
 * Slider steps for a sensor. Cameras: common equivalent focal lengths, with the real focal
 * length derived from the crop factor. Phones: only their built-in cameras – no digital zoom.
 */
export function focalOptions(sensor: Sensor): FocalOption[] {
  if (sensor.phoneCameras) {
    // Each phone camera has its own sensor, so its own crop factor.
    return sensor.phoneCameras.map((c) => ({
      realMm: c.equivalentMm / cropFactor({ ...sensor, ...c }),
      equivalentMm: c.equivalentMm,
    }));
  }
  const crop = cropFactor(sensor);
  return EQUIVALENT_FOCAL_STEPS_MM.map((eq) => ({ realMm: eq / crop, equivalentMm: eq }));
}

/** Whether the focal length slider is continuous: a zoom on a camera (phones have fixed cameras). */
export function isContinuousFocal(sensor: Sensor, lens: CameraLens): boolean {
  return lens.zoom && !sensor.phoneCameras;
}

/**
 * Real focal length closest to an equivalent one that the setup allows: zooms clamp to the
 * step range, primes and phones snap to the nearest step (compared on a log scale).
 */
export function snapFocal(sensor: Sensor, lens: CameraLens, equivalentMm: number): number {
  const opts = focalOptions(sensor);
  if (isContinuousFocal(sensor, lens)) {
    const eq = Math.min(opts[opts.length - 1].equivalentMm, Math.max(opts[0].equivalentMm, equivalentMm));
    return eq / cropFactor(sensor);
  }
  return opts.reduce((a, b) =>
    Math.abs(Math.log(b.equivalentMm / equivalentMm)) < Math.abs(Math.log(a.equivalentMm / equivalentMm)) ? b : a,
  ).realMm;
}

/** Continuous slider: position 0…1 maps log-linearly onto the equivalent step range. */
export function zoomPositionToEquivalent(pos: number): number {
  const lo = EQUIVALENT_FOCAL_STEPS_MM[0];
  const hi = EQUIVALENT_FOCAL_STEPS_MM[EQUIVALENT_FOCAL_STEPS_MM.length - 1];
  return lo * Math.pow(hi / lo, Math.min(1, Math.max(0, pos)));
}

export function equivalentToZoomPosition(equivalentMm: number): number {
  const lo = EQUIVALENT_FOCAL_STEPS_MM[0];
  const hi = EQUIVALENT_FOCAL_STEPS_MM[EQUIVALENT_FOCAL_STEPS_MM.length - 1];
  return Math.min(1, Math.max(0, Math.log(equivalentMm / lo) / Math.log(hi / lo)));
}

/**
 * The sensor actually in use. Cameras: the sensor itself. Phones: the built-in camera whose real
 * focal length is closest – its sensor size, fixed aperture, pixel count and lens replace the main camera's.
 */
export function activeSensor(sensor: Sensor, focalLengthMm: number): Sensor {
  const cams = sensor.phoneCameras;
  if (!cams) return sensor;
  const opts = focalOptions(sensor);
  let best = 0;
  opts.forEach((o, i) => {
    if (Math.abs(Math.log(o.realMm / focalLengthMm)) < Math.abs(Math.log(opts[best].realMm / focalLengthMm))) best = i;
  });
  const c = cams[best];
  return {
    ...sensor,
    widthMm: c.widthMm,
    heightMm: c.heightMm,
    fixedAperture: c.aperture,
    megapixels: c.outputMegapixels,
    lensBlurUm: c.lensBlurUm,
    dynamicRangeStops: c.dynamicRangeStops,
  };
}

/** e.g. "50 mm (≙ 80 mm KB)" – just "50 mm" when crop ≈ 1. Sub-10 mm lengths get a decimal in the locale's format. */
export function formatFocal(realMm: number, sensor: Sensor, kbLabel = 'KB', locale?: string): string {
  const crop = cropFactor(sensor);
  const real =
    realMm < 10
      ? locale
        ? realMm.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : realMm.toFixed(1)
      : Math.round(realMm).toString();
  if (Math.abs(crop - 1) < 0.05) return `${real} mm`;
  return `${real} mm (≙ ${Math.round(realMm * crop)} mm ${kbLabel})`;
}
