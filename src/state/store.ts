import { derive, type Derived } from '../model/derive';
import type { CameraSettings, Scene } from '../model/types';

export interface AppState {
  camera: CameraSettings;
  scene: Scene;
  /** UI-only state. */
  ui: {
    logScale: boolean;
    /** Key into texts.info for the infobox (last clicked element). */
    infoKey: string;
  };
}

export const initialState: AppState = {
  camera: {
    sensorId: 'apsc',
    focalLengthMm: 35,
    aperture: 2.8,
    shutterS: 1 / 125,
    iso: 100,
    autoIso: true,
    mode: 'Av',
    flashOn: false,
    stabilized: true,
    focusDistanceM: 3,
  },
  scene: {
    lightPresetId: 'cloudy',
    elements: [
      { id: 'person1', distanceM: 3, visible: true },
      { id: 'person2', distanceM: 6, visible: true },
      { id: 'background', distanceM: 50, visible: true },
    ],
  },
  ui: { logScale: true, infoKey: 'graph' },
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
