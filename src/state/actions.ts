// Small, named state mutations so UI modules don't each spell out the spread boilerplate.

import { SENSORS } from '../data/sensors';
import { CAMERA_LENSES } from '../data/cameraLenses';
import { activeSensor, snapFocal } from '../model/focal';
import { cropFactor, MAX_DISTANCE_M, minDistanceM } from '../model/optics';
import type { CameraSettings, ElementId, Mode, Motion } from '../model/types';
import type { AppState, ControlView, InfoKey, Store } from './store';

export { MAX_DISTANCE_M, MIN_DISTANCE_M } from '../model/optics';

/** Distances never go below the lens's near limit nor beyond the far end of the graph. */
const clampDistance = (m: number, focalMm: number) =>
  Math.min(MAX_DISTANCE_M, Math.max(minDistanceM(focalMm), m));

/**
 * Patch the camera. A newly set focus is kept at or beyond the lens's near limit. Zooming in
 * doesn't move the elements or the stored focus: derive() applies the farther near limit, so
 * zooming back out restores the scene as it was.
 */
export function setCamera(store: Store, patch: Partial<CameraSettings>): void {
  store.update((s: AppState) => {
    const camera = { ...s.camera, ...patch };
    if (patch.focusDistanceM !== undefined) {
      camera.focusDistanceM = clampDistance(camera.focusDistanceM, camera.focalLengthMm);
    }
    return { ...s, camera };
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

export function setElementMotion(store: Store, id: ElementId, motion: Motion): void {
  store.update((s) => ({
    ...s,
    scene: { ...s.scene, elements: s.scene.elements.map((el) => (el.id === id ? { ...el, motion } : el)) },
  }));
}

export function setLight(store: Store, lightPresetId: string): void {
  store.update((s) => ({ ...s, scene: { ...s.scene, lightPresetId } }));
}

export function setBacklight(store: Store, backlight: boolean): void {
  store.update((s) => ({ ...s, scene: { ...s.scene, backlight } }));
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
 * `patch` sets more at once (a film body's speed dial leaving "A" sets the mode and the time).
 */
export function setMode(store: Store, mode: Mode, patch: Partial<CameraSettings> = {}): void {
  const { aperture, shutterS, iso, flashOn } = store.derived().settings;
  // A program shift ends with the mode, as on real cameras.
  setCamera(store, { mode, aperture, shutterS, iso, flashOn, programShift: 0, ...patch });
}

/** Show the camera seen from above or the sliders in the controls column. */
export function setControlView(store: Store, controlView: ControlView): void {
  store.update((s) => ({ ...s, ui: { ...s.ui, controlView } }));
}

/**
 * The setup simplified mode stands for: sun (front light), one person standing and the background, a full-frame
 * body with the pro zoom in Av, auto ISO, no flash, stabiliser on, photographer standing, no focus tracking. Keeps the angle
 * of view (clamped to the zoom range) and the aperture; focuses on person 1.
 */
export function applySimple(s: AppState): AppState {
  const sensor = SENSORS.fullFrame;
  const eqMm = s.camera.focalLengthMm * cropFactor(activeSensor(SENSORS[s.camera.sensorId], s.camera.focalLengthMm));
  const focalLengthMm = snapFocal(sensor, CAMERA_LENSES.fastZoom, eqMm);
  const elements = s.scene.elements.map((el) => ({
    ...el,
    visible: el.id !== 'person2',
    motion: el.id === 'background' ? el.motion : ('still' as const),
  }));
  const scene = { ...s.scene, lightPresetId: 'sun', backlight: false, elements };
  const person1 = scene.elements.find((el) => el.id === 'person1')!;
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
      motion: 'still',
      afTarget: null,
      focusDistanceM: person1.distanceM,
      digitalZoom: 1,
      programShift: 0,
    },
    scene,
    ui: { ...s.ui, simple: true },
  };
}

/** Enter simplified mode (applies its setup) or leave it (the setup stays, everything is shown again). */
export function setSimple(store: Store, simple: boolean): void {
  store.update((s) => (simple ? applySimple(s) : { ...s, ui: { ...s.ui, simple: false } }));
}
