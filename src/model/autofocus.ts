import type { CameraSettings, ElementId, Scene } from './types';

/**
 * Continuous autofocus: while a target is set and visible, focus sits exactly on it.
 * Runs before mode resolution, since auto modes and the flash depend on the focus distance.
 */
export function applyAutofocus(settings: CameraSettings, scene: Scene): CameraSettings {
  if (!settings.afTarget) return settings;
  const el = scene.elements.find((e) => e.id === settings.afTarget && e.visible);
  return el ? { ...settings, focusDistanceM: el.distanceM } : settings;
}

/**
 * The element the photo is "of": the tracked target if visible, else the visible element whose
 * distance is closest to the focus (on a log scale, like depth of field). Null if nothing is visible.
 */
export function focusedElement<E extends { id: ElementId; distanceM: number; visible: boolean }>(
  elements: E[],
  focusDistanceM: number,
  afTarget: ElementId | null,
): E | null {
  const visible = elements.filter((e) => e.visible);
  const tracked = visible.find((e) => e.id === afTarget);
  if (tracked) return tracked;
  let best: E | null = null;
  for (const e of visible) {
    if (!best || Math.abs(Math.log(e.distanceM / focusDistanceM)) < Math.abs(Math.log(best.distanceM / focusDistanceM))) best = e;
  }
  return best;
}
