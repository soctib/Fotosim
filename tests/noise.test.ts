import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import { NOISE_VISIBLE_STOPS, classifyNoise, equivalentIso, noiseAmount, noiseIndexStops } from '../src/model/noise';
import { cropFactor } from '../src/model/optics';
import { initialState } from '../src/state/store';

describe('noise index', () => {
  it('a phone at ISO 100 is noisier than full frame at ISO 800', () => {
    expect(noiseIndexStops(100, 6.2)).toBeGreaterThan(noiseIndexStops(800, 1));
    expect(equivalentIso(100, 2)).toBe(400);
  });
  it('underexposure adds noise, overexposure does not remove it', () => {
    expect(noiseIndexStops(400, 1, -2)).toBeCloseTo(noiseIndexStops(400, 1) + 2, 10);
    expect(noiseIndexStops(400, 1, 2)).toBeCloseTo(noiseIndexStops(400, 1), 10);
  });
});

describe('noise verdict (normal viewing size)', () => {
  it('full frame: ISO 100 and 800 clean, 3200 visible, 12800 strong', () => {
    expect(classifyNoise(noiseIndexStops(100, 1))).toBe('low');
    expect(classifyNoise(noiseIndexStops(800, 1))).toBe('low');
    expect(classifyNoise(noiseIndexStops(3200, 1))).toBe('medium');
    expect(classifyNoise(noiseIndexStops(12800, 1))).toBe('high');
    expect(classifyNoise(noiseIndexStops(12800, 1.5))).toBe('veryHigh');
  });

  it('a phone in sunlight at base ISO is at most slightly noisy', () => {
    const old = derive({ ...initialState.camera, sensorId: 'iphoneXR', focalLengthMm: 26 / cropFactor(SENSORS.iphoneXR), mode: 'auto' }, { ...initialState.scene, lightPresetId: 'sun' });
    expect(old.settings.iso).toBe(100);
    expect(old.noise.cls).toBe('medium');
    const modern = derive({ ...initialState.camera, sensorId: 'iphone15ProMax', focalLengthMm: 24 / cropFactor(SENSORS.iphone15ProMax), mode: 'auto' }, { ...initialState.scene, lightPresetId: 'sun' });
    expect(modern.noise.cls).toBe('low');
    expect(modern.noise.amount).toBeLessThan(0.25);
  });

  it('overlay amount is invisible at base ISO on full frame and saturates far up', () => {
    expect(noiseAmount(0)).toBe(0);
    expect(noiseAmount(NOISE_VISIBLE_STOPS)).toBe(0);
    expect(noiseAmount(NOISE_VISIBLE_STOPS + 4)).toBeCloseTo(0.5, 10);
    expect(noiseAmount(20)).toBe(1);
  });
});
