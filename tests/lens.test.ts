import { describe, expect, it } from 'vitest';
import { CAMERA_LENSES } from '../src/data/cameraLenses';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import { lensMaxAperture, lensMaxApertureRaw } from '../src/model/lens';
import { resolveMode } from '../src/model/modes';
import { cropFactor } from '../src/model/optics';
import type { CameraSettings } from '../src/model/types';
import { initialState } from '../src/state/store';

const kit = CAMERA_LENSES.kit;
const ff: CameraSettings = { ...initialState.camera, sensorId: 'fullFrame', focalLengthMm: 50 };

describe('lens max aperture', () => {
  it('kit zoom goes from f/3.5 wide to f/5.6 long, log-interpolated', () => {
    expect(lensMaxApertureRaw(kit, 18)).toBe(3.5);
    expect(lensMaxApertureRaw(kit, 200)).toBe(5.6);
    const mid = lensMaxApertureRaw(kit, 50);
    expect(mid).toBeGreaterThan(3.5);
    expect(mid).toBeLessThan(5.6);
  });

  it('rounds to the next selectable aperture that is not faster', () => {
    expect(lensMaxAperture(kit, 24)).toBe(3.5);
    expect(lensMaxAperture(kit, 50)).toBe(4.5); // raw ≈ 4.4
    expect(lensMaxAperture(kit, 85)).toBe(5.6);
    expect(lensMaxAperture(CAMERA_LENSES.fastZoom, 50)).toBe(2.8);
    expect(lensMaxAperture(CAMERA_LENSES.prime, 50)).toBe(1.4);
  });
});

describe('modes respect the lens', () => {
  it('Av and M clamp a too-wide aperture to the lens limit', () => {
    for (const mode of ['Av', 'M'] as const) {
      const r = resolveMode({ ...ff, lensId: 'kit', mode, aperture: 1.4 }, SENSORS.fullFrame, 13);
      expect(r.settings.aperture).toBe(4.5); // raw ≈ 4.4 at 50 mm
    }
  });

  it('P never opens wider than the lens allows, even at night', () => {
    const r = resolveMode({ ...ff, lensId: 'kit', mode: 'P' }, SENSORS.fullFrame, 4);
    expect(r.settings.aperture).toBeGreaterThanOrEqual(4.5);
  });

  it('auto mode fires the flash in candle light with the kit zoom', () => {
    const r = resolveMode({ ...ff, lensId: 'kit', mode: 'auto' }, SENSORS.fullFrame, 3);
    expect(r.settings.flashOn).toBe(true);
  });

  it('phones ignore the lens setting', () => {
    const phone = SENSORS.phone2019;
    const d = derive({ ...ff, sensorId: 'phone2019', lensId: 'kit', focalLengthMm: 26 / cropFactor(phone) }, initialState.scene);
    expect(d.maxAperture).toBe(1.8);
    expect(d.settings.aperture).toBe(1.8);
  });

  it('derive exposes the limit for the UI', () => {
    expect(derive({ ...ff, lensId: 'fastZoom' }, initialState.scene).maxAperture).toBe(2.8);
  });
});
