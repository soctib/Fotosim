import { describe, expect, it } from 'vitest';
import { EQUIVALENT_FOCAL_STEPS_MM, SENSORS } from '../src/data/sensors';
import { focalOptions, formatFocal } from '../src/model/focal';
import { cropFactor } from '../src/model/optics';
import { formatShutter } from '../src/model/stops';

describe('focal options', () => {
  it('cameras get the common equivalent steps, real = equivalent / crop', () => {
    const opts = focalOptions(SENSORS.apsc);
    expect(opts.map((o) => o.equivalentMm)).toEqual(EQUIVALENT_FOCAL_STEPS_MM);
    for (const o of opts) expect(o.realMm * cropFactor(SENSORS.apsc)).toBeCloseTo(o.equivalentMm, 10);
  });
  it('phones only offer their built-in cameras – no digital zoom steps', () => {
    expect(focalOptions(SENSORS.phone2019).map((o) => o.equivalentMm)).toEqual([13, 26, 52]);
    expect(focalOptions(SENSORS.phoneModern).map((o) => o.equivalentMm)).toEqual([13, 24, 77]);
  });
});

describe('formatting', () => {
  it('shows real and equivalent focal length', () => {
    expect(formatFocal(50, SENSORS.fullFrame)).toBe('50 mm');
    expect(formatFocal(50, SENSORS.apsc)).toMatch(/^50 mm \(≙ 7[67] mm KB\)$/);
    expect(formatFocal(50, SENSORS.apsc, 'FF')).toMatch(/FF\)$/);
  });
  it('short phone lenses get one decimal in the locale format', () => {
    expect(formatFocal(4.2, SENSORS.phone2019)).toMatch(/^4\.2 mm/);
    expect(formatFocal(4.2, SENSORS.phone2019, 'KB', 'de-DE')).toMatch(/^4,2 mm/);
    expect(formatFocal(4.2, SENSORS.phone2019, 'KB', 'en-GB')).toMatch(/^4\.2 mm/);
  });
  it('long shutter times follow the locale too', () => {
    expect(formatShutter(0.6)).toBe('0.6 s');
    expect(formatShutter(0.6, 'de-DE')).toBe('0,6 s');
    expect(formatShutter(2.5, 'de-DE')).toBe('2,5 s');
    expect(formatShutter(1 / 60, 'de-DE')).toBe('1/60 s');
  });
});
