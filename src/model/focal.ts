import { EQUIVALENT_FOCAL_STEPS_MM } from '../data/sensors';
import { cropFactor } from './optics';
import type { Sensor } from './types';

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

/**
 * The sensor actually in use. Cameras: the sensor itself. Phones: the built-in camera whose real
 * focal length is closest – its sensor size and fixed aperture replace the main camera's.
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
  return { ...sensor, widthMm: c.widthMm, heightMm: c.heightMm, fixedAperture: c.aperture };
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
