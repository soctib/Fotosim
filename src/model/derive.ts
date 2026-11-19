// One pure function from (settings, scene) to everything the UI renders.
// Graph, bars and simulation all read from this result, so they never disagree.

import { matchingLenses } from '../data/lensPrices';
import { lightPreset } from '../data/lightPresets';
import { PHONE_CLASSES } from '../data/phones';
import { SENSORS } from '../data/sensors';
import { applyAutofocus } from './autofocus';
import { classifyExposure, exposureOffsetStops, type ExposureClass } from './exposure';
import {
  flashFullOffsetStops,
  flashZone,
  litOffsetStops,
  ttlPowerReductionStops,
  type FlashZone,
} from './flash';
import { maxApertureFor, resolveMode } from './modes';
import { fastestShutterS } from './stops';
import { classifyNoise, equivalentIso, noiseAmount, noiseIndexStops, type NoiseClass } from './noise';
import {
  blurFractionOfWidth,
  circleOfConfusionMm,
  cropFactor,
  depthOfField,
  equivalentAperture,
  equivalentFocalLengthMm,
  frameHeightFraction,
  horizontalAngleOfViewDeg,
  hyperfocalDistanceM,
  minDistanceM,
  relativeBlur,
  type DepthOfField,
} from './optics';
import {
  classifyShake,
  handheldLimitS,
  handheldLimitWithIsS,
  shakeBlurFactor,
  type ShakeClass,
} from './shake';
import type { AutoField, CameraSettings, ElementId, Scene, Sensor } from './types';

/** Assumed height of a person for framing. */
export const PERSON_HEIGHT_M = 1.75;

export interface DerivedElement {
  id: ElementId;
  distanceM: number;
  visible: boolean;
  relativeBlur: number;
  blurFractionOfWidth: number;
  exposureOffsetStops: number;
  /** Fraction of the frame height a person at this distance fills (persons only). */
  frameHeightFraction: number;
  /** Image-height fraction per metre of object size at this distance (for laying out the simulated image). */
  heightFractionPerM: number;
}

export interface Derived {
  settings: CameraSettings;
  autoFields: Set<AutoField>;
  sensor: Sensor;
  /** Fastest shutter speed this camera type offers. */
  fastestShutterS: number;
  /** Widest aperture the current lens (or phone) allows at this focal length. */
  maxAperture: number;
  /** Near limit of the current lens: focus and elements can't get closer. */
  minDistanceM: number;
  crop: number;
  cocMm: number;
  equivalentFocalMm: number;
  equivalentAperture: number;
  angleOfViewDeg: number;
  dof: DepthOfField;
  hyperfocalM: number;
  sceneEv100: number;
  ambientOffsetStops: number;
  /** Exposure of the focused subject (ambient + flash). Drives the exposure bar. */
  exposureOffsetStops: number;
  exposureClass: ExposureClass;
  /** Flash on: its zone (null while the ambient light alone is enough) and the TTL power reduction. */
  flash: { zone: FlashZone | null; powerReductionStops: number } | null;
  shake: { limitS: number; limitIsS: number; cls: ShakeClass; blurFactor: number };
  noise: { indexStops: number; cls: NoiseClass; amount: number; equivalentIso: number };
  elements: DerivedElement[];
  /** Gear that can take this picture: lens classes (interchangeable-lens cameras) and phone classes. */
  gear: { lensIds: string[]; phoneIds: string[] };
  /** Relative blur at any distance for the current settings (for drawing the sharpness curve). */
  blurAt: (distanceM: number) => number;
  /** Blur disc as a fraction of the image width at any distance (for rendering parts of a figure). */
  blurFractionAt: (distanceM: number) => number;
}

export function derive(input: CameraSettings, scene: Scene): Derived {
  const sensor = SENSORS[input.sensorId];
  const sceneEv100 = lightPreset(scene.lightPresetId).ev100;
  const { settings, autoFields } = resolveMode(applyAutofocus(input, scene), sensor, sceneEv100);
  const { focalLengthMm: f, aperture: N, shutterS: t, iso, focusDistanceM: focus } = settings;
  const crop = cropFactor(sensor);

  const ambient = exposureOffsetStops(sceneEv100, N, t, iso);
  let flash: Derived['flash'] = null;
  let subject = ambient;
  if (settings.flashOn) {
    const gn = sensor.flashGuideNumber;
    const fullAtFocus = flashFullOffsetStops(gn, N, iso, focus);
    const reduction = ttlPowerReductionStops(ambient, fullAtFocus);
    subject = litOffsetStops(ambient, fullAtFocus, reduction);
    flash = { zone: flashZone(gn, N, iso, ambient), powerReductionStops: reduction };
  }

  const elements: DerivedElement[] = scene.elements.map((el) => {
    let exp = ambient;
    if (flash) {
      const full = flashFullOffsetStops(sensor.flashGuideNumber, N, iso, el.distanceM);
      exp = litOffsetStops(ambient, full, flash.powerReductionStops);
    }
    return {
      id: el.id,
      distanceM: el.distanceM,
      visible: el.visible,
      relativeBlur: relativeBlur(f, N, focus, el.distanceM, sensor),
      blurFractionOfWidth: blurFractionOfWidth(f, N, focus, el.distanceM, sensor),
      exposureOffsetStops: exp,
      frameHeightFraction:
        el.id === 'background' ? NaN : frameHeightFraction(f, PERSON_HEIGHT_M, el.distanceM, sensor),
      heightFractionPerM: frameHeightFraction(f, 1, el.distanceM, sensor),
    };
  });

  const noiseIdx = noiseIndexStops(iso, crop, subject);

  return {
    settings,
    autoFields,
    sensor,
    maxAperture: maxApertureFor(settings, sensor),
    minDistanceM: minDistanceM(f),
    fastestShutterS: fastestShutterS(sensor),
    crop,
    cocMm: circleOfConfusionMm(sensor),
    equivalentFocalMm: equivalentFocalLengthMm(f, sensor),
    equivalentAperture: equivalentAperture(N, sensor),
    angleOfViewDeg: horizontalAngleOfViewDeg(f, sensor),
    dof: depthOfField(f, N, focus, sensor),
    hyperfocalM: hyperfocalDistanceM(f, N, sensor),
    sceneEv100,
    ambientOffsetStops: ambient,
    exposureOffsetStops: subject,
    exposureClass: classifyExposure(subject),
    flash,
    shake: {
      limitS: handheldLimitS(f, crop),
      limitIsS: handheldLimitWithIsS(f, crop),
      cls: classifyShake(t, f, crop, settings.stabilized),
      blurFactor: shakeBlurFactor(t, f, crop, settings.stabilized),
    },
    noise: {
      indexStops: noiseIdx,
      cls: classifyNoise(noiseIdx),
      amount: noiseAmount(noiseIdx),
      equivalentIso: equivalentIso(iso, crop),
    },
    elements,
    gear: matchingGear(sensor, f, N, crop),
    blurAt: (distanceM) => relativeBlur(f, N, focus, distanceM, sensor),
    blurFractionAt: (distanceM) => blurFractionOfWidth(f, N, focus, distanceM, sensor),
  };
}

/** Phones: classes with a native lens near this framing. Cameras: lens classes for this framing (equivalent focal length) and aperture. */
function matchingGear(sensor: Sensor, focalMm: number, aperture: number, crop: number): Derived['gear'] {
  const eq = focalMm * crop;
  if (sensor.fixedAperture !== undefined) {
    // 9 %: 24 vs 26 mm main cameras count as the same framing, 70 vs 77 mm teles don't.
    const phoneIds = PHONE_CLASSES.filter(
      (p) => p.sensorId === sensor.id && p.lensesEqMm.some((l) => Math.abs(Math.log(l / eq)) < 0.09),
    ).map((p) => p.id);
    return { lensIds: [], phoneIds };
  }
  return { lensIds: matchingLenses(eq, aperture).map((l) => l.id), phoneIds: [] };
}
