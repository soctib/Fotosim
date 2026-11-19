import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { PERSON_HEIGHT_M, derive } from '../src/model/derive';
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

  it('lists phone classes with a native lens at the current framing', () => {
    const crop = cropFactor(SENSORS.phoneModern);
    const d = derive({ ...initialState.camera, sensorId: 'phoneModern', focalLengthMm: 77 / crop }, initialState.scene);
    expect(d.gear.phoneIds).toEqual(['currentPro']);
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
