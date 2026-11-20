// Keeps the app state across reloads (localStorage). Saved data is untrusted: it may come from
// an older version with other sensors, lenses or fields, so each section is validated on load
// and falls back to the defaults when anything in it doesn't fit.

import { CAMERA_LENSES } from '../data/cameraLenses';
import { LIGHT_PRESETS } from '../data/lightPresets';
import { SENSORS } from '../data/sensors';
import { de } from '../data/texts.de';
import type { CameraSettings, ElementId, Mode, Scene } from '../model/types';
import type { AppState, Store } from './store';

const KEY = 'fotosim.state.v1';
const MODES: Mode[] = ['auto', 'P', 'Av', 'Tv', 'M'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPos = (v: unknown): v is number => isNum(v) && v > 0;
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const has = (o: object, k: unknown) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

function parseCamera(v: unknown, elementIds: ElementId[]): CameraSettings | null {
  if (!isObj(v)) return null;
  const ok =
    has(SENSORS, v.sensorId) &&
    has(CAMERA_LENSES, v.lensId) &&
    isPos(v.focalLengthMm) &&
    isPos(v.aperture) &&
    isPos(v.shutterS) &&
    isPos(v.iso) &&
    isBool(v.autoIso) &&
    MODES.includes(v.mode as Mode) &&
    isBool(v.flashOn) &&
    isBool(v.stabilized) &&
    isPos(v.focusDistanceM) &&
    (v.afTarget === null || elementIds.includes(v.afTarget as ElementId));
  if (!ok) return null;
  const { sensorId, lensId, focalLengthMm, aperture, shutterS, iso, autoIso, mode, flashOn, stabilized, focusDistanceM, afTarget } =
    v as unknown as CameraSettings;
  return { sensorId, lensId, focalLengthMm, aperture, shutterS, iso, autoIso, mode, flashOn, stabilized, focusDistanceM, afTarget };
}

/** The elements must be exactly the default ones (same ids, same order). */
function parseScene(v: unknown, defaults: Scene): Scene | null {
  if (!isObj(v) || !LIGHT_PRESETS.some((p) => p.id === v.lightPresetId)) return null;
  const els = v.elements;
  if (!Array.isArray(els) || els.length !== defaults.elements.length) return null;
  const elements = defaults.elements.map((d, i) => {
    const e: unknown = els[i];
    return isObj(e) && e.id === d.id && isPos(e.distanceM) && isBool(e.visible)
      ? { id: d.id, distanceM: e.distanceM, visible: e.visible }
      : null;
  });
  if (elements.some((e) => e === null)) return null;
  return { lightPresetId: v.lightPresetId as string, elements: elements as Scene['elements'] };
}

function parseUi(v: unknown): AppState['ui'] | null {
  if (!isObj(v)) return null;
  const ok = isBool(v.logScale) && isBool(v.showDetails) && has(de.info, v.infoKey) && isBool(v.simple);
  if (!ok) return null;
  const { logScale, showDetails, infoKey, simple } = v as unknown as AppState['ui'];
  return { logScale, showDetails, infoKey, simple };
}

/**
 * Restore a saved state on top of `defaults`. Camera, scene and UI are validated separately;
 * an invalid section is replaced by its default. Returns null if there's nothing usable.
 */
export function parseState(json: string | null, defaults: AppState): AppState | null {
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;
  const scene = parseScene(raw.scene, defaults.scene);
  const camera = parseCamera(raw.camera, defaults.scene.elements.map((e) => e.id));
  const ui = parseUi(raw.ui);
  if (!scene && !camera && !ui) return null;
  // Camera and scene belong together (focus tracking, near limit): restore both or neither.
  const both = scene && camera;
  return {
    camera: both ? camera : defaults.camera,
    scene: both ? scene : defaults.scene,
    ui: ui ?? defaults.ui,
  };
}

export function loadState(defaults: AppState): AppState | null {
  try {
    return parseState(localStorage.getItem(KEY), defaults);
  } catch {
    return null; // storage blocked (private mode, file:// in some browsers)
  }
}

function write(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked – persistence is a convenience, ignore
  }
}

/**
 * Save on every change, debounced so dragging a slider doesn't write on each pointer move;
 * a pending save is flushed when the page is left (reload right after a change).
 */
export function persist(store: Store): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    write(store.get());
  };
  store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(flush, 300);
  });
  window.addEventListener('pagehide', () => timer !== undefined && flush());
}

// Folded/unfolded panels (<details>) live in the DOM, not the store; they're kept separately.
const FOLDS_KEY = 'fotosim.folds.v1';

function readFolds(): Record<string, boolean> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(FOLDS_KEY) ?? '{}');
    return isObj(raw) ? (Object.fromEntries(Object.entries(raw).filter(([, v]) => isBool(v))) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Restore a panel's saved open state (or `fallback`) and save every toggle the user makes.
 * `key` may change over time (e.g. per layout); `canSave` vetoes saving while the app itself
 * forces the panel open or shut.
 */
export function rememberFold(
  el: HTMLDetailsElement,
  key: () => string,
  fallback: () => boolean,
  canSave: () => boolean = () => true,
): { restore: () => void } {
  let restoring = false;
  const restore = () => {
    const open = readFolds()[key()] ?? fallback();
    if (el.open === open) return;
    restoring = true;
    el.open = open;
  };
  // 'toggle' fires asynchronously, also after programmatic changes – skip the one restore caused.
  el.addEventListener('toggle', () => {
    if (restoring) {
      restoring = false;
      return;
    }
    if (!canSave()) return;
    try {
      localStorage.setItem(FOLDS_KEY, JSON.stringify({ ...readFolds(), [key()]: el.open }));
    } catch {
      // storage blocked – ignore
    }
  });
  restore();
  return { restore };
}
