import { describe, expect, it } from 'vitest';
import { lightPreset } from '../src/data/lightPresets';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import {
  BACKLIGHT_STOPS,
  DIGITAL_HEADROOM_STOPS,
  displayStops,
  FILM_HEADROOM_STOPS,
  dynamicRange,
  highlightLimitStops,
  layerTone,
  sceneContrast,
} from '../src/model/dynamicRange';
import { activeSensor, focalOptions } from '../src/model/focal';
import { resolveMode } from '../src/model/modes';
import type { CameraSettings, Scene, SensorId } from '../src/model/types';
import { initialState } from '../src/state/store';

describe('dynamicRange', () => {
  it('digital clips 3 stops over; the floor is the range below that, falling a stop per ISO stop', () => {
    const base = dynamicRange(SENSORS.fullFrame, 100);
    expect(base.clipStops).toBe(DIGITAL_HEADROOM_STOPS);
    expect(base.rangeStops).toBe(14);
    expect(base.floorStops).toBe(-11);
    const high = dynamicRange(SENSORS.fullFrame, 1600);
    expect(high.clipStops).toBe(3);
    expect(high.floorStops).toBeCloseTo(-7, 10);
  });

  it('bigger sensors hold more range', () => {
    const order: SensorId[] = ['oneInch', 'apsc', 'fullFrame', 'mf4433'];
    const ranges = order.map((id) => dynamicRange(SENSORS[id], 100).rangeStops);
    expect([...ranges].sort((a, b) => a - b)).toEqual(ranges);
    const phone = dynamicRange(SENSORS.iphoneXR, 100);
    expect(phone.floorStops).toBeGreaterThan(dynamicRange(SENSORS.oneInch, 100).floorStops);
  });

  it('colour negative film takes 5 stops of overexposure, whatever its speed', () => {
    const film = dynamicRange(SENSORS.film35, 400);
    expect(film.clipStops).toBe(FILM_HEADROOM_STOPS);
    expect(dynamicRange(SENSORS.film35, 3200)).toEqual(film);
    expect(film.floorStops).toBeGreaterThan(dynamicRange(SENSORS.fullFrame, 100).floorStops);
  });

  it('phones merge a burst: the clip rises by the merge gain, the floor stays a single frame’s', () => {
    const xr = dynamicRange(SENSORS.iphoneXR, 100);
    expect(xr.clipStops).toBe(3 + SENSORS.iphoneXR.multiFrameStops!);
    expect(xr.floorStops).toBe(3 - 10);
    // Newer phone, bigger main sensor: more on both ends.
    const main15 = activeSensor(SENSORS.iphone15ProMax, focalOptions(SENSORS.iphone15ProMax)[1].realMm);
    const pro = dynamicRange(main15, 100);
    expect(pro.clipStops).toBeGreaterThan(xr.clipStops);
    expect(pro.floorStops).toBeLessThan(xr.floorStops);
    // The tele module is the smallest sensor.
    const tele = activeSensor(SENSORS.iphone15ProMax, focalOptions(SENSORS.iphone15ProMax)[2].realMm);
    expect(dynamicRange(tele, 100).floorStops).toBeGreaterThan(pro.floorStops);
  });

  it('never drops below a few stops at extreme ISO', () => {
    expect(dynamicRange(SENSORS.iphoneXR, 1e6).rangeStops).toBeGreaterThanOrEqual(4);
  });
});

describe('displayStops', () => {
  it('squeezes overexposure into the medium’s headroom; underexposure stays', () => {
    const digital = dynamicRange(SENSORS.fullFrame, 100);
    const film = dynamicRange(SENSORS.film35, 400);
    expect(displayStops(2, digital)).toBe(2);
    expect(displayStops(film.clipStops, film)).toBe(DIGITAL_HEADROOM_STOPS);
    expect(displayStops(2, film)).toBeCloseTo(1.2, 10);
    expect(displayStops(-2, film)).toBe(-2);
  });
});

describe('layerTone', () => {
  const dr = { rangeStops: 10, clipStops: 3, floorStops: -7 };
  it('fades over one stop before clip and floor, then is flat', () => {
    expect(layerTone(0, dr)).toEqual({ brightnessStops: 0, state: 'ok', highlight: 0, shadow: 0 });
    expect(layerTone(2, dr).highlight).toBe(0);
    expect(layerTone(2.5, dr).highlight).toBeCloseTo(0.5, 10);
    expect(layerTone(3, dr)).toMatchObject({ state: 'clipped', highlight: 1 });
    expect(layerTone(5, dr).highlight).toBe(1);
    expect(layerTone(-6.5, dr).shadow).toBeCloseTo(0.5, 10);
    expect(layerTone(-7, dr)).toMatchObject({ state: 'crushed', shadow: 1, highlight: 0 });
  });
});

describe('sceneContrast', () => {
  it('backlight darkens the subject; the background keeps its light', () => {
    const sun = lightPreset('sun');
    const front = sceneContrast(sun, false);
    expect(front).toEqual({ subjectEv100: 15, skyStops: sun.skyStops, sceneryStops: sun.sceneryStops });
    const back = sceneContrast(sun, true);
    expect(back.subjectEv100).toBe(15 - BACKLIGHT_STOPS);
    expect(back.subjectEv100 + back.skyStops).toBe(front.subjectEv100 + front.skyStops);
    expect(back.skyStops).toBeGreaterThanOrEqual(4);
  });

  it('highlightLimitStops: ambient level at which the brightest layer starts to fade', () => {
    expect(highlightLimitStops({ brightestStops: 4, clipStops: 3 })).toBe(-2);
  });
});

// A portrait at 3 m against the sky.
const cam = (patch: Partial<CameraSettings>): CameraSettings => {
  const sensorId = patch.sensorId ?? 'fullFrame';
  const focal = focalOptions(SENSORS[sensorId]).find((o) => o.equivalentMm >= 24)!.realMm;
  return { ...initialState.camera, lensId: 'fastZoom', focalLengthMm: focal, ...patch, sensorId };
};
const scene = (lightPresetId: string, backlight: boolean): Scene => ({ ...initialState.scene, lightPresetId, backlight });
const el = (d: ReturnType<typeof derive>, id: string) => d.elements.find((e) => e.id === id)!;

describe('derive() dynamic range', () => {
  it('front light: nothing clips, and the scenery is drawn as before', () => {
    const d = derive(initialState.camera, initialState.scene);
    expect(d.dynamicRange.clipped).toEqual([]);
    expect(d.dynamicRange.crushed).toEqual([]);
    expect(el(d, 'background').exposureOffsetStops).toBeCloseTo(el(d, 'person1').exposureOffsetStops, 10);
    expect(d.dynamicRange.sky.exposureOffsetStops).toBeCloseTo(d.ambientOffsetStops, 10);
  });

  it('backlight: exposed for the face, a camera blows out the sky and the background', () => {
    const d = derive(cam({ mode: 'Av', aperture: 4 }), scene('sun', true));
    expect(el(d, 'person1').tone.state).toBe('ok');
    expect(d.dynamicRange.clipped).toEqual(['sky', 'background']);
    // Drawn brighter than in front light by the backlight.
    expect(el(d, 'background').exposureOffsetStops).toBeCloseTo(d.ambientOffsetStops + BACKLIGHT_STOPS, 10);
  });

  it('backlight: film and an HDR phone hold the sky a camera blows out', () => {
    const film = derive(cam({ sensorId: 'film35', mode: 'Av', aperture: 4, iso: 400 }), scene('sun', true));
    expect(film.dynamicRange.clipped).toEqual([]);
    const phone = derive(cam({ sensorId: 'iphone15ProMax', mode: 'auto' }), scene('sun', true));
    expect(phone.settings.flashOn).toBe(false);
    expect(phone.dynamicRange.clipped).toEqual([]);
    // …and draw it less washed out than its brightness alone would.
    expect(el(phone, 'background').exposureOffsetStops).toBeLessThan(BACKLIGHT_STOPS - 1);
  });

  it('fill flash: with flash the camera exposes for the sky and the flash lights the face', () => {
    const plain = derive(cam({ mode: 'P', flashOn: false }), scene('cloudy', true));
    expect(plain.dynamicRange.clipped).toContain('sky');
    const filled = derive(cam({ mode: 'P', flashOn: true }), scene('cloudy', true));
    expect(filled.dynamicRange.clipped).toEqual([]);
    expect(Math.abs(filled.exposureOffsetStops)).toBeLessThan(0.3);
    expect(filled.ambientOffsetStops).toBeLessThan(plain.ambientOffsetStops - 1.5);
  });

  it('auto mode fills in with flash against the light', () => {
    expect(derive(cam({ mode: 'auto' }), scene('cloudy', false)).settings.flashOn).toBe(false);
    const d = derive(cam({ mode: 'auto' }), scene('cloudy', true));
    expect(d.settings.flashOn).toBe(true);
    expect(d.dynamicRange.clipped).toEqual([]);
  });

  it('at night a small phone sensor loses the dark sky that full frame still holds', () => {
    const phone = derive(cam({ sensorId: 'iphoneXR', mode: 'auto' }), scene('nightStreet', false));
    expect(phone.dynamicRange.crushed).toContain('sky');
    const ff = derive(cam({ mode: 'auto' }), scene('nightStreet', false));
    expect(ff.dynamicRange.crushed).toEqual([]);
  });

  it('hidden elements are never reported', () => {
    const s = scene('sun', true);
    const hidden = { ...s, elements: s.elements.map((e) => (e.id === 'background' ? { ...e, visible: false } : e)) };
    const d = derive(cam({ mode: 'Av', aperture: 4 }), hidden);
    expect(d.dynamicRange.clipped).toEqual(['sky']);
  });
});

describe('resolveMode with highlights', () => {
  const ff = SENSORS.fullFrame;
  const base = cam({ lensId: 'prime', focalLengthMm: 50 });
  const h = { brightestStops: 4.5, clipStops: 3 };

  it('without flash still exposes for the subject', () => {
    const a = resolveMode({ ...base, mode: 'Av', aperture: 4 }, ff, 10, h);
    const b = resolveMode({ ...base, mode: 'Av', aperture: 4 }, ff, 10);
    expect(a.settings).toEqual(b.settings);
  });

  it('with flash darkens the ambient light below the background’s clip', () => {
    const r = resolveMode({ ...base, mode: 'P', flashOn: true, autoIso: true }, ff, 10, h);
    const none = resolveMode({ ...base, mode: 'P', flashOn: true, autoIso: true }, ff, 10);
    const ambient = (s: CameraSettings) => 10 - (Math.log2((s.aperture * s.aperture) / s.shutterS) - Math.log2(s.iso / 100));
    expect(ambient(r.settings)).toBeLessThanOrEqual(highlightLimitStops(h) + 0.2);
    expect(ambient(none.settings)).toBeGreaterThan(ambient(r.settings));
  });
});
