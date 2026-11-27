// Film: the loaded film has a fixed speed; the camera's meter goes by its ISO (ASA) dial, which
// the photographer sets to match – unless the camera reads the DX code on the cartridge.

import type { CameraSettings, Sensor } from './types';

/** Film speeds to choose from (common emulsions: Ektar 100, Portra 160/400/800, HP5, Delta 3200). */
export const FILM_ISOS = [100, 160, 200, 400, 800, 1600, 3200] as const;

/** Nearest film speed (log scale) – for loading a film after a digital camera's ISO. */
export function nearestFilmIso(iso: number): number {
  return FILM_ISOS.reduce((best, f) => (Math.abs(Math.log(f / iso)) < Math.abs(Math.log(best / iso)) ? f : best), FILM_ISOS[0]);
}

/** The ISO the camera's meter and automatic modes go by. */
export function meterIso(s: Pick<CameraSettings, 'iso' | 'filmDialIso'>, sensor: Pick<Sensor, 'isFilm' | 'dxCoding'>): number {
  return sensor.isFilm && !sensor.dxCoding ? s.filmDialIso : s.iso;
}

/**
 * How far the film is over- (+) or underexposed (−) because the dial doesn't match it, in stops:
 * a dial set to a slower speed than the film makes the meter give more light than the film needs.
 */
export function filmMismatchStops(s: Pick<CameraSettings, 'iso' | 'filmDialIso'>, sensor: Pick<Sensor, 'isFilm' | 'dxCoding'>): number {
  return Math.log2(s.iso / meterIso(s, sensor));
}
