import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { PERSON_HEIGHT_M, derive } from '../src/model/derive';
import { focalOptions } from '../src/model/focal';
import { cropFactor, relativeBlur } from '../src/model/optics';
import { initialState } from '../src/state/store';

describe('derive().blurAt', () => {
  const d = derive(initialState.camera, initialState.scene);
  const { focalLengthMm: f, aperture: N, focusDistanceM: s } = d.settings;

  it('matches relativeBlur for the resolved settings', () => {
    for (const x of [0.5, 2, 7, 100]) {
      expect(d.blurAt(x)).toBeCloseTo(relativeBlur(f, N, s, x, SENSORS.apsc), 10);
    }
  });

  it('is zero at the focus distance and agrees with the elements', () => {
    expect(d.blurAt(s)).toBeCloseTo(0, 10);
    for (const el of d.elements) expect(d.blurAt(el.distanceM)).toBeCloseTo(el.relativeBlur, 10);
  });

  it('crosses 1 at the depth-of-field limits', () => {
    expect(d.blurAt(d.dof.nearM)).toBeCloseTo(1, 2);
    if (Number.isFinite(d.dof.farM)) expect(d.blurAt(d.dof.farM)).toBeCloseTo(1, 2);
  });
});

describe('derive() layout and gear', () => {
  it('heightFractionPerM scales a person to frameHeightFraction', () => {
    const d = derive(initialState.camera, initialState.scene);
    const p1 = d.elements.find((e) => e.id === 'person1')!;
    expect(p1.heightFractionPerM * PERSON_HEIGHT_M).toBeCloseTo(p1.frameHeightFraction, 10);
    const bg = d.elements.find((e) => e.id === 'background')!;
    expect(bg.heightFractionPerM).toBeGreaterThan(0);
    expect(bg.heightFractionPerM).toBeLessThan(p1.heightFractionPerM);
  });

  it('suggests a fast 50 mm-class prime for f/1.8 at 50 mm, not the kit zoom', () => {
    const d = derive({ ...initialState.camera, sensorId: 'fullFrame', lensId: 'prime', focalLengthMm: 50, aperture: 1.8 }, initialState.scene);
    expect(d.gear.lensIds).toContain('nifty50');
    expect(d.gear.lensIds).not.toContain('kitZoom');
    expect(d.gear.phoneIds).toEqual([]);
  });

  it('matches lens classes by framing, so a normal lens is a normal lens on every sensor', () => {
    for (const sensorId of ['mft', 'apsc', 'mf67'] as const) {
      const crop = cropFactor(SENSORS[sensorId]);
      const d = derive({ ...initialState.camera, sensorId, lensId: 'prime', focalLengthMm: 50 / crop, aperture: 1.8 }, initialState.scene);
      expect(d.gear.lensIds, sensorId).toContain('nifty50');
      expect(d.gear.lensIds, sensorId).not.toContain('wideZoom');
      expect(d.gear.lensIds, sensorId).not.toContain('teleZoom28');
    }
  });

  it('lists phone classes with a native lens at the current framing', () => {
    const tele = focalOptions(SENSORS.iphone15ProMax)[2];
    const d = derive({ ...initialState.camera, sensorId: 'iphone15ProMax', focalLengthMm: tele.realMm }, initialState.scene);
    expect(d.equivalentFocalMm).toBeCloseTo(120, 6);
    expect(d.maxAperture).toBe(2.8); // the tele camera, not the main one
    expect(d.gear.phoneIds).toEqual(['currentZoom']);
    // Fairphone 5 main camera (25 mm): any current phone class has a native lens there.
    const fp = derive({ ...initialState.camera, sensorId: 'fairphone5', focalLengthMm: focalOptions(SENSORS.fairphone5)[1].realMm }, initialState.scene);
    expect(fp.maxAperture).toBe(1.9);
    expect(fp.gear.phoneIds).toEqual(['currentBasic', 'currentPro', 'currentZoom']);
    expect(d.gear.lensIds).toEqual([]);
  });
});

describe('derive().blurFractionAt', () => {
  it('agrees with the elements and is zero at the focus', () => {
    const d = derive(initialState.camera, initialState.scene);
    for (const el of d.elements) expect(d.blurFractionAt(el.distanceM)).toBeCloseTo(el.blurFractionOfWidth, 12);
    expect(d.blurFractionAt(d.settings.focusDistanceM)).toBeCloseTo(0, 12);
  });

  it('85 mm f/1.4 at 0.8 m: nose sharp, eyes 3 cm behind clearly blurred', () => {
    const cam = { ...initialState.camera, sensorId: 'fullFrame' as const, lensId: 'prime' as const, focalLengthMm: 85, aperture: 1.4, focusDistanceM: 0.77 };
    const d = derive(cam, initialState.scene);
    expect(d.blurAt(0.77)).toBeCloseTo(0, 10);
    expect(d.blurAt(0.8)).toBeGreaterThan(3); // eyes: several times the "sharp" limit
  });
});

describe('derive().autoIsoCapped', () => {
  const tv = { ...initialState.camera, mode: 'Tv' as const, shutterS: 1 / 60, autoIso: true };
  const scene = (lightPresetId: string) => ({ ...initialState.scene, lightPresetId });

  it('names the limit when auto ISO is maxed out and the subject is still too dark', () => {
    const d = derive(tv, scene('candle'));
    expect(d.settings.iso).toBe(3200);
    expect(d.exposureClass.endsWith('Under')).toBe(true);
    expect(d.autoIsoCapped).toBe(3200);
  });

  it('is null when the exposure works out, or the ISO is set by hand', () => {
    expect(derive(tv, scene('cloudy')).autoIsoCapped).toBeNull();
    expect(derive({ ...tv, autoIso: false, iso: 3200 }, scene('candle')).autoIsoCapped).toBeNull();
  });
});
