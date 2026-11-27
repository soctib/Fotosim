import { highlightLimitStops, type Highlights } from './dynamicRange';
import { exposureOffsetStops } from './exposure';
import { CAMERA_LENSES } from '../data/cameraLenses';
import { lensMaxAperture } from './lens';
import { flashFullOffsetStops, litOffsetStops, ttlPowerReductionStops } from './flash';
import { cropFactor } from './optics';
import { handheldLimitS, handheldLimitWithIsS } from './shake';
import {
  APERTURES,
  AUTO_ISO_MAX,
  FLASH_SLOWEST_S,
  FLASH_SYNC_S,
  ISOS,
  SHUTTER_SPEEDS_S,
  fastestShutterS,
} from './stops';
import type { AutoField, CameraSettings, Sensor } from './types';

/** Auto mode fires the flash once it would need this ISO or more. */
export const AUTO_FLASH_ISO = 1600;

/**
 * With flash, each stop the background would sit in its fade to white costs this much (the
 * subject's error costs 10 per stop): the camera darkens the ambient light for the sky as long
 * as the flash keeps the subject lit, but not at the subject's expense.
 */
const HIGHLIGHT_COST = 6;

/** Highest ISO auto ISO picks: lower with flash, where the flash should do the work. */
export function autoIsoMax(flashOn: boolean): number {
  return flashOn ? AUTO_FLASH_ISO : AUTO_ISO_MAX;
}

export interface ResolvedSettings {
  settings: CameraSettings;
  /** Fields the camera set itself (greyed out in the UI). */
  autoFields: Set<AutoField>;
}

/** Which fields a mode controls automatically (before phone/flash specifics). */
export function autoFieldsForMode(settings: CameraSettings): Set<AutoField> {
  const f = new Set<AutoField>();
  switch (settings.mode) {
    case 'auto':
      f.add('aperture').add('shutterS').add('iso').add('flashOn');
      break;
    case 'P':
      f.add('aperture').add('shutterS');
      break;
    case 'Av':
      f.add('shutterS');
      break;
    case 'Tv':
      f.add('aperture');
      break;
    case 'M':
      break;
  }
  if (settings.mode !== 'auto' && settings.mode !== 'M' && settings.autoIso) f.add('iso');
  return f;
}

/** Exposure of the focused subject, including TTL flash if on. */
export function subjectOffsetStops(
  sceneEv100: number,
  sensor: Sensor,
  aperture: number,
  shutterS: number,
  iso: number,
  flashOn: boolean,
  focusM: number,
): number {
  const ambient = exposureOffsetStops(sceneEv100, aperture, shutterS, iso);
  if (!flashOn) return ambient;
  const full = flashFullOffsetStops(sensor.flashGuideNumber, aperture, iso, focusM);
  return litOffsetStops(ambient, full, ttlPowerReductionStops(ambient, full));
}

interface Candidate {
  aperture: number;
  shutterS: number;
  iso: number;
  cost: number;
}

/** Apertures and shutter speeds the camera may choose from (or the user's, where they're not automatic). */
function candidates(s: CameraSettings, sensor: Sensor, auto: Set<AutoField>, flashOn: boolean) {
  const widest = maxApertureFor(s, sensor);
  const apertures: number[] = sensor.fixedAperture
    ? [sensor.fixedAperture]
    : auto.has('aperture')
      ? APERTURES.filter((n) => n >= widest)
      : [Math.max(s.aperture, widest)];
  const fastest = fastestShutterS(sensor) - 1e-12;
  let shutters: number[] = auto.has('shutterS')
    ? SHUTTER_SPEEDS_S.filter((t) => t >= fastest)
    : [Math.max(s.shutterS, fastestShutterS(sensor))];
  // A real flash tube needs the shutter between the sync speed and the slowest flash time;
  // a phone's LED is continuous light and doesn't care.
  if (flashOn && auto.has('shutterS') && !sensor.ledFlash) {
    shutters = shutters.filter((t) => t <= FLASH_SLOWEST_S + 1e-9 && t >= FLASH_SYNC_S - 1e-9);
  }
  return { apertures, shutters };
}

/**
 * Program shift (P, the rear dial): each click trades ⅓ stop of aperture for ⅓ stop of time, so the
 * exposure stays the same – + = smaller aperture and longer time. Stops where either list ends.
 * `apertures` wide → narrow, `shutters` slow → fast, as in stops.ts.
 */
export function applyProgramShift(
  aperture: number,
  shutterS: number,
  clicks: number,
  apertures: readonly number[],
  shutters: readonly number[],
): { aperture: number; shutterS: number } {
  const ai = apertures.indexOf(aperture);
  const si = shutters.indexOf(shutterS);
  if (ai < 0 || si < 0 || clicks === 0) return { aperture, shutterS };
  const lo = Math.max(-ai, si - (shutters.length - 1));
  const hi = Math.min(apertures.length - 1 - ai, si);
  const k = Math.min(hi, Math.max(lo, clicks));
  return { aperture: apertures[ai + k], shutterS: shutters[si - k] };
}

function solve(
  s: CameraSettings,
  sensor: Sensor,
  sceneEv100: number,
  auto: Set<AutoField>,
  flashOn: boolean,
  highlights: Highlights | null,
): Candidate {
  const crop = cropFactor(sensor);
  const plainLimit = handheldLimitS(s.focalLengthMm, crop);
  const shakeLimit = s.stabilized ? handheldLimitWithIsS(s.focalLengthMm, crop) : plainLimit;

  const { apertures, shutters } = candidates(s, sensor, auto, flashOn);
  const isoMax = autoIsoMax(flashOn);
  const isos = auto.has('iso') ? ISOS.filter((i) => i <= isoMax) : [s.iso];

  let best: Candidate | null = null;
  for (const aperture of apertures) {
    for (const shutterS of shutters) {
      for (const iso of isos) {
        const off = subjectOffsetStops(
          sceneEv100,
          sensor,
          aperture,
          shutterS,
          iso,
          flashOn,
          s.focusDistanceM,
        );
        let cost = 10 * Math.abs(off);
        if (auto.has('shutterS')) {
          // Hard-ish limit: camera shake. Soft limit: subject motion (IS doesn't help there).
          if (shutterS > shakeLimit) cost += 4 * Math.log2(shutterS / shakeLimit);
          if (shutterS > plainLimit) cost += 1.5 * Math.log2(shutterS / plainLimit);
        }
        if (auto.has('aperture') && apertures.length > 1) {
          cost += 0.3 * Math.abs(Math.log2(aperture / 5.6)); // program prefers mid apertures
        }
        if (auto.has('iso')) cost += 1 * Math.log2(iso / 100);
        if (flashOn && auto.has('iso')) {
          // Keep some ambient light so the background doesn't go black.
          const ambient = exposureOffsetStops(sceneEv100, aperture, shutterS, iso);
          cost += 1.2 * Math.max(0, -ambient - 1);
        }
        if (flashOn && highlights) {
          // Balanced fill flash: expose the ambient light for the bright background.
          const ambient = exposureOffsetStops(sceneEv100, aperture, shutterS, iso);
          cost += HIGHLIGHT_COST * Math.max(0, ambient - highlightLimitStops(highlights));
        }
        if (!best || cost < best.cost) best = { aperture, shutterS, iso, cost };
      }
    }
  }
  return best!;
}

/**
 * Fill in the values the current mode controls. Pure: returns a new settings object.
 * Auto mode switches the flash on when it would otherwise be ≥ 1 stop under, need a tripod, or
 * blow out the background (backlight). Without flash the modes expose for the subject, whatever
 * the background does; with flash they also keep the background below its clip if they can
 * (`highlights`, null = ignore the background).
 */
export function resolveMode(
  settings: CameraSettings,
  sensor: Sensor,
  sceneEv100: number,
  highlights: Highlights | null = null,
): ResolvedSettings {
  const auto = autoFieldsForMode(settings);
  if (sensor.fixedAperture) auto.delete('aperture');
  if (sensor.isFilm) auto.delete('iso'); // the loaded film decides, in every mode

  let flashOn = settings.flashOn;
  if (settings.mode === 'auto') {
    const noFlash = solve(settings, sensor, sceneEv100, auto, false, highlights);
    // Green-mode cameras pop the flash early: as soon as the shot would need high ISO,
    // a shutter slower than the plain handheld limit (people move!) or is still too dark.
    // The ISO criterion only makes sense when the camera chose the ISO itself – a fast film
    // in bright sun is no reason to flash.
    const plainLimit = handheldLimitS(settings.focalLengthMm, cropFactor(sensor));
    const off = subjectOffsetStops(
      sceneEv100,
      sensor,
      noFlash.aperture,
      noFlash.shutterS,
      noFlash.iso,
      false,
      settings.focusDistanceM,
    );
    // Backlight: exposed for the subject, the background clips – the camera fills in with flash.
    const ambient = exposureOffsetStops(sceneEv100, noFlash.aperture, noFlash.shutterS, noFlash.iso);
    const blownBackground = highlights !== null && ambient + highlights.brightestStops >= highlights.clipStops;
    flashOn =
      off <= -1 ||
      noFlash.shutterS > plainLimit * 1.01 ||
      (auto.has('iso') && noFlash.iso >= AUTO_FLASH_ISO) ||
      blownBackground;
  }

  // Built-in flash cannot sync faster than the sync speed (an LED can).
  const input =
    flashOn && !sensor.ledFlash && settings.shutterS < FLASH_SYNC_S
      ? { ...settings, shutterS: FLASH_SYNC_S }
      : settings;
  const best = solve(input, sensor, sceneEv100, auto, flashOn, highlights);
  let { aperture, shutterS } = best;
  if (settings.mode === 'P' && settings.programShift && auto.has('aperture') && auto.has('shutterS')) {
    const c = candidates(input, sensor, auto, flashOn);
    ({ aperture, shutterS } = applyProgramShift(aperture, shutterS, settings.programShift, c.apertures, c.shutters));
  }
  return {
    settings: {
      ...settings,
      aperture: sensor.fixedAperture ?? aperture, // already limited to the lens
      shutterS,
      iso: best.iso,
      flashOn,
    },
    autoFields: auto,
  };
}

/** Widest aperture available: the phone's fixed one, or the lens limit at the current focal length. */
export function maxApertureFor(settings: CameraSettings, sensor: Sensor): number {
  if (sensor.fixedAperture) return sensor.fixedAperture;
  return lensMaxAperture(CAMERA_LENSES[settings.lensId], settings.focalLengthMm * cropFactor(sensor));
}
