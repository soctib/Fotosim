import { describe, expect, it } from 'vitest';
import { CAMERA_LENSES } from '../src/data/cameraLenses';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import { focalOptions } from '../src/model/focal';
import { circleOfConfusionMm, cropFactor, sensorDiagonalMm } from '../src/model/optics';
import {
  diffractionBlurUm,
  effectiveResolution,
  filmBlurUm,
  lensBlurUm,
  processingBlurUm,
  shakeBlurUm,
} from '../src/model/resolution';
import type { CameraSettings, Scene, SensorId } from '../src/model/types';
import { initialState } from '../src/state/store';

/** Manual exposure in sun on a tripod, focus tracking person 1 – nothing but the gear limits detail. */
const BASE: CameraSettings = {
  ...initialState.camera,
  mode: 'M',
  autoIso: false,
  iso: 100,
  shutterS: 1 / 250,
  motion: 'frozen',
  afTarget: 'person1',
};
const SUN: Scene = { ...initialState.scene, lightPresetId: 'sun' };
const eq = (sensorId: SensorId, eqMm: number) => eqMm / cropFactor(SENSORS[sensorId]);
const res = (c: Partial<CameraSettings>, scene = SUN) => derive({ ...BASE, ...c }, scene).resolution;
const ff = (aperture: number, lensId: CameraSettings['lensId'] = 'prime', eqMm = 50, sensorId: SensorId = 'fullFrame') =>
  res({ sensorId, lensId, focalLengthMm: eq(sensorId, eqMm), aperture });

describe('effectiveResolution()', () => {
  it('combines contributions as a root sum of squares and names the largest', () => {
    const r = effectiveResolution({
      frameWidthMm: 36,
      frameHeightMm: 24,
      pixelPitchUm: 6,
      samplingFactor: 1,
      blurs: { diffraction: 8, lens: 0 },
    });
    expect(r.totalBlurUm).toBeCloseTo(10, 10);
    expect(r.effectiveMp).toBeCloseTo((36000 * 24000) / 100 / 1e6, 6);
    expect(r.nominalMp).toBeCloseTo(24, 6);
    expect(r.bottleneck).toBe('diffraction');
    expect(r.contributions.map((c) => c.factor)).toEqual(['diffraction', 'pixels']); // zero lens left out
    expect(r.linePairsPerHeight).toBeCloseTo(24000 / 10 / 2, 6);
  });

  it('never reports more than the file has', () => {
    const r = effectiveResolution({ frameWidthMm: 36, frameHeightMm: 24, pixelPitchUm: 6, samplingFactor: 0.5, blurs: {} });
    expect(r.effectiveMp).toBeCloseTo(r.nominalMp, 6);
  });

  it('a blur of one circle of confusion leaves 1500 pixels along the diagonal (the "sharp" standard)', () => {
    const coc = circleOfConfusionMm(SENSORS.fullFrame) * 1000;
    const r = effectiveResolution({ frameWidthMm: 36, frameHeightMm: 24, pixelPitchUm: 0.01, samplingFactor: 1, blurs: { defocus: coc } });
    const diagonalPx = (sensorDiagonalMm(SENSORS.fullFrame) * 1000) / r.totalBlurUm;
    expect(diagonalPx).toBeCloseTo(1500, 0);
  });

  it('film: the scan pixels and the scanner optics count as one "scanner" contribution', () => {
    const r = effectiveResolution({ frameWidthMm: 36, frameHeightMm: 24, pixelPitchUm: 6, samplingFactor: 1, scannerBlurUm: 8, blurs: {} });
    expect(r.contributions).toEqual([{ factor: 'scanner', um: 10 }]);
  });

  it('system blur leaves out defocus, motion and shake', () => {
    const r = effectiveResolution({
      frameWidthMm: 36,
      frameHeightMm: 24,
      pixelPitchUm: 3,
      samplingFactor: 1,
      blurs: { lens: 4, defocus: 50, motion: 20, shake: 10 },
    });
    expect(r.systemBlurUm).toBeCloseTo(5, 10);
  });
});

describe('contributions', () => {
  it('diffraction grows with the f-number', () => {
    expect(diffractionBlurUm(16)).toBeCloseTo(2 * diffractionBlurUm(8), 10);
  });

  it('a lens is softest wide open and at the ends of a zoom', () => {
    const kit = CAMERA_LENSES.kit;
    expect(lensBlurUm(kit, 50, 4.5, 1)).toBeGreaterThan(lensBlurUm(kit, 50, 9, 1));
    expect(lensBlurUm(kit, 85, 11, 1)).toBeGreaterThan(lensBlurUm(kit, 50, 11, 1));
    // Stopped far down only the residual is left.
    expect(lensBlurUm(CAMERA_LENSES.prime, 50, 16, 1)).toBeCloseTo(CAMERA_LENSES.prime.bestUm, 1);
    expect(lensBlurUm(CAMERA_LENSES.prime, 50, 5.6, 0.5)).toBeCloseTo(lensBlurUm(CAMERA_LENSES.prime, 50, 5.6, 1) / 2, 10);
  });

  it('faster film resolves less', () => {
    expect(filmBlurUm(3200)).toBeGreaterThan(filmBlurUm(400));
    expect(filmBlurUm(400)).toBeGreaterThan(filmBlurUm(100));
  });

  it('noise reduction only starts in the noise, and earlier on phones', () => {
    expect(processingBlurUm(4, 6, false)).toBe(0);
    expect(processingBlurUm(7, 6, false)).toBeGreaterThan(0);
    expect(processingBlurUm(4, 1.4, true)).toBeGreaterThan(0);
  });

  it('shake smear grows with the shake factor', () => {
    expect(shakeBlurUm(0, 0.029)).toBe(0);
    expect(shakeBlurUm(2, 0.029)).toBeCloseTo(2 * shakeBlurUm(1, 0.029), 10);
  });
});

describe('calibration (subject in focus, tripod, sun)', () => {
  it('full frame 24 MP with a prime at f/5.6: about 12–18 MP, limited by the pixels', () => {
    const r = ff(5.6);
    expect(r.nominalMp).toBeCloseTo(24, 6);
    expect(r.effectiveMp).toBeGreaterThan(12);
    expect(r.effectiveMp).toBeLessThan(18);
    expect(r.bottleneck).toBe('pixels');
  });

  it('the same at f/22: about 3–6 MP, limited by diffraction', () => {
    const r = ff(22);
    expect(r.effectiveMp).toBeGreaterThan(3);
    expect(r.effectiveMp).toBeLessThan(6);
    expect(r.bottleneck).toBe('diffraction');
  });

  it('diffraction takes over around f/11 on 24 MP, around f/8 on 45 MP', () => {
    expect(ff(8).bottleneck).toBe('pixels');
    expect(ff(11).bottleneck).toBe('diffraction');
    const pro = (n: number) => ff(n, 'prime', 50, 'fullFramePro');
    expect(pro(5.6).bottleneck).toBe('pixels');
    expect(pro(8).bottleneck).toBe('diffraction');
    // More pixels still win at moderate apertures.
    expect(pro(5.6).effectiveMp).toBeGreaterThan(ff(5.6).effectiveMp * 1.3);
  });

  it('a kit zoom wide open is clearly below a prime at the same aperture; two stops down they are close', () => {
    const kitOpen = ff(5.6, 'kit', 85);
    const primeSame = ff(5.6, 'prime', 85);
    expect(kitOpen.bottleneck).toBe('lens');
    expect(kitOpen.effectiveMp).toBeLessThan(primeSame.effectiveMp * 0.7);
    expect(ff(11, 'kit', 85).effectiveMp).toBeGreaterThan(ff(11, 'prime', 85).effectiveMp * 0.8);
  });

  it('iPhone XR in daylight: about 4–7 of its 12 MP', () => {
    const r = res({ sensorId: 'iphoneXR', focalLengthMm: focalOptions(SENSORS.iphoneXR)[0].realMm, shutterS: 1 / 2000 });
    expect(r.nominalMp).toBeCloseTo(12, 0);
    expect(r.effectiveMp).toBeGreaterThan(4);
    expect(r.effectiveMp).toBeLessThan(7);
  });

  it('iPhone 15 Pro Max tele (f/2.8, 1.12 µm pixels) is diffraction-limited', () => {
    const r = res({ sensorId: 'iphone15ProMax', focalLengthMm: focalOptions(SENSORS.iphone15ProMax)[2].realMm, shutterS: 1 / 1000 });
    expect(r.bottleneck).toBe('diffraction');
  });

  it('phone at night: noise reduction becomes the bottleneck', () => {
    const night: Scene = { ...initialState.scene, lightPresetId: 'nightStreet' };
    const d = derive(
      { ...initialState.camera, sensorId: 'iphoneXR', focalLengthMm: focalOptions(SENSORS.iphoneXR)[0].realMm, mode: 'auto' },
      night,
    );
    expect(d.resolution.bottleneck).toBe('processing');
  });

  it('35 mm ISO 400 film: a lab scan limits it to a few MP; a film scanner leaves the film as the limit', () => {
    const film = (scanner: CameraSettings['scanner']) => res({ sensorId: 'film35', lensId: 'prime', focalLengthMm: 50, aperture: 5.6, iso: 400, scanner });
    const lab = film('lab');
    expect(lab.bottleneck).toBe('scanner');
    expect(lab.nominalMp).toBeGreaterThan(5.5);
    expect(lab.nominalMp).toBeLessThan(7);
    expect(lab.effectiveMp).toBeGreaterThan(3);
    expect(lab.effectiveMp).toBeLessThan(5);
    const scanner = film('filmScanner');
    expect(scanner.bottleneck).toBe('film');
    expect(scanner.effectiveMp).toBeGreaterThan(6);
    expect(scanner.effectiveMp).toBeLessThan(10);
  });

  it('6×7 film with a film scanner is well above any 35 mm result', () => {
    const mf = res({ sensorId: 'mf67', lensId: 'prime', focalLengthMm: eq('mf67', 50), aperture: 8, iso: 400, scanner: 'filmScanner' });
    const drum35 = res({ sensorId: 'film35', lensId: 'prime', focalLengthMm: 50, aperture: 5.6, iso: 400, scanner: 'drum' });
    expect(mf.effectiveMp).toBeGreaterThan(2 * drum35.effectiveMp);
  });

  it('defocus, movement and shake show up when they happen', () => {
    // Focused on person 2, person 1 is the subject no more – focus manually in front of person 1 instead.
    expect(res({ afTarget: null, focusDistanceM: 2, aperture: 1.4, lensId: 'prime', sensorId: 'fullFrame', focalLengthMm: 50 }).bottleneck).toBe('defocus');
    const running: Scene = { ...SUN, elements: SUN.elements.map((e) => (e.id === 'person1' ? { ...e, motion: 'run' } : e)) };
    expect(res({ sensorId: 'fullFrame', shutterS: 1 / 60 }, running).bottleneck).toBe('motion');
    expect(res({ sensorId: 'fullFrame', lensId: 'prime', aperture: 5.6, focalLengthMm: 50, motion: 'still', stabilized: false, shutterS: 1 / 8 }).bottleneck).toBe('shake');
  });
});
