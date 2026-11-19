import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import { focalOptions, formatFocal } from '../src/model/focal';
import { resolveMode } from '../src/model/modes';
import { FLASH_SYNC_S } from '../src/model/stops';
import type { CameraSettings, Scene } from '../src/model/types';
import { initialState } from '../src/state/store';

// Fast lens so tests aren't limited by the aperture; lens limits are tested in lens.test.ts.
const base: CameraSettings = { ...initialState.camera, sensorId: 'fullFrame', lensId: 'prime', focalLengthMm: 50 };
const ff = SENSORS.fullFrame;

describe('modes', () => {
  it('Av keeps the aperture and picks a matching shutter (sun, f/8, ISO 100 → ~1/500)', () => {
    const r = resolveMode({ ...base, mode: 'Av', aperture: 8, iso: 100, autoIso: false }, ff, 15);
    expect(r.settings.aperture).toBe(8);
    expect(r.settings.shutterS).toBeCloseTo(1 / 500, 4);
    expect(r.autoFields.has('shutterS')).toBe(true);
    expect(r.autoFields.has('aperture')).toBe(false);
  });

  it('Tv keeps the shutter and picks an aperture', () => {
    const r = resolveMode({ ...base, mode: 'Tv', shutterS: 1 / 125, iso: 100, autoIso: false }, ff, 15);
    expect(r.settings.shutterS).toBeCloseTo(1 / 125, 6);
    expect(r.settings.aperture).toBe(16);
  });

  it('M changes nothing', () => {
    const s = { ...base, mode: 'M' as const, aperture: 2, shutterS: 1 / 4000, iso: 100 };
    const r = resolveMode(s, ff, 6);
    expect(r.settings).toEqual(s);
    expect(r.autoFields.size).toBe(0);
  });

  it('P with auto ISO raises ISO indoors instead of going below the handheld limit', () => {
    const r = resolveMode({ ...base, mode: 'P', autoIso: true, stabilized: false }, ff, 6);
    expect(r.settings.shutterS).toBeLessThanOrEqual(1 / 50 + 1e-9);
    expect(r.settings.iso).toBeGreaterThan(100);
  });

  it('auto mode fires the flash in a dark room and not in the sun', () => {
    expect(resolveMode({ ...base, lensId: 'kit', mode: 'auto' }, ff, 3).settings.flashOn).toBe(true);
    expect(resolveMode({ ...base, mode: 'auto', flashOn: true }, ff, 15).settings.flashOn).toBe(false);
  });

  it('manual flash is clamped to sync speed', () => {
    const r = resolveMode({ ...base, mode: 'M', flashOn: true, shutterS: 1 / 4000 }, ff, 10);
    expect(r.settings.shutterS).toBeCloseTo(FLASH_SYNC_S, 6);
  });

  it('film never changes the ISO by itself, not even in auto mode', () => {
    const film = SENSORS.film35;
    for (const mode of ['auto', 'P', 'Av', 'Tv'] as const) {
      const r = resolveMode({ ...base, sensorId: 'film35', mode, autoIso: true, iso: 400 }, film, 6);
      expect(r.settings.iso).toBe(400);
      expect(r.autoFields.has('iso')).toBe(false);
    }
    // Digital full frame of the same size does raise the ISO indoors.
    expect(resolveMode({ ...base, mode: 'Av', autoIso: true, iso: 100, aperture: 5.6 }, ff, 6).settings.iso).toBeGreaterThan(100);
  });

  it('phones keep their fixed aperture in every mode', () => {
    const phone = SENSORS.phone2019;
    for (const mode of ['auto', 'P', 'Av', 'Tv', 'M'] as const) {
      const r = resolveMode({ ...base, sensorId: 'phone2019', mode, aperture: 8 }, phone, 12);
      expect(r.settings.aperture).toBe(1.8);
      expect(r.autoFields.has('aperture')).toBe(false);
    }
  });
});

describe('derive', () => {
  const scene: Scene = initialState.scene;

  it('the focused person is sharp, the background is not (wide open)', () => {
    const d = derive({ ...base, mode: 'Av', aperture: 1.8, focusDistanceM: 3 }, scene);
    const p1 = d.elements.find((e) => e.id === 'person1')!;
    const bg = d.elements.find((e) => e.id === 'background')!;
    expect(p1.relativeBlur).toBeLessThan(0.01);
    expect(bg.relativeBlur).toBeGreaterThan(5);
  });

  it('with flash in candle light, near people are lit and the background stays darker', () => {
    const d = derive(
      { ...base, lensId: 'kit', mode: 'auto' },
      { ...scene, lightPresetId: 'candle' },
    );
    expect(d.settings.flashOn).toBe(true);
    const p1 = d.elements.find((e) => e.id === 'person1')!;
    const bg = d.elements.find((e) => e.id === 'background')!;
    expect(Math.abs(p1.exposureOffsetStops)).toBeLessThan(1);
    expect(bg.exposureOffsetStops).toBeLessThan(-1);
    expect(bg.exposureOffsetStops).toBeLessThan(p1.exposureOffsetStops - 1);
  });

  it('sensor size does not change the correct exposure, only noise', () => {
    const cam = { ...base, mode: 'M' as const, aperture: 2.8, shutterS: 1 / 125, iso: 400 };
    const a = derive({ ...cam, sensorId: 'fullFrame' }, scene);
    const b = derive({ ...cam, sensorId: 'mft' }, scene);
    expect(a.exposureOffsetStops).toBeCloseTo(b.exposureOffsetStops, 6);
    expect(b.noise.indexStops).toBeGreaterThan(a.noise.indexStops);
  });
});

describe('focal options', () => {
  it('shows real and equivalent focal length', () => {
    expect(formatFocal(50, ff)).toBe('50 mm');
    expect(formatFocal(50, SENSORS.apsc)).toMatch(/^50 mm \(≙ 7[67] mm KB\)$/);
  });
  it('phones mark native lenses vs digital crop', () => {
    const opts = focalOptions(SENSORS.phone2019);
    expect(opts.find((o) => o.equivalentMm === 26)?.native).toBe(true);
    expect(opts.find((o) => o.equivalentMm === 35)?.native).toBe(false);
  });
});
