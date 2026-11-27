import { SENSORS } from '../data/sensors';
import type { Texts } from '../data/texts.de';
import { derive, type Derived } from '../model/derive';
import { focalOptions } from '../model/focal';
import type { CameraSettings, Scene } from '../model/types';

export type InfoKey = keyof Texts['info'];

export interface AppState {
  camera: CameraSettings;
  scene: Scene;
  /** UI-only state. */
  ui: {
    logScale: boolean;
    /** Show the blur curve, threshold line and y axis (off = just DOF band, focus and figures). */
    showDetails: boolean;
    /** Key into texts.info for the infobox (last clicked element). */
    infoKey: InfoKey;
    /** Simplified mode: fixed beginner setup, only aperture, shutter (as indicator) and focal length shown. */
    simple: boolean;
  };
}

export const initialState: AppState = {
  camera: {
    sensorId: 'apsc',
    lensId: 'kit',
    // Start on a slider step (≙ 50 mm KB) so the control and the physics agree.
    focalLengthMm: focalOptions(SENSORS.apsc).find((o) => o.equivalentMm === 50)!.realMm,
    aperture: 4.5, // widest the default kit zoom offers at 50 mm KB
    shutterS: 1 / 125,
    iso: 100,
    autoIso: true,
    mode: 'Av',
    flashOn: false,
    stabilized: true,
    motion: 'still',
    focusDistanceM: 3,
    afTarget: null,
    digitalZoom: 1,
    scanner: 'lab',
  },
  scene: {
    lightPresetId: 'cloudy',
    backlight: false,
    elements: [
      { id: 'person1', distanceM: 3, visible: true, motion: 'still' },
      { id: 'person2', distanceM: 6, visible: true, motion: 'still' },
      { id: 'background', distanceM: 50, visible: true, motion: 'frozen' },
    ],
  },
  ui: { logScale: true, showDetails: false, infoKey: 'graph', simple: false },
};

type Listener = (state: AppState, derived: Derived) => void;

/** Minimal store: one state object, derived values recomputed on every update. */
export function createStore(init: AppState = initialState) {
  let state = init;
  let derived = derive(state.camera, state.scene);
  const listeners = new Set<Listener>();

  return {
    get: () => state,
    derived: () => derived,
    update(fn: (s: AppState) => AppState) {
      state = fn(state);
      derived = derive(state.camera, state.scene);
      listeners.forEach((l) => l(state, derived));
    },
    subscribe(l: Listener) {
      listeners.add(l);
      l(state, derived);
      return () => listeners.delete(l);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
