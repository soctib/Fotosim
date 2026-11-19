import type { CameraSettings, Scene } from './types';

/**
 * Continuous autofocus: while a target is set and visible, focus sits exactly on it.
 * Runs before mode resolution, since auto modes and the flash depend on the focus distance.
 */
export function applyAutofocus(settings: CameraSettings, scene: Scene): CameraSettings {
  if (!settings.afTarget) return settings;
  const el = scene.elements.find((e) => e.id === settings.afTarget && e.visible);
  return el ? { ...settings, focusDistanceM: el.distanceM } : settings;
}
