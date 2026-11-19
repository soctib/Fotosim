import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import { relativeBlur } from '../src/model/optics';
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
