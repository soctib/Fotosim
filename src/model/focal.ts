import { EQUIVALENT_FOCAL_STEPS_MM, PHONE_LENSES_EQ_MM } from '../data/sensors';
import { cropFactor } from './optics';
import type { Sensor } from './types';

export interface FocalOption {
  realMm: number;
  equivalentMm: number;
  /** Phones: true if this is a physical lens, false if digital crop. */
  native: boolean;
}

/**
 * Slider steps for a sensor. Steps are common equivalent focal lengths;
 * the real focal length is derived from the crop factor and shown alongside.
 */
export function focalOptions(sensor: Sensor): FocalOption[] {
  const crop = cropFactor(sensor);
  const phoneLenses = PHONE_LENSES_EQ_MM[sensor.id];
  const steps = phoneLenses
    ? [...new Set([...phoneLenses, ...EQUIVALENT_FOCAL_STEPS_MM.filter((e) => e >= phoneLenses[0])])]
        .sort((a, b) => a - b)
        .filter((e) => e <= phoneLenses[phoneLenses.length - 1] * 4)
    : EQUIVALENT_FOCAL_STEPS_MM;
  return steps.map((eq) => ({
    realMm: eq / crop,
    equivalentMm: eq,
    native: phoneLenses ? phoneLenses.includes(eq) : true,
  }));
}

/** e.g. "50 mm (≙ 80 mm KB)" – just "50 mm" when crop ≈ 1. */
export function formatFocal(realMm: number, sensor: Sensor, kbLabel = 'KB'): string {
  const crop = cropFactor(sensor);
  const real = realMm < 10 ? realMm.toFixed(1) : Math.round(realMm).toString();
  if (Math.abs(crop - 1) < 0.05) return `${real} mm`;
  return `${real} mm (≙ ${Math.round(realMm * crop)} mm ${kbLabel})`;
}
