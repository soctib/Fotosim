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

function solve(
  s: CameraSettings,
  sensor: Sensor,
  sceneEv100: number,
  auto: Set<AutoField>,
  flashOn: boolean,
): Candidate {
  const crop = cropFactor(sensor);
  const plainLimit = handheldLimitS(s.focalLengthMm, crop);
  const shakeLimit = s.stabilized ? handheldLimitWithIsS(s.focalLengthMm, crop) : plainLimit;

  const widest = maxApertureFor(s, sensor);
  const apertures = sensor.fixedAperture
    ? [sensor.fixedAperture]
    : auto.has('aperture')
      ? APERTURES.filter((n) => n >= widest)
      : [Math.max(s.aperture, widest)];
  const fastest = fastestShutterS(sensor) - 1e-12;
  let shutters = auto.has('shutterS')
    ? SHUTTER_SPEEDS_S.filter((t) => t >= fastest)
    : [Math.max(s.shutterS, fastestShutterS(sensor))];
  if (flashOn && auto.has('shutterS')) {
    shutters = shutters.filter((t) => t <= FLASH_SLOWEST_S + 1e-9 && t >= FLASH_SYNC_S - 1e-9);
  }
  const isoMax = flashOn ? AUTO_FLASH_ISO : AUTO_ISO_MAX;
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
        if (!best || cost < best.cost) best = { aperture, shutterS, iso, cost };
      }
    }
  }
  return best!;
}

/**
 * Fill in the values the current mode controls. Pure: returns a new settings object.
 * Auto mode switches the flash on when it would otherwise be ≥ 1 stop under
 * or need a tripod.
 */
export function resolveMode(
  settings: CameraSettings,
  sensor: Sensor,
  sceneEv100: number,
): ResolvedSettings {
  const auto = autoFieldsForMode(settings);
  if (sensor.fixedAperture) auto.delete('aperture');
  if (sensor.isFilm) auto.delete('iso'); // the loaded film decides, in every mode

  let flashOn = settings.flashOn;
  if (settings.mode === 'auto') {
    const noFlash = solve(settings, sensor, sceneEv100, auto, false);
    // Green-mode cameras pop the flash early: as soon as the shot would need high ISO,
    // a shutter slower than the plain handheld limit (people move!) or is still too dark.
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
    flashOn =
      off <= -1 || noFlash.shutterS > plainLimit * 1.01 || noFlash.iso >= AUTO_FLASH_ISO;
  }

  // Built-in flash cannot sync faster than the sync speed.
  const input =
    flashOn && settings.shutterS < FLASH_SYNC_S ? { ...settings, shutterS: FLASH_SYNC_S } : settings;
  const best = solve(input, sensor, sceneEv100, auto, flashOn);
  return {
    settings: {
      ...settings,
      aperture: sensor.fixedAperture ?? best.aperture, // already limited to the lens
      shutterS: best.shutterS,
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
