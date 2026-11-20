import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import {
  FLASH_MIN_POWER_STOPS,
  FLASH_TOO_CLOSE_STOPS,
  flashFullOffsetStops,
  flashIdealDistanceM,
  flashZone,
  litOffsetStops,
  ttlPowerReductionStops,
} from '../src/model/flash';
import { resolveMode } from '../src/model/modes';
import { FLASH_SYNC_S } from '../src/model/stops';
import type { CameraSettings } from '../src/model/types';
import { initialState } from '../src/state/store';

describe('flash', () => {
  it('guide number 12 at f/4 ISO 100 reaches 3 m', () => {
    expect(flashIdealDistanceM(12, 4, 100)).toBeCloseTo(3, 5);
    expect(flashIdealDistanceM(12, 4, 400)).toBeCloseTo(6, 5);
  });
  it('loses 2 stops per doubled distance', () => {
    expect(flashFullOffsetStops(12, 4, 100, 6)).toBeCloseTo(-2, 5);
  });
  it('TTL exposes the subject correctly within range', () => {
    const ambient = -4;
    const full = flashFullOffsetStops(12, 4, 100, 1.5); // +2 at full power
    const red = ttlPowerReductionStops(ambient, full);
    expect(litOffsetStops(ambient, full, red)).toBeCloseTo(0, 5);
  });
  it('TTL cannot help beyond range, and is capped at minimum power', () => {
    expect(ttlPowerReductionStops(-4, -3)).toBe(0);
    expect(ttlPowerReductionStops(-4, 20)).toBe(FLASH_MIN_POWER_STOPS);
  });
});

describe('flash zone', () => {
  it('is ordered and, in the dark, follows the pure guide-number model', () => {
    const z = flashZone(12, 2.8, 400, -20)!;
    const ideal = flashIdealDistanceM(12, 2.8, 400);
    expect(z.tooCloseM).toBeLessThan(z.maxRangeM);
    expect(z.maxRangeM).toBeLessThan(z.slightUnderM);
    expect(z.slightUnderM).toBeLessThan(z.strongUnderM);
    expect(z.maxRangeM).toBeCloseTo(ideal, 3);
    expect(z.slightUnderM).toBeCloseTo(ideal * Math.SQRT2, 3);
    expect(z.strongUnderM).toBeCloseTo(ideal * 2, 3);
    // Too close: +1 stop even at minimum power → 7 + 1 stops closer = 4 halvings.
    expect(z.tooCloseM).toBeCloseTo(ideal / 2 ** ((FLASH_MIN_POWER_STOPS + FLASH_TOO_CLOSE_STOPS) / 2), 3);
  });

  it('is gone when the ambient light alone is enough', () => {
    expect(flashZone(12, 8, 100, 0)).toBeNull();
    expect(flashZone(12, 8, 100, 1.5)).toBeNull();
  });

  it('ambient light extends the range and removes limits it already clears', () => {
    const dark = flashZone(12, 4, 100, -10)!;
    const dim = flashZone(12, 4, 100, -1.5)!; // 1.5 stops under without flash
    expect(dim.maxRangeM).toBeGreaterThan(dark.maxRangeM);
    expect(dim.slightUnderM).toBeGreaterThan(dark.slightUnderM);
    expect(dim.strongUnderM).toBe(Infinity); // never 2 stops under with ambient at −1.5
    const almost = flashZone(12, 4, 100, -0.5)!;
    expect(almost.slightUnderM).toBe(Infinity);
    expect(Number.isFinite(almost.tooCloseM)).toBe(true);
    expect(Number.isFinite(almost.maxRangeM)).toBe(true);
  });

  it('derive hides the zone in sunlight even with the flash forced on', () => {
    const cam: CameraSettings = { ...initialState.camera, mode: 'M', flashOn: true, aperture: 8, shutterS: 1 / 250, iso: 100 };
    const sun = derive(cam, { ...initialState.scene, lightPresetId: 'sun' });
    expect(sun.flash).not.toBeNull();
    expect(sun.flash!.zone).toBeNull();
    const room = derive(cam, { ...initialState.scene, lightPresetId: 'livingRoom' });
    expect(room.flash!.zone).not.toBeNull();
  });
});

describe('phone LED "flash"', () => {
  const phone: CameraSettings = { ...initialState.camera, sensorId: 'iphoneXR', focalLengthMm: 4.2, mode: 'P', flashOn: true };

  it('has no sync speed: in sun the phone still uses its fast electronic shutter', () => {
    const r = resolveMode(phone, SENSORS.iphoneXR, 15);
    expect(r.settings.flashOn).toBe(true);
    expect(r.settings.shutterS).toBeLessThan(FLASH_SYNC_S);
    const d = derive(phone, { ...initialState.scene, lightPresetId: 'sun' });
    expect(Math.abs(d.exposureOffsetStops)).toBeLessThan(0.5);
  });

  it('a camera flash does cap the shutter at the sync speed', () => {
    const r = resolveMode({ ...initialState.camera, mode: 'M', flashOn: true, shutterS: 1 / 4000 }, SENSORS.apsc, 10);
    expect(r.settings.shutterS).toBeCloseTo(FLASH_SYNC_S, 6);
    const p = resolveMode({ ...phone, mode: 'M', shutterS: 1 / 4000 }, SENSORS.iphoneXR, 10);
    expect(p.settings.shutterS).toBeCloseTo(1 / 4000, 8);
  });
});
