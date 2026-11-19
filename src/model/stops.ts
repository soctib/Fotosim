// Selectable values ("the usual ones"). Full stops plus a few common extras.

export const APERTURES = [1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22] as const;

export const SHUTTER_SPEEDS_S = [
  30, 15, 8, 4, 2, 1, 1 / 2, 1 / 4, 1 / 8, 1 / 15, 1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500,
  1 / 1000, 1 / 2000, 1 / 4000,
] as const;

export const ISOS = [100, 200, 400, 800, 1600, 3200, 6400, 12800] as const;

/** Upper ISO limit the camera uses on its own (auto ISO). */
export const AUTO_ISO_MAX = 3200;

/** Slowest shutter speed usable with a built-in flash (sync speed is the fastest). */
export const FLASH_SLOWEST_S = 1 / 60;
export const FLASH_SYNC_S = 1 / 250;

export function nearest<T extends number>(values: readonly T[], target: number): T {
  let best = values[0];
  let bestDist = Infinity;
  for (const v of values) {
    const d = Math.abs(Math.log2(v) - Math.log2(target));
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

/** Human-readable shutter speed, e.g. "1/250 s" or "2 s". */
export function formatShutter(s: number): string {
  if (s >= 1) return `${Math.round(s * 10) / 10} s`;
  return `1/${Math.round(1 / s)} s`;
}

export function formatAperture(n: number): string {
  return `f/${Math.round(n * 10) / 10}`;
}
