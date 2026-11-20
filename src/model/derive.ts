// One pure function from (settings, scene) to everything the UI renders.
// Graph, bars and simulation all read from this result, so they never disagree.

import { lightPreset } from '../data/lightPresets';
import { SENSORS } from '../data/sensors';
import { applyAutofocus, focusedElement } from './autofocus';
import { costs, type Costs } from './costs';
import { activeSensor } from './focal';
import { classifyExposure, exposureOffsetStops, type ExposureClass } from './exposure';
import {
  flashFullOffsetStops,
  flashZone,
  litOffsetStops,
  ttlPowerReductionStops,
  type FlashZone,
} from './flash';
import { autoIsoMax, maxApertureFor, resolveMode } from './modes';
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
  classifyMovement,
  movementBlurFractionOfWidth,
  relativeMovementBlur,
  relativeSpeedMs,
  type MovementClass,
} from './motion';
import {
  classifyShake,
  handheldLimitS,
  handheldLimitWithIsS,
  motionHandheldLimitS,
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
  /** Speed across the frame relative to the photographer (m/s). */
  relativeSpeedMs: number;
  /** Sideways smear from movement, relative to the circle of confusion (≤ 1 = sharp). */
  movementBlur: number;
  /** The same smear as a fraction of the image width (for rendering). */
  movementBlurFractionOfWidth: number;
}

export interface Derived {
  settings: CameraSettings;
  autoFields: Set<AutoField>;
  /** Sensor in use (phones: the built-in camera chosen by the focal length). */
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
  /** Auto ISO is at its upper limit and the subject is still too dark: that limit, else null. */
  autoIsoCapped: number | null;
  /** Flash on: its zone (null while the ambient light alone is enough) and the TTL power reduction. */
  flash: { zone: FlashZone | null; powerReductionStops: number } | null;
  /** Handheld limits for the photographer's movement (Infinity on a tripod). */
  shake: { limitS: number; limitIsS: number; cls: ShakeClass; blurFactor: number };
  /** Visible persons smeared visibly by movement (movementBlur > 1), nearest first. */
  movementBlurred: ElementId[];
  /** The element in focus (tracked, or nearest to the focus distance) and its movement smear; null if nothing is visible. */
  subject: { id: ElementId; relativeSpeedMs: number; movementBlur: number; movementCls: MovementClass } | null;
  noise: { indexStops: number; cls: NoiseClass; amount: number; equivalentIso: number };
  elements: DerivedElement[];
  /** Rough price of the gear in use: camera or phone, lens, tripod. */
  costs: Costs;
  /** Relative blur at any distance for the current settings (for drawing the sharpness curve). */
  blurAt: (distanceM: number) => number;
  /** Blur disc as a fraction of the image width at any distance (for rendering parts of a figure). */
  blurFractionAt: (distanceM: number) => number;
}

export function derive(rawInput: CameraSettings, rawScene: Scene): Derived {
  // The lens won't focus closer than its near limit, and the image of anything closer is taken
  // as if at that limit. Applied here rather than stored, so zooming back out restores the scene.
  const near = (m: number) => Math.max(minDistanceM(rawInput.focalLengthMm), m);
  const input = { ...rawInput, focusDistanceM: near(rawInput.focusDistanceM) };
  const scene = { ...rawScene, elements: rawScene.elements.map((el) => ({ ...el, distanceM: near(el.distanceM) })) };
  const sensor = activeSensor(SENSORS[input.sensorId], input.focalLengthMm);
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
    const speed = relativeSpeedMs(el.motion, settings.motion);
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
      relativeSpeedMs: speed,
      movementBlur: relativeMovementBlur(speed, t, f, el.distanceM, sensor),
      movementBlurFractionOfWidth: movementBlurFractionOfWidth(speed, t, f, el.distanceM, sensor),
    };
  });

  const focused = focusedElement(elements, focus, settings.afTarget);
  const subjectInfo: Derived['subject'] = focused && {
    id: focused.id,
    relativeSpeedMs: focused.relativeSpeedMs,
    movementBlur: focused.movementBlur,
    movementCls: classifyMovement(focused.movementBlur),
  };

  const multiFrame = sensor.multiFrameStops ?? 0;
  const noiseIdx = noiseIndexStops(iso, crop, subject, multiFrame);

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
    autoIsoCapped:
      autoFields.has('iso') && iso >= autoIsoMax(settings.flashOn) && classifyExposure(subject).endsWith('Under')
        ? autoIsoMax(settings.flashOn)
        : null,
    flash,
    shake: {
      limitS: motionHandheldLimitS(handheldLimitS(f, crop), settings.motion),
      limitIsS: motionHandheldLimitS(handheldLimitWithIsS(f, crop), settings.motion),
      cls: classifyShake(t, f, crop, settings.stabilized, settings.motion),
      blurFactor: shakeBlurFactor(t, f, crop, settings.stabilized, settings.motion),
    },
    movementBlurred: elements
      .filter((e) => e.id !== 'background' && e.visible && e.movementBlur > 1)
      .sort((a, b) => a.distanceM - b.distanceM)
      .map((e) => e.id),
    subject: subjectInfo,
    noise: {
      indexStops: noiseIdx,
      cls: classifyNoise(noiseIdx),
      amount: noiseAmount(noiseIdx),
      equivalentIso: equivalentIso(iso, crop, multiFrame),
    },
    elements,
    costs: costs(input.sensorId, settings.lensId, f * crop, settings.motion, sensor.fixedAperture !== undefined),
    blurAt: (distanceM) => relativeBlur(f, N, focus, distanceM, sensor),
    blurFractionAt: (distanceM) => blurFractionOfWidth(f, N, focus, distanceM, sensor),
  };
}
