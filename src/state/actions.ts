// Small, named state mutations so UI modules don't each spell out the spread boilerplate.

import { SENSORS } from '../data/sensors';
import { activeSensor, focalOptions } from '../model/focal';
import { cropFactor, MAX_DISTANCE_M, minDistanceM } from '../model/optics';
import type { CameraSettings, ElementId, Mode, Scene } from '../model/types';
import type { AppState, InfoKey, Store } from './store';

export { MAX_DISTANCE_M, MIN_DISTANCE_M } from '../model/optics';

/** Distances never go below the lens's near limit nor beyond the far end of the graph. */
const clampDistance = (m: number, focalMm: number) =>
  Math.min(MAX_DISTANCE_M, Math.max(minDistanceM(focalMm), m));

/** Elements closer than the lens's near limit are pushed out to it (returns the same array if nothing moved). */
function clampElements(scene: Scene, focalMm: number): Scene['elements'] {
  const min = minDistanceM(focalMm);
  return scene.elements.some((el) => el.distanceM < min)
    ? scene.elements.map((el) => (el.distanceM < min ? { ...el, distanceM: min } : el))
    : scene.elements;
}

/**
 * Patch the camera. A longer lens has a farther near limit, so the focus and the elements
 * are kept at or beyond it – like a real lens that simply won't focus any closer.
 */
export function setCamera(store: Store, patch: Partial<CameraSettings>): void {
  store.update((s: AppState) => {
    const camera = { ...s.camera, ...patch };
    camera.focusDistanceM = clampDistance(camera.focusDistanceM, camera.focalLengthMm);
    const elements = clampElements(s.scene, camera.focalLengthMm);
    return { ...s, camera, scene: elements === s.scene.elements ? s.scene : { ...s.scene, elements } };
  });
}

export function setFocus(store: Store, distanceM: number): void {
  setCamera(store, { focusDistanceM: distanceM });
}

export function setElementDistance(store: Store, id: ElementId, distanceM: number): void {
  store.update((s) => {
    const d = clampDistance(distanceM, s.camera.focalLengthMm);
    return {
      ...s,
      scene: {
        ...s.scene,
        elements: s.scene.elements.map((el) => (el.id === id ? { ...el, distanceM: d } : el)),
      },
    };
  });
}

export function setLight(store: Store, lightPresetId: string): void {
  store.update((s) => ({ ...s, scene: { ...s.scene, lightPresetId } }));
}

/**
 * Show or hide an element. Hiding the element the autofocus is tracking switches the
 * tracking off (keeping the focus where it was) – there is nothing left to follow.
 */
export function setElementVisible(store: Store, id: ElementId, visible: boolean): void {
  const focus = store.derived().settings.focusDistanceM;
  store.update((s) => {
    const dropTracking = !visible && s.camera.afTarget === id;
    return {
      ...s,
      camera: dropTracking ? { ...s.camera, afTarget: null, focusDistanceM: focus } : s.camera,
      scene: { ...s.scene, elements: s.scene.elements.map((el) => (el.id === id ? { ...el, visible } : el)) },
    };
  });
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

/**
 * The setup simplified mode stands for: sun, one person and the background, a full-frame body
 * with the pro zoom in Av, auto ISO, no flash, stabiliser on, no focus tracking. Keeps the angle
 * of view (nearest full-frame step) and the aperture; focuses on person 1.
 */
export function applySimple(s: AppState): AppState {
  const sensor = SENSORS.fullFrame;
  const eqMm = s.camera.focalLengthMm * cropFactor(activeSensor(SENSORS[s.camera.sensorId], s.camera.focalLengthMm));
  const opts = focalOptions(sensor);
  const focalLengthMm = opts.reduce((a, b) => (Math.abs(b.equivalentMm - eqMm) < Math.abs(a.equivalentMm - eqMm) ? b : a)).realMm;
  const elements = s.scene.elements.map((el) => ({ ...el, visible: el.id !== 'person2' }));
  const scene = { ...s.scene, lightPresetId: 'sun', elements };
  const clamped = { ...scene, elements: clampElements(scene, focalLengthMm) };
  const person1 = clamped.elements.find((el) => el.id === 'person1')!;
  return {
    ...s,
    camera: {
      ...s.camera,
      sensorId: sensor.id,
      lensId: 'fastZoom',
      focalLengthMm,
      mode: 'Av',
      autoIso: true,
      flashOn: false,
      stabilized: true,
      afTarget: null,
      focusDistanceM: person1.distanceM,
    },
    scene: clamped,
    ui: { ...s.ui, simple: true },
  };
}

/** Enter simplified mode (applies its setup) or leave it (the setup stays, everything is shown again). */
export function setSimple(store: Store, simple: boolean): void {
  store.update((s) => (simple ? applySimple(s) : { ...s, ui: { ...s.ui, simple: false } }));
}
