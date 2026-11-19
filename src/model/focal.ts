import { EQUIVALENT_FOCAL_STEPS_MM, PHONE_LENSES_EQ_MM } from '../data/sensors';
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
  const crop = cropFactor(sensor);
  const steps = PHONE_LENSES_EQ_MM[sensor.id] ?? EQUIVALENT_FOCAL_STEPS_MM;
  return steps.map((eq) => ({ realMm: eq / crop, equivalentMm: eq }));
}

/** e.g. "50 mm (≙ 80 mm KB)" – just "50 mm" when crop ≈ 1. */
export function formatFocal(realMm: number, sensor: Sensor, kbLabel = 'KB'): string {
  const crop = cropFactor(sensor);
  const real = realMm < 10 ? realMm.toFixed(1) : Math.round(realMm).toString();
  if (Math.abs(crop - 1) < 0.05) return `${real} mm`;
  return `${real} mm (≙ ${Math.round(realMm * crop)} mm ${kbLabel})`;
}
