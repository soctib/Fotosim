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

  it('zooming in pushes too-close elements and the focus out to the new limit', () => {
    const store = createStore();
    setElementDistance(store, 'person1', 0.5);
    setFocus(store, 0.5);
    setCamera(store, { sensorId: 'fullFrame', focalLengthMm: realMm('fullFrame', 400) });
    const min = minDistanceM(400);
    expect(store.get().scene.elements[0].distanceM).toBeCloseTo(min, 10);
    expect(store.get().camera.focusDistanceM).toBeCloseTo(min, 10);
    expect(store.get().scene.elements[1].distanceM).toBe(6); // untouched
    expect(store.derived().minDistanceM).toBeCloseTo(min, 10);
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
