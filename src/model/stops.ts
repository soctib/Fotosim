// Selectable values ("the usual ones"). Full stops plus a few common extras.

export const APERTURES = [1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22] as const;

/** Shutter speeds in ⅓ stops with the nominal values cameras display (slow → fast). */
export const SHUTTER_SPEEDS_S = [
  30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3.2, 2.5, 2, 1.6, 1.3, 1, 0.8, 0.6, 0.5, 0.4, 0.3,
  1 / 4, 1 / 5, 1 / 6, 1 / 8, 1 / 10, 1 / 13, 1 / 15, 1 / 20, 1 / 25, 1 / 30, 1 / 40, 1 / 50,
  1 / 60, 1 / 80, 1 / 100, 1 / 125, 1 / 160, 1 / 200, 1 / 250, 1 / 320, 1 / 400, 1 / 500,
  1 / 640, 1 / 800, 1 / 1000, 1 / 1250, 1 / 1600, 1 / 2000, 1 / 2500, 1 / 3200, 1 / 4000,
] as const;

/** ISO in ⅓ stops. */
export const ISOS = [
  100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000,
  5000, 6400, 8000, 10000, 12800,
] as const;

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

/** Human-readable shutter speed: "1/250 s", "0.6 s", "2 s" (≥ 0.3 s in seconds, as cameras show it). */
export function formatShutter(s: number): string {
  if (s >= 0.3 - 1e-9) return `${Math.round(s * 10) / 10} s`;
  return `1/${Math.round(1 / s)} s`;
}

export function formatAperture(n: number): string {
  return `f/${Math.round(n * 10) / 10}`;
}
