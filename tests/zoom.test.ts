import { describe, expect, it } from 'vitest';
import { derive } from '../src/model/derive';
import { croppedSensor, cropFactor, MAX_DIGITAL_ZOOM } from '../src/model/optics';
import { SENSORS } from '../src/data/sensors';
import type { CameraSettings } from '../src/model/types';
import { initialState } from '../src/state/store';

const cam: CameraSettings = { ...initialState.camera, sensorId: 'fullFrame', lensId: 'prime', focalLengthMm: 50, aperture: 2.8, mode: 'M', autoIso: false, iso: 400, shutterS: 1 / 250, afTarget: 'person1' };
const scene = initialState.scene;
const at = (z: number, c: Partial<CameraSettings> = {}) => derive({ ...cam, ...c, digitalZoom: z }, scene);
const p1 = (d: ReturnType<typeof derive>) => d.elements.find((e) => e.id === 'person1')!;

describe('croppedSensor()', () => {
  it('is a sensor z times smaller', () => {
    const s = croppedSensor(SENSORS.fullFrame, 2);
    expect(s.widthMm).toBe(18);
    expect(cropFactor(s)).toBeCloseTo(2, 10);
    expect(croppedSensor(SENSORS.fullFrame, 1)).toBe(SENSORS.fullFrame);
  });
});

describe('digital zoom in derive()', () => {
  const one = at(1);
  const two = at(2);

  it('narrows the framing like a longer lens, but the lens stays the same', () => {
    expect(two.zoom.equivalentFocalMm).toBeCloseTo(100, 6);
    expect(two.equivalentFocalMm).toBeCloseTo(50, 6);
    expect(two.crop).toBeCloseTo(1, 6);
    expect(two.maxAperture).toBe(one.maxAperture);
    expect(two.costs).toEqual(one.costs);
    expect(p1(two).frameHeightFraction).toBeCloseTo(2 * p1(one).frameHeightFraction, 10);
  });

  it('leaves exposure alone and adds 2·log2(z) stops of noise', () => {
    expect(two.exposureOffsetStops).toBeCloseTo(one.exposureOffsetStops, 10);
    expect(two.noise.indexStops).toBeCloseTo(one.noise.indexStops + 2, 10);
  });

  it('narrows the depth of field – but less than the optical zoom to the same framing', () => {
    expect(two.dof.totalM).toBeLessThan(one.dof.totalM * 0.6);
    expect(two.zoom.dofUncropped).toEqual(one.dof);
    const optical = at(1, { focalLengthMm: 100 });
    expect(two.dof.totalM).toBeGreaterThan(optical.dof.totalM * 1.5);
  });

  it('makes blur, movement and shake count twice as much', () => {
    const el = p1(two);
    expect(el.movementBlur).toBeCloseTo(2 * p1(one).movementBlur, 10);
    expect(two.blurFractionAt(10)).toBeCloseTo(2 * one.blurFractionAt(10), 10);
    const hand = { motion: 'still' as const, shutterS: 1 / 30 };
    expect(at(2, hand).shake.blurFactor).toBeCloseTo(2 * at(1, hand).shake.blurFactor, 10);
  });

  it('keeps a quarter of the pixels; detail per frame drops, the blur in µm stays', () => {
    expect(two.resolution.nominalMp).toBeCloseTo(one.resolution.nominalMp / 4, 6);
    expect(two.resolution.pixelsAcross).toBeCloseTo(one.resolution.pixelsAcross / 2, 6);
    expect(two.resolution.effectiveMp).toBeCloseTo(one.resolution.effectiveMp / 4, 6);
    expect(two.resolution.systemBlurUm).toBeCloseTo(one.resolution.systemBlurUm, 6);
  });

  it('noise reduction works on the uncropped frame', () => {
    const phoneNight = (z: number) =>
      derive({ ...initialState.camera, sensorId: 'iphoneXR', mode: 'auto', digitalZoom: z }, { ...scene, lightPresetId: 'nightStreet' });
    const um = (z: number) => phoneNight(z).resolution.contributions.find((c) => c.factor === 'processing')!.um;
    expect(um(3)).toBeCloseTo(um(1), 6);
  });

  it(`is clamped to 1…${MAX_DIGITAL_ZOOM}`, () => {
    expect(at(50).zoom.factor).toBe(MAX_DIGITAL_ZOOM);
    expect(at(0.5).zoom.factor).toBe(1);
  });
});
