import { describe, expect, it } from 'vitest';
import {
  addLightStops,
  classifyExposure,
  exposureOffsetStops,
  settingsEv100,
} from '../src/model/exposure';
import {
  FLASH_MIN_POWER_STOPS,
  flashFullOffsetStops,
  flashIdealDistanceM,
  flashZone,
  litOffsetStops,
  ttlPowerReductionStops,
} from '../src/model/flash';
import { classifyNoise, equivalentIso, noiseIndexStops } from '../src/model/noise';
import { classifyShake, handheldLimitS, handheldLimitWithIsS } from '../src/model/shake';

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
  it('adds light linearly', () => {
    expect(addLightStops(0, 0)).toBeCloseTo(1, 5);
    expect(addLightStops(-10, 0)).toBeCloseTo(0, 2);
  });
});

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
  it('zone is ordered', () => {
    const z = flashZone(12, 2.8, 400);
    expect(z.tooCloseM).toBeLessThan(z.maxRangeM);
    expect(z.maxRangeM).toBeLessThan(z.slightUnderM);
    expect(z.slightUnderM).toBeLessThan(z.strongUnderM);
  });
});

describe('noise', () => {
  it('a phone at ISO 100 is noisier than full frame at ISO 800', () => {
    expect(noiseIndexStops(100, 6.2)).toBeGreaterThan(noiseIndexStops(800, 1));
    expect(equivalentIso(100, 2)).toBe(400);
  });
  it('classifies', () => {
    expect(classifyNoise(noiseIndexStops(100, 1))).toBe('low');
    expect(classifyNoise(noiseIndexStops(12800, 1.5))).toBe('veryHigh');
  });
});

describe('shake', () => {
  it('handheld limit follows 1/(f·crop), IS adds stops', () => {
    expect(handheldLimitS(50, 1.5)).toBeCloseTo(1 / 75, 6);
    expect(handheldLimitWithIsS(50, 1, 3)).toBeCloseTo(8 / 50, 6);
    expect(classifyShake(1 / 30, 50, 1, false)).toBe('needsTripod');
    expect(classifyShake(1 / 30, 50, 1, true)).toBe('needsIS');
    expect(classifyShake(1 / 125, 50, 1, false)).toBe('safe');
  });
});
