// Small, named state mutations so UI modules don't each spell out the spread boilerplate.

import type { CameraSettings, ElementId } from '../model/types';
import type { Store } from './store';

/** Range for element and focus distances (UI limits, not physics). */
export const MIN_DISTANCE_M = 0.3;
export const MAX_DISTANCE_M = 1000;

const clampDistance = (m: number) => Math.min(MAX_DISTANCE_M, Math.max(MIN_DISTANCE_M, m));

export function setCamera(store: Store, patch: Partial<CameraSettings>): void {
  store.update((s) => ({ ...s, camera: { ...s.camera, ...patch } }));
}

export function setFocus(store: Store, distanceM: number): void {
  setCamera(store, { focusDistanceM: clampDistance(distanceM) });
}

export function setElementDistance(store: Store, id: ElementId, distanceM: number): void {
  const d = clampDistance(distanceM);
  store.update((s) => ({
    ...s,
    scene: {
      ...s.scene,
      elements: s.scene.elements.map((el) => (el.id === id ? { ...el, distanceM: d } : el)),
    },
  }));
}

/** Simulated autofocus: focus exactly on an element. */
export function focusOn(store: Store, id: ElementId): void {
  const el = store.get().scene.elements.find((e) => e.id === id);
  if (el) setFocus(store, el.distanceM);
}

export function setLogScale(store: Store, logScale: boolean): void {
  store.update((s) => ({ ...s, ui: { ...s.ui, logScale } }));
}
