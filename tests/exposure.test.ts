import { describe, expect, it } from 'vitest';
import {
  addLightStops,
  classifyExposure,
  exposureOffsetStops,
  settingsEv100,
} from '../src/model/exposure';

describe('exposure', () => {
  it('sunny 16 rule is close to EV 15', () => {
    expect(settingsEv100(16, 1 / 100, 100)).toBeCloseTo(14.6, 1);
    expect(Math.abs(exposureOffsetStops(15, 16, 1 / 125, 100))).toBeLessThan(0.5);
  });
  it('one stop more ISO = one stop brighter', () => {
    const a = exposureOffsetStops(10, 4, 1 / 60, 400);
    const b = exposureOffsetStops(10, 4, 1 / 60, 800);
    expect(b - a).toBeCloseTo(1, 5);
  });
  it('classifies with ±1 / ±2 thresholds', () => {
    expect(classifyExposure(0.5)).toBe('ok');
    expect(classifyExposure(-1.2)).toBe('slightUnder');
    expect(classifyExposure(2.5)).toBe('strongOver');
  });
  it('classifies the value as displayed, so "−1,0" is never "ok"', () => {
    expect(classifyExposure(-0.96)).toBe('slightUnder'); // shows as −1,0
    expect(classifyExposure(-0.94)).toBe('ok'); // shows as −0,9
    expect(classifyExposure(1.96)).toBe('strongOver'); // shows as +2,0
  });
  it('adds light linearly', () => {
    expect(addLightStops(0, 0)).toBeCloseTo(1, 5);
    expect(addLightStops(-10, 0)).toBeCloseTo(0, 2);
  });
});
