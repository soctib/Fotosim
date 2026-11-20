import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { focalOptions } from '../src/model/focal';
import { MIN_DISTANCE_M, minDistanceM } from '../src/model/optics';
import {
  setAutofocus,
  setCamera,
  setElementDistance,
  setElementVisible,
  setFocus,
  setLight,
  setSimple,
} from '../src/state/actions';
import { createStore } from '../src/state/store';

const realMm = (sensorId: keyof typeof SENSORS, eq: number) =>
  focalOptions(SENSORS[sensorId]).find((o) => o.equivalentMm === eq)!.realMm;

describe('near limit', () => {
  it('is 0.3 m for short lenses and about 8× the focal length for long ones', () => {
    expect(minDistanceM(24)).toBe(MIN_DISTANCE_M);
    expect(minDistanceM(50)).toBeCloseTo(0.4, 10);
    expect(minDistanceM(400)).toBeCloseTo(3.2, 10);
  });

  it('clamps focus and element distances for the current lens', () => {
    const store = createStore();
    setCamera(store, { sensorId: 'fullFrame', focalLengthMm: realMm('fullFrame', 300) });
    setFocus(store, 0.3);
    setElementDistance(store, 'person1', 0.3);
    const min = minDistanceM(300);
    expect(store.get().camera.focusDistanceM).toBeCloseTo(min, 10);
    expect(store.get().scene.elements[0].distanceM).toBeCloseTo(min, 10);
    // Nothing in the derived scene is infinite or NaN any more.
    for (const el of store.derived().elements) {
      expect(Number.isFinite(el.heightFractionPerM)).toBe(true);
      expect(Number.isFinite(el.relativeBlur)).toBe(true);
    }
    expect(store.derived().dof.totalM).toBeGreaterThan(0);
  });

  it('zooming in pushes too-close elements and the focus out to the new limit – only in derive()', () => {
    const store = createStore();
    setElementDistance(store, 'person1', 0.5);
    setFocus(store, 0.5);
    setCamera(store, { sensorId: 'fullFrame', focalLengthMm: realMm('fullFrame', 400) });
    const min = minDistanceM(400);
    const d = store.derived();
    expect(d.elements[0].distanceM).toBeCloseTo(min, 10);
    expect(d.settings.focusDistanceM).toBeCloseTo(min, 10);
    expect(d.elements[1].distanceM).toBe(6); // untouched
    expect(d.minDistanceM).toBeCloseTo(min, 10);
    // The scene itself is unchanged …
    expect(store.get().scene.elements[0].distanceM).toBe(0.5);
    expect(store.get().camera.focusDistanceM).toBe(0.5);
  });

  it('zooming in and back out restores distances and focus', () => {
    const store = createStore();
    setElementDistance(store, 'person1', 1);
    setFocus(store, 1);
    setCamera(store, { sensorId: 'fullFrame', focalLengthMm: realMm('fullFrame', 400) });
    setCamera(store, { focalLengthMm: realMm('fullFrame', 50) });
    expect(store.derived().elements[0].distanceM).toBe(1);
    expect(store.derived().settings.focusDistanceM).toBe(1);
  });
});

describe('focus tracking and hidden elements', () => {
  it('hiding the tracked element switches tracking off and keeps the focus there', () => {
    const store = createStore();
    setElementDistance(store, 'person2', 8);
    setAutofocus(store, 'person2');
    expect(store.derived().settings.focusDistanceM).toBe(8);
    setElementVisible(store, 'person2', false);
    expect(store.get().camera.afTarget).toBeNull();
    expect(store.get().camera.focusDistanceM).toBe(8);
    expect(store.derived().settings.focusDistanceM).toBe(8);
  });

  it('hiding another element leaves tracking alone', () => {
    const store = createStore();
    setAutofocus(store, 'person2');
    setElementVisible(store, 'person1', false);
    expect(store.get().camera.afTarget).toBe('person2');
  });

  it('switching tracking off keeps the tracked distance', () => {
    const store = createStore();
    setAutofocus(store, 'background');
    expect(store.derived().settings.focusDistanceM).toBe(50);
    setAutofocus(store, null);
    expect(store.get().camera.focusDistanceM).toBe(50);
  });
});

describe('simplified mode', () => {
  it('applies the beginner setup and keeps the angle of view', () => {
    const store = createStore();
    setCamera(store, { sensorId: 'mft', focalLengthMm: realMm('mft', 85), flashOn: true, mode: 'M', afTarget: 'person2' });
    setLight(store, 'candle');
    setSimple(store, true);
    const { camera, scene, ui } = store.get();
    expect(ui.simple).toBe(true);
    expect(camera).toMatchObject({
      sensorId: 'fullFrame',
      lensId: 'fastZoom',
      mode: 'Av',
      autoIso: true,
      flashOn: false,
      stabilized: true,
      afTarget: null,
    });
    expect(camera.focalLengthMm).toBe(realMm('fullFrame', 85));
    expect(scene.lightPresetId).toBe('sun');
    expect(scene.elements.map((el) => [el.id, el.visible])).toEqual([
      ['person1', true],
      ['person2', false],
      ['background', true],
    ]);
    expect(camera.focusDistanceM).toBe(scene.elements[0].distanceM);
  });

  it('keeps the setup when leaving', () => {
    const store = createStore();
    setSimple(store, true);
    const camera = store.get().camera;
    setSimple(store, false);
    expect(store.get().ui.simple).toBe(false);
    expect(store.get().camera).toEqual(camera);
  });
});

describe('simplified mode and digital zoom', () => {
  it('entering simplified mode resets the digital zoom; leaving keeps 1×', () => {
    const store = createStore();
    setCamera(store, { digitalZoom: 4 });
    setSimple(store, true);
    expect(store.get().camera.digitalZoom).toBe(1);
    setSimple(store, false);
    expect(store.get().camera.digitalZoom).toBe(1);
  });
});
