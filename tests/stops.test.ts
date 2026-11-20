import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { resolveMode } from '../src/model/modes';
import { APERTURES, ISOS, SHUTTER_SPEEDS_S, formatShutter } from '../src/model/stops';
import { initialState } from '../src/state/store';

const THIRD = Math.log2(2) / 3;

describe('stop lists', () => {
  it.each([
    ['shutter', SHUTTER_SPEEDS_S.map((s) => 1 / s)],
    ['iso', [...ISOS]],
    ['aperture', APERTURES.map((n) => n * n)],
  ])('%s steps are ⅓ stop apart (nominal values, ±0.15 stop)', (_name, values) => {
    for (let i = 1; i < values.length; i++) {
      expect(Math.abs(Math.log2(values[i] / values[i - 1]) - THIRD)).toBeLessThan(0.15);
    }
  });

  it('formats shutter speeds like a camera display', () => {
    expect(formatShutter(1 / 250)).toBe('1/250 s');
    expect(formatShutter(1 / 4)).toBe('1/4 s');
    expect(formatShutter(0.6)).toBe('0.6 s');
    expect(formatShutter(0.3)).toBe('0.3 s');
    expect(formatShutter(2.5)).toBe('2.5 s');
  });
});

describe('Av with ⅓-stop shutter and ISO', () => {
  it('meters within ±0.2 stops at every selectable aperture in daylight', () => {
    for (const aperture of APERTURES) {
      const camera = { ...initialState.camera, lensId: 'prime' as const, mode: 'Av' as const, aperture };
      const { settings: s } = resolveMode(camera, SENSORS.apsc, 13);
      const offset = 13 - (Math.log2((s.aperture * s.aperture) / s.shutterS) - Math.log2(s.iso / 100));
      expect(Math.abs(offset), `f/${aperture}`).toBeLessThan(0.2);
    }
  });
});
