import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import {
  blurDiscMm,
  circleOfConfusionMm,
  cropFactor,
  depthOfField,
  equivalentAperture,
  frameHeightFraction,
  horizontalAngleOfViewDeg,
  hyperfocalDistanceM,
  relativeBlur,
} from '../src/model/optics';

const ff = SENSORS.fullFrame;

describe('crop factor', () => {
  it('is 1 for full frame, ~1.5 for APS-C, ~2 for MFT', () => {
    expect(cropFactor(ff)).toBeCloseTo(1, 5);
    expect(cropFactor(SENSORS.apsc)).toBeCloseTo(1.53, 1);
    expect(cropFactor(SENSORS.mft)).toBeCloseTo(2, 1);
  });
  it('is < 1 for medium format', () => {
    expect(cropFactor(SENSORS.mf645)).toBeLessThan(0.7);
    expect(cropFactor(SENSORS.mf4433)).toBeCloseTo(0.79, 1);
  });
  it('is large for phones', () => {
    expect(cropFactor(SENSORS.iphoneXR)).toBeGreaterThan(5);
  });
});

describe('depth of field', () => {
  it('matches textbook values: 50 mm f/1.8 at 3 m on full frame ≈ 0.37 m', () => {
    const d = depthOfField(50, 1.8, 3, ff);
    expect(circleOfConfusionMm(ff)).toBeCloseTo(0.0288, 3);
    expect(d.nearM).toBeCloseTo(2.83, 1);
    expect(d.farM).toBeCloseTo(3.19, 1);
    expect(d.totalM).toBeGreaterThan(0.3);
    expect(d.totalM).toBeLessThan(0.45);
  });
  it('reaches infinity at the hyperfocal distance', () => {
    const H = hyperfocalDistanceM(24, 8, ff);
    expect(depthOfField(24, 8, H * 1.01, ff).farM).toBe(Infinity);
    expect(depthOfField(24, 8, H, ff).nearM).toBeCloseTo(H / 2, 0);
  });
  it('a phone at f/1.8 has much more DOF than full frame at f/1.8 (same framing)', () => {
    const phone = SENSORS.iphoneXR;
    const fPhone = 50 / cropFactor(phone);
    const dPhone = depthOfField(fPhone, 1.8, 3, phone);
    const dFf = depthOfField(50, 1.8, 3, ff);
    expect(dPhone.totalM).toBeGreaterThan(dFf.totalM * 4);
    // equivalence: phone f/1.8 ≈ full frame at the equivalent aperture
    const dEq = depthOfField(50, equivalentAperture(1.8, phone), 3, ff);
    expect(dPhone.totalM / dEq.totalM).toBeGreaterThan(0.8);
    expect(dPhone.totalM / dEq.totalM).toBeLessThan(1.25);
  });
});

describe('blur', () => {
  it('is zero at the focus distance', () => {
    expect(blurDiscMm(50, 2.8, 3, 3)).toBeCloseTo(0, 10);
  });
  it('is finite for infinity and grows with distance from focus', () => {
    const atInf = blurDiscMm(50, 2.8, 3, Infinity);
    expect(Number.isFinite(atInf)).toBe(true);
    expect(blurDiscMm(50, 2.8, 3, 10)).toBeLessThan(atInf);
    expect(blurDiscMm(50, 2.8, 3, 1)).toBeGreaterThan(blurDiscMm(50, 2.8, 3, 2));
  });
  it('relative blur is 1 at the DOF limits', () => {
    const d = depthOfField(50, 2.8, 3, ff);
    expect(relativeBlur(50, 2.8, 3, d.farM, ff)).toBeCloseTo(1, 1);
    expect(relativeBlur(50, 2.8, 3, d.nearM, ff)).toBeCloseTo(1, 1);
  });
  it('closing the aperture reduces blur', () => {
    expect(blurDiscMm(50, 8, 3, 10)).toBeLessThan(blurDiscMm(50, 2, 3, 10));
  });
});

describe('framing', () => {
  it('50 mm on full frame has ~40° horizontal angle of view', () => {
    expect(horizontalAngleOfViewDeg(50, ff)).toBeCloseTo(39.6, 0);
  });
  it('a person at ~3 m fills a portrait-ish part of a 50 mm frame', () => {
    const frac = frameHeightFraction(50, 1.75, 3, ff);
    expect(frac).toBeGreaterThan(1); // taller than the 24 mm frame height
    expect(frameHeightFraction(50, 1.75, 10, ff)).toBeLessThan(0.5);
  });
});
