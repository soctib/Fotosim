import { describe, expect, it } from 'vitest';
import { EQUIVALENT_FOCAL_STEPS_MM, SENSORS } from '../src/data/sensors';
import { CAMERA_LENSES } from '../src/data/cameraLenses';
import {
  activeSensor,
  equivalentToZoomPosition,
  focalOptions,
  formatFocal,
  isContinuousFocal,
  snapFocal,
  zoomPositionToEquivalent,
} from '../src/model/focal';
import { cropFactor } from '../src/model/optics';
import { formatShutter } from '../src/model/stops';

describe('focal options', () => {
  it('cameras get the common equivalent steps, real = equivalent / crop', () => {
    const opts = focalOptions(SENSORS.apsc);
    expect(opts.map((o) => o.equivalentMm)).toEqual(EQUIVALENT_FOCAL_STEPS_MM);
    for (const o of opts) expect(o.realMm * cropFactor(SENSORS.apsc)).toBeCloseTo(o.equivalentMm, 10);
  });
  it('phones only offer their built-in cameras – no digital zoom steps', () => {
    expect(focalOptions(SENSORS.iphoneXR).map((o) => o.equivalentMm)).toEqual([26]);
    expect(focalOptions(SENSORS.iphone15ProMax).map((o) => o.equivalentMm)).toEqual([13, 24, 120]);
    expect(focalOptions(SENSORS.fairphone5).map((o) => o.equivalentMm)).toEqual([13, 25]);
  });
  it('each phone camera has its own sensor, so its own real focal length (≈ Apple\'s specs)', () => {
    const real = focalOptions(SENSORS.iphone15ProMax).map((o) => o.realMm);
    expect(real[0]).toBeCloseTo(2.2, 0);
    expect(real[1]).toBeCloseTo(6.9, 0);
    expect(real[2]).toBeCloseTo(15.7, 0);
    expect(focalOptions(SENSORS.iphoneXR)[0].realMm).toBeCloseTo(4.25, 1);
  });
});

describe('active sensor', () => {
  it('cameras: the sensor itself', () => {
    expect(activeSensor(SENSORS.apsc, 50)).toBe(SENSORS.apsc);
  });
  it('phones: the camera picked by the focal length brings its sensor and aperture', () => {
    const p = SENSORS.iphone15ProMax;
    const [uw, main, tele] = focalOptions(p).map((o) => activeSensor(p, o.realMm));
    expect([uw.fixedAperture, main.fixedAperture, tele.fixedAperture]).toEqual([2.2, 1.8, 2.8]);
    expect(main.widthMm).toBe(9.8);
    expect(tele.widthMm).toBe(4.5);
    // Equivalent focal length comes out right for every camera.
    for (const o of focalOptions(p)) expect(o.realMm * cropFactor(activeSensor(p, o.realMm))).toBeCloseTo(o.equivalentMm, 6);
  });
});

describe('formatting', () => {
  it('shows real and equivalent focal length', () => {
    expect(formatFocal(50, SENSORS.fullFrame)).toBe('50 mm');
    expect(formatFocal(50, SENSORS.apsc)).toMatch(/^50 mm \(≙ 7[67] mm KB\)$/);
    expect(formatFocal(50, SENSORS.apsc, 'FF')).toMatch(/FF\)$/);
  });
  it('short phone lenses get one decimal in the locale format', () => {
    expect(formatFocal(4.2, SENSORS.iphoneXR)).toMatch(/^4\.2 mm/);
    expect(formatFocal(4.2, SENSORS.iphoneXR, 'KB', 'de-DE')).toMatch(/^4,2 mm/);
    expect(formatFocal(4.2, SENSORS.iphoneXR, 'KB', 'en-GB')).toMatch(/^4\.2 mm/);
  });
  it('long shutter times follow the locale too', () => {
    expect(formatShutter(0.6)).toBe('0.6 s');
    expect(formatShutter(0.6, 'de-DE')).toBe('0,6 s');
    expect(formatShutter(2.5, 'de-DE')).toBe('2,5 s');
    expect(formatShutter(1 / 60, 'de-DE')).toBe('1/60 s');
  });
});

describe('continuous focal length for zooms', () => {
  it('only zooms on cameras are continuous', () => {
    expect(isContinuousFocal(SENSORS.apsc, CAMERA_LENSES.kit)).toBe(true);
    expect(isContinuousFocal(SENSORS.apsc, CAMERA_LENSES.fastZoom)).toBe(true);
    expect(isContinuousFocal(SENSORS.apsc, CAMERA_LENSES.prime)).toBe(false);
    expect(isContinuousFocal(SENSORS.iphone15ProMax, CAMERA_LENSES.kit)).toBe(false);
  });
  it('zooms keep any equivalent focal length within the range, clamped at the ends', () => {
    const crop = cropFactor(SENSORS.apsc);
    expect(snapFocal(SENSORS.apsc, CAMERA_LENSES.kit, 60) * crop).toBeCloseTo(60, 10);
    expect(snapFocal(SENSORS.apsc, CAMERA_LENSES.kit, 5) * crop).toBeCloseTo(EQUIVALENT_FOCAL_STEPS_MM[0], 10);
    expect(snapFocal(SENSORS.apsc, CAMERA_LENSES.kit, 1000) * crop).toBeCloseTo(400, 10);
  });
  it('primes and phones snap to the nearest step', () => {
    expect(snapFocal(SENSORS.fullFrame, CAMERA_LENSES.prime, 57)).toBeCloseTo(50, 10);
    expect(snapFocal(SENSORS.fullFrame, CAMERA_LENSES.prime, 62)).toBeCloseTo(70, 10);
    const phone = focalOptions(SENSORS.iphone15ProMax);
    expect(snapFocal(SENSORS.iphone15ProMax, CAMERA_LENSES.kit, 100)).toBe(phone[2].realMm);
  });
  it('slider position maps log-linearly onto the step range and back', () => {
    expect(zoomPositionToEquivalent(0)).toBeCloseTo(14, 10);
    expect(zoomPositionToEquivalent(1)).toBeCloseTo(400, 10);
    expect(zoomPositionToEquivalent(0.5)).toBeCloseTo(Math.sqrt(14 * 400), 10);
    for (const eq of [14, 50, 123, 400]) expect(zoomPositionToEquivalent(equivalentToZoomPosition(eq))).toBeCloseTo(eq, 10);
  });
});
