// Small, named state mutations so UI modules don't each spell out the spread boilerplate.

import type { CameraSettings, ElementId, Mode } from '../model/types';
import type { InfoKey, Store } from './store';

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

export function setElementVisible(store: Store, id: ElementId, visible: boolean): void {
  store.update((s) => ({
    ...s,
    scene: { ...s.scene, elements: s.scene.elements.map((el) => (el.id === id ? { ...el, visible } : el)) },
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

export function setShowDetails(store: Store, showDetails: boolean): void {
  store.update((s) => ({ ...s, ui: { ...s.ui, showDetails } }));
}

/** Show the infobox text for the element the user just touched. */
export function setInfo(store: Store, infoKey: InfoKey): void {
  if (store.get().ui.infoKey !== infoKey) store.update((s) => ({ ...s, ui: { ...s.ui, infoKey } }));
}

/**
 * Switch continuous autofocus to an element, or off (null). Turning it off keeps the
 * distance the camera was focused at, so the manual focus doesn't jump.
 */
export function setAutofocus(store: Store, target: ElementId | null): void {
  const focus = store.derived().settings.focusDistanceM;
  setCamera(store, target ? { afTarget: target } : { afTarget: null, focusDistanceM: focus });
}

/**
 * Switch the exposure mode, carrying over what the camera currently uses – so e.g.
 * going from Av to M starts from a correct exposure instead of stale manual values.
 */
export function setMode(store: Store, mode: Mode): void {
  const { aperture, shutterS, iso, flashOn } = store.derived().settings;
  setCamera(store, { mode, aperture, shutterS, iso, flashOn });
}
