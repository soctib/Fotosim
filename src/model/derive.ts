// One pure function from (settings, scene) to everything the UI renders.
// Graph, bars and simulation all read from this result, so they never disagree.

import { lightPreset } from '../data/lightPresets';
import { SENSORS } from '../data/sensors';
import { classifyExposure, exposureOffsetStops, type ExposureClass } from './exposure';
import {
  flashFullOffsetStops,
  flashZone,
  litOffsetStops,
  ttlPowerReductionStops,
  type FlashZone,
} from './flash';
import { resolveMode } from './modes';
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
}

export interface Derived {
  settings: CameraSettings;
  autoFields: Set<AutoField>;
  sensor: Sensor;
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
  flash: { zone: FlashZone; powerReductionStops: number } | null;
  shake: { limitS: number; limitIsS: number; cls: ShakeClass; blurFactor: number };
  noise: { indexStops: number; cls: NoiseClass; amount: number; equivalentIso: number };
  elements: DerivedElement[];
}

export function derive(input: CameraSettings, scene: Scene): Derived {
  const sensor = SENSORS[input.sensorId];
  const sceneEv100 = lightPreset(scene.lightPresetId).ev100;
  const { settings, autoFields } = resolveMode(input, sensor, sceneEv100);
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
    flash = { zone: flashZone(gn, N, iso), powerReductionStops: reduction };
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
    };
  });

  const noiseIdx = noiseIndexStops(iso, crop, subject);

  return {
    settings,
    autoFields,
    sensor,
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
  };
}
