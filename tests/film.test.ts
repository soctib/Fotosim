import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { FILM_SPEEDS_S, filmSpeeds } from '../src/model/cameraPanel';
import { derive } from '../src/model/derive';
import { FILM_ISOS, filmMismatchStops, meterIso, nearestFilmIso } from '../src/model/film';
import { focalOptions } from '../src/model/focal';
import { FLASH_SYNC_S, fastestShutterS, flashSyncS, ISOS } from '../src/model/stops';
import type { CameraSettings } from '../src/model/types';
import { initialState } from '../src/state/store';

const cam = (patch: Partial<CameraSettings>): CameraSettings => {
  const sensorId = patch.sensorId ?? 'film35';
  const focal = focalOptions(SENSORS[sensorId]).find((o) => o.equivalentMm >= 50)!.realMm;
  return { ...initialState.camera, lensId: 'fastZoom', focalLengthMm: focal, aperture: 8, ...patch, sensorId };
};
const scene = { ...initialState.scene, lightPresetId: 'cloudy' };

describe('film speed and the camera dial', () => {
  it('film speeds are all on the ISO scale', () => {
    for (const f of FILM_ISOS) expect(ISOS).toContain(f);
    expect(nearestFilmIso(6400)).toBe(3200);
    expect(nearestFilmIso(250)).toBe(200);
  });

  it('the meter goes by the dial on manual film bodies, by the film with DX coding or on digital', () => {
    const s = { iso: 400, filmDialIso: 100 };
    expect(meterIso(s, SENSORS.film35)).toBe(100);
    expect(meterIso(s, SENSORS.film35Dx)).toBe(400);
    expect(meterIso(s, SENSORS.fullFrame)).toBe(400);
    expect(filmMismatchStops(s, SENSORS.film35)).toBeCloseTo(2, 10);
    expect(filmMismatchStops(s, SENSORS.film35Dx)).toBe(0);
  });

  it('a dial set two stops slower than the film overexposes it by two stops, while the meter reads correct', () => {
    const ok = derive(cam({ mode: 'Av', iso: 400, filmDialIso: 400 }), scene);
    const wrong = derive(cam({ mode: 'Av', iso: 400, filmDialIso: 100 }), scene);
    expect(wrong.meterOffsetStops).toBeCloseTo(ok.meterOffsetStops, 1);
    expect(wrong.exposureOffsetStops - ok.exposureOffsetStops).toBeCloseTo(2, 1);
    expect(wrong.film).toEqual({ dialIso: 100, dx: false, mismatchStops: 2 });
    // The picture still has the real film's grain: ISO 400, not 100.
    expect(wrong.settings.iso).toBe(400);
  });

  it('a dial set faster than the film underexposes it', () => {
    const d = derive(cam({ mode: 'P', iso: 100, filmDialIso: 400 }), scene);
    expect(d.exposureOffsetStops - d.meterOffsetStops).toBeCloseTo(-2, 10);
  });

  it('in M the meter shows what the camera believes, the exposure what the film gets', () => {
    const d = derive(cam({ mode: 'M', iso: 400, filmDialIso: 200, shutterS: 1 / 125 }), scene);
    expect(d.exposureOffsetStops - d.meterOffsetStops).toBeCloseTo(1, 10);
  });

  it('DX coding ignores the dial', () => {
    const a = derive(cam({ sensorId: 'film35Dx', mode: 'Av', iso: 400, filmDialIso: 100 }), scene);
    const b = derive(cam({ sensorId: 'film35Dx', mode: 'Av', iso: 400, filmDialIso: 400 }), scene);
    expect(a.exposureOffsetStops).toBeCloseTo(b.exposureOffsetStops, 10);
    expect(a.film?.dialIso).toBe(400);
  });

  it('digital cameras have no film info and the meter equals the exposure', () => {
    const d = derive(cam({ sensorId: 'fullFrame', mode: 'Av', filmDialIso: 3200 }), scene);
    expect(d.film).toBeNull();
    expect(d.meterOffsetStops).toBe(d.exposureOffsetStops);
  });
});

describe('shutters of the film bodies', () => {
  it('each body tops out at its real speed; the dials and rings stop there', () => {
    expect(fastestShutterS(SENSORS.film35)).toBe(1 / 1000);
    expect(fastestShutterS(SENSORS.film35Dx)).toBe(1 / 8000);
    expect(fastestShutterS(SENSORS.mf66)).toBe(1 / 500);
    expect(Math.min(...filmSpeeds(1 / 500))).toBe(1 / 500);
    expect(Math.min(...filmSpeeds(1 / 1000))).toBe(1 / 1000);
    expect(filmSpeeds(1 / 8000)).toEqual([...FILM_SPEEDS_S]);
  });

  it('a leaf shutter syncs the flash at every speed, a focal-plane shutter only to 1/250 s', () => {
    expect(flashSyncS(SENSORS.mf66)).toBe(1 / 500);
    expect(flashSyncS(SENSORS.film35)).toBe(FLASH_SYNC_S);
    expect(flashSyncS(SENSORS.fullFrame)).toBe(FLASH_SYNC_S);
  });

  it('fill flash in the sun: the 6×6 may use 1/500 s with the flash, the 645 is held at 1/250 s', () => {
    const sun = { ...initialState.scene, lightPresetId: 'sun' };
    const leaf = derive(cam({ sensorId: 'mf66', mode: 'Av', aperture: 5.6, iso: 400, filmDialIso: 400, flashOn: true }), sun);
    const plane = derive(cam({ sensorId: 'mf645', mode: 'Av', aperture: 5.6, iso: 400, filmDialIso: 400, flashOn: true }), sun);
    expect(leaf.settings.shutterS).toBeCloseTo(1 / 500, 9);
    expect(plane.settings.shutterS).toBeCloseTo(1 / 250, 9);
  });
});
